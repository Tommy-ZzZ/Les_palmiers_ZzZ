// backend/src/websocket/server.ts
import { WebSocketServer, WebSocket } from 'ws';
import { Server as HTTPServer } from 'http';
import { verify } from 'jsonwebtoken';
import { Reservation, Room, Client } from '../models';

interface WebSocketClient extends WebSocket {
  userId?: number;
  role?: string;
  isAlive?: boolean;
  subscriptions?: string[];
}

export class WebSocketManager {
  private wss: WebSocketServer;
  private clients: Map<string, WebSocketClient> = new Map();
  private static instance: WebSocketManager;

  private constructor(server: HTTPServer) {
    this.wss = new WebSocketServer({ 
      server, 
      path: '/ws',
      // ✅ PERMETTRE LES CONNEXIONS SANS TOKEN POUR LE TEST
      handleProtocols: () => 'json'
    });
    this.setupWebSocket();
    this.startHeartbeat();
    console.log('🔌 WebSocket Server initialisé sur /ws');
  }

  public static getInstance(server?: HTTPServer): WebSocketManager {
    if (!WebSocketManager.instance && server) {
      WebSocketManager.instance = new WebSocketManager(server);
    }
    return WebSocketManager.instance;
  }

  private setupWebSocket(): void {
    this.wss.on('connection', (ws: WebSocketClient, req) => {
      console.log('🔌 Nouvelle connexion WebSocket');

      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const token = url.searchParams.get('token');

      // ✅ SI PAS DE TOKEN, CONNEXION ANONYME (mais limitée)
      if (!token) {
        console.warn('⚠️ Connexion WebSocket sans token - mode limité');
        ws.isAlive = true;
        ws.subscriptions = [];
        
        // ✅ Accepter la connexion sans token
        this.sendToClient(ws, {
          type: 'CONNECTION_ESTABLISHED',
          data: { userId: null, role: 'guest', limited: true },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // ✅ AUTHENTIFICATION AVEC TOKEN
      try {
        const decoded = verify(token, process.env.JWT_SECRET || 'secret') as any;
        ws.userId = decoded.id;
        ws.role = decoded.role;
        ws.isAlive = true;
        ws.subscriptions = [];
        
        this.clients.set(String(ws.userId), ws);
        console.log(`✅ Utilisateur ${ws.userId} (${ws.role}) connecté`);
        
        this.sendToClient(ws, {
          type: 'CONNECTION_ESTABLISHED',
          data: { userId: ws.userId, role: ws.role },
          timestamp: new Date().toISOString()
        });

        this.broadcast({
          type: 'USER_STATUS',
          data: { userId: ws.userId, status: 'online' },
          timestamp: new Date().toISOString()
        }, [String(ws.userId)]);

      } catch (error) {
        console.error('❌ Erreur d\'authentification WebSocket:', error);
        // ✅ AU LIEU DE FERMER, ON ACCEPTE EN MODE LIMITÉ
        ws.isAlive = true;
        ws.subscriptions = [];
        this.sendToClient(ws, {
          type: 'CONNECTION_ESTABLISHED',
          data: { userId: null, role: 'guest', limited: true, authError: true },
          timestamp: new Date().toISOString()
        });
      }
    });

    this.wss.on('error', (error) => {
      console.error('❌ Erreur WebSocket Server:', error);
    });
  }

  private handleMessage(ws: WebSocketClient, message: any): void {
    console.log(`📨 Message reçu: ${message.type}`);
    
    switch (message.type) {
      case 'PING':
        this.sendToClient(ws, { type: 'PONG', timestamp: new Date().toISOString() });
        break;

      case 'SUBSCRIBE':
        if (message.channel) {
          if (!ws.subscriptions) ws.subscriptions = [];
          if (!ws.subscriptions.includes(message.channel)) {
            ws.subscriptions.push(message.channel);
            this.sendToClient(ws, {
              type: 'SUBSCRIBED',
              data: { channel: message.channel },
              timestamp: new Date().toISOString()
            });
            console.log(`📡 Abonnement au canal: ${message.channel}`);
          }
        }
        break;

      case 'UNSUBSCRIBE':
        if (message.channel && ws.subscriptions) {
          ws.subscriptions = ws.subscriptions.filter((c: string) => c !== message.channel);
          this.sendToClient(ws, {
            type: 'UNSUBSCRIBED',
            data: { channel: message.channel },
            timestamp: new Date().toISOString()
          });
        }
        break;

      // ✅ AJOUT : FORCER LE REFRESH DES CHAMBRES
      case 'REFRESH_CHAMBRES':
        console.log('🔄 Refresh chambres demandé via WebSocket');
        this.broadcastToAll({
          type: 'REFRESH_CHAMBRES',
          data: { reason: 'manual_refresh', timestamp: new Date().toISOString() },
          timestamp: new Date().toISOString()
        });
        break;

      case 'REFRESH_DASHBOARD':
        console.log('🔄 Refresh dashboard demandé via WebSocket');
        this.broadcastToAll({
          type: 'REFRESH_DASHBOARD',
          data: { reason: 'manual_refresh', timestamp: new Date().toISOString() },
          timestamp: new Date().toISOString()
        });
        break;

      default:
        console.log(`📨 Message non traité: ${message.type}`);
    }
  }

  private startHeartbeat(): void {
    const interval = setInterval(() => {
      this.wss.clients.forEach((ws: WebSocketClient) => {
        if (ws.isAlive === false) {
          console.log('💀 Client inactif, déconnexion');
          ws.terminate();
          if (ws.userId) {
            this.clients.delete(String(ws.userId));
          }
          return;
        }
        ws.isAlive = false;
        try {
          ws.ping();
        } catch (e) {
          console.log('⚠️ Erreur ping, déconnexion');
          ws.terminate();
        }
      });
    }, 30000);

    this.wss.on('close', () => clearInterval(interval));
  }

  private sendToClient(ws: WebSocketClient, message: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (e) {
        console.error('❌ Erreur envoi message:', e);
      }
    }
  }

  public broadcast(message: any, excludeUserIds: string[] = []): void {
    this.wss.clients.forEach((ws: WebSocketClient) => {
      if (ws.readyState === WebSocket.OPEN && ws.userId) {
        if (!excludeUserIds.includes(String(ws.userId))) {
          this.sendToClient(ws, message);
        }
      }
    });
  }

  public broadcastToAll(message: any): void {
    this.wss.clients.forEach((ws: WebSocketClient) => {
      if (ws.readyState === WebSocket.OPEN) {
        this.sendToClient(ws, message);
      }
    });
  }

  public broadcastToChannel(channel: string, message: any): void {
    this.wss.clients.forEach((ws: WebSocketClient) => {
      if (ws.readyState === WebSocket.OPEN && ws.subscriptions?.includes(channel)) {
        this.sendToClient(ws, message);
      }
    });
  }

  public sendToUser(userId: number, message: any): void {
    const ws = this.clients.get(String(userId));
    if (ws && ws.readyState === WebSocket.OPEN) {
      this.sendToClient(ws, message);
    }
  }

  public getConnectedClients(): number {
    return this.clients.size;
  }

  public getConnectedUsers(): Array<{ id: number; role: string }> {
    const users: Array<{ id: number; role: string }> = [];
    this.clients.forEach((ws) => {
      if (ws.userId) {
        users.push({ id: ws.userId, role: ws.role || 'unknown' });
      }
    });
    return users;
  }

  // ============================================
  // MÉTHODES D'ÉMISSION DES ÉVÉNEMENTS MÉTIER
  // ============================================

  public emitReservationCreated(reservation: any): void {
    this.broadcastToAll({
      type: 'RESERVATION_CREATED',
      data: {
        reservationId: reservation.id,
        chambreId: reservation.chambreId,
        dateArrivee: reservation.dateArrivee,
        dateDepart: reservation.dateDepart,
        statut: reservation.statut,
        clientNom: reservation.client?.nom || '',
        clientPrenom: reservation.client?.prenom || '',
        numero: reservation.numero
      },
      timestamp: new Date().toISOString()
    });

    this.broadcastToChannel(`chambre-${reservation.chambreId}`, {
      type: 'CHAMBRE_UPDATED',
      data: {
        chambreId: reservation.chambreId,
        action: 'reservation_created',
        reservationId: reservation.id,
        dateArrivee: reservation.dateArrivee,
        dateDepart: reservation.dateDepart
      },
      timestamp: new Date().toISOString()
    });

    this.broadcastToAll({
      type: 'REFRESH_CHAMBRES',
      data: { reason: 'new_reservation', timestamp: new Date().toISOString() },
      timestamp: new Date().toISOString()
    });
  }

  public emitReservationUpdated(reservation: any, oldChambreId?: number): void {
    this.broadcastToAll({
      type: 'RESERVATION_UPDATED',
      data: {
        reservationId: reservation.id,
        chambreId: reservation.chambreId,
        oldChambreId,
        statut: reservation.statut,
        dateArrivee: reservation.dateArrivee,
        dateDepart: reservation.dateDepart
      },
      timestamp: new Date().toISOString()
    });

    const chambresAUpdate = [oldChambreId, reservation.chambreId].filter(Boolean);
    chambresAUpdate.forEach(cId => {
      if (cId) {
        this.broadcastToChannel(`chambre-${cId}`, {
          type: 'CHAMBRE_UPDATED',
          data: { chambreId: cId, action: 'reservation_updated' },
          timestamp: new Date().toISOString()
        });
      }
    });

    this.broadcastToAll({
      type: 'REFRESH_CHAMBRES',
      data: { reason: 'reservation_updated', timestamp: new Date().toISOString() },
      timestamp: new Date().toISOString()
    });
  }

  public emitReservationCancelled(reservation: any): void {
    this.broadcastToAll({
      type: 'RESERVATION_CANCELLED',
      data: {
        reservationId: reservation.id,
        chambreId: reservation.chambreId,
        motif: reservation.motifAnnulation,
        penalite: reservation.montantPenalite
      },
      timestamp: new Date().toISOString()
    });

    this.broadcastToChannel(`chambre-${reservation.chambreId}`, {
      type: 'CHAMBRE_UPDATED',
      data: { 
        chambreId: reservation.chambreId, 
        action: 'reservation_cancelled',
        reservationId: reservation.id
      },
      timestamp: new Date().toISOString()
    });

    this.broadcastToAll({
      type: 'REFRESH_CHAMBRES',
      data: { reason: 'reservation_cancelled', timestamp: new Date().toISOString() },
      timestamp: new Date().toISOString()
    });
  }

  public emitReservationDeleted(reservation: any): void {
    this.broadcastToAll({
      type: 'RESERVATION_DELETED',
      data: {
        reservationId: reservation.id,
        chambreId: reservation.chambreId,
        numero: reservation.numero
      },
      timestamp: new Date().toISOString()
    });

    this.broadcastToChannel(`chambre-${reservation.chambreId}`, {
      type: 'CHAMBRE_UPDATED',
      data: { 
        chambreId: reservation.chambreId, 
        action: 'reservation_deleted',
        reservationId: reservation.id
      },
      timestamp: new Date().toISOString()
    });

    this.broadcastToAll({
      type: 'REFRESH_CHAMBRES',
      data: { reason: 'reservation_deleted', timestamp: new Date().toISOString() },
      timestamp: new Date().toISOString()
    });
  }

  public emitChambreStatusChanged(chambreId: number, oldStatut: string, newStatut: string): void {
    this.broadcastToAll({
      type: 'CHAMBRE_STATUS_CHANGED',
      data: {
        chambreId,
        oldStatut,
        newStatut,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

    this.broadcastToChannel(`chambre-${chambreId}`, {
      type: 'CHAMBRE_UPDATED',
      data: {
        chambreId,
        action: 'status_changed',
        oldStatut,
        newStatut
      },
      timestamp: new Date().toISOString()
    });

    this.broadcastToAll({
      type: 'REFRESH_CHAMBRES',
      data: { reason: 'status_changed', timestamp: new Date().toISOString() },
      timestamp: new Date().toISOString()
    });
  }

  public emitPaymentRecorded(reservationId: number, chambreId: number, payment: any): void {
    this.broadcastToAll({
      type: 'PAYMENT_RECORDED',
      data: {
        reservationId,
        chambreId,
        paymentId: payment.id,
        montant: payment.montant,
        mode: payment.mode,
        typeVersement: payment.typeVersement
      },
      timestamp: new Date().toISOString()
    });

    this.broadcastToAll({
      type: 'REFRESH_CHAMBRES',
      data: { reason: 'payment_recorded', timestamp: new Date().toISOString() },
      timestamp: new Date().toISOString()
    });
  }
}

// Types pour WebSocketClient
declare module 'ws' {
  interface WebSocket {
    userId?: number;
    role?: string;
    isAlive?: boolean;
    subscriptions?: string[];
  }
}