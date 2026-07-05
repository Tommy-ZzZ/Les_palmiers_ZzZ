// frontend/src/context/WebSocketContext.tsx
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import useWebSocketLib from 'react-use-websocket';
import { useAuth } from './AuthContext';

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

interface WebSocketContextType {
  sendMessage: (message: any) => void;
  lastMessage: WebSocketMessage | null;
  isConnected: boolean;
  connectionError: string | null;
  subscribeToChannel: (channel: string) => void;
  unsubscribeFromChannel: (channel: string) => void;
  refreshChambres: () => void;
  refreshDashboard: () => void;
  connectedUsers: Array<{ id: number; role: string }>;
  subscribe: (channel: string) => void;
  unsubscribe: (channel: string) => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
};

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const { user, token } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [subscribedChannels, setSubscribedChannels] = useState<Set<string>>(new Set());
  const [connectedUsers, setConnectedUsers] = useState<Array<{ id: number; role: string }>>([]);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 10; // ✅ AUGMENTÉ

  const wsUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = import.meta.env.VITE_WS_URL || window.location.host;
    // ✅ AJOUT DU TOKEN DANS L'URL
    const tokenParam = token ? `?token=${token}` : '';
    return `${protocol}//${host}/ws${tokenParam}`;
  }, [token]);

  const { sendMessage, lastJsonMessage, readyState } = useWebSocketLib(
    token ? wsUrl() : null, // ✅ SEULEMENT SI TOKEN EXISTE
    {
      shouldReconnect: (closeEvent) => {
        console.log(`🔄 Tentative de reconnexion ${reconnectAttempts.current + 1}/${maxReconnectAttempts}`, closeEvent.code);
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          return true;
        }
        console.log('❌ Nombre maximal de tentatives de reconnexion atteint');
        return false;
      },
      reconnectInterval: 3000,
      onOpen: () => {
        console.log('🔌 WebSocket connecté');
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttempts.current = 0;

        if (subscribedChannels.size > 0) {
          subscribedChannels.forEach(channel => {
            sendMessage({ type: 'SUBSCRIBE', channel });
          });
        }
      },
      onClose: (event) => {
        console.log(`🔌 WebSocket déconnecté (code: ${event.code})`);
        setIsConnected(false);
        if (event.wasClean) {
          console.log('Déconnexion propre');
        } else {
          setConnectionError(`Déconnexion inattendue (code: ${event.code})`);
        }
      },
      onError: (error) => {
        console.error('❌ Erreur WebSocket:', error);
        setConnectionError('Erreur de connexion au serveur WebSocket');
        setIsConnected(false);
      }
    },
    !!token // ✅ N'ACTIVER QUE SI TOKEN EXISTE
  );

  useEffect(() => {
    if (lastJsonMessage) {
      try {
        const message = lastJsonMessage as WebSocketMessage;
        setLastMessage(message);

        console.log(`📨 Message WebSocket reçu: ${message.type}`, message.data);

        switch (message.type) {
          case 'REFRESH_CHAMBRES':
          case 'REFRESH_DASHBOARD':
            console.log(`🔄 Rafraîchissement demandé: ${message.type}`, message.data);
            window.dispatchEvent(new CustomEvent('refresh-chambres', { detail: message.data }));
            window.dispatchEvent(new CustomEvent('refresh-dashboard', { detail: message.data }));
            break;

          case 'CHAMBRE_UPDATED':
            console.log(`🔄 Mise à jour de la chambre ${message.data?.chambreId}:`, message.data);
            window.dispatchEvent(new CustomEvent('chambre-updated', { detail: message.data }));
            window.dispatchEvent(new CustomEvent('refresh-chambres', { detail: message.data }));
            break;

          case 'RESERVATION_CREATED':
          case 'RESERVATION_UPDATED':
          case 'RESERVATION_CANCELLED':
          case 'RESERVATION_DELETED':
            console.log(`📋 Événement réservation: ${message.type}`, message.data);
            window.dispatchEvent(new CustomEvent('refresh-chambres', { detail: message.data }));
            window.dispatchEvent(new CustomEvent('refresh-dashboard', { detail: message.data }));
            break;

          case 'PAYMENT_RECORDED':
            console.log(`💰 Paiement enregistré: ${message.data?.reservationId}`, message.data);
            window.dispatchEvent(new CustomEvent('refresh-chambres', { detail: message.data }));
            window.dispatchEvent(new CustomEvent('refresh-dashboard', { detail: message.data }));
            break;

          default:
            console.log(`📨 Message WebSocket non traité: ${message.type}`, message.data);
        }

      } catch (error) {
        console.error('❌ Erreur de traitement du message WebSocket:', error);
      }
    }
  }, [lastJsonMessage]);

  const subscribeToChannel = useCallback((channel: string) => {
    if (!isConnected) {
      console.warn(`⚠️ WebSocket non connecté, impossible de s'abonner à ${channel}`);
      setSubscribedChannels(prev => {
        const newSet = new Set(prev);
        newSet.add(channel);
        return newSet;
      });
      return;
    }
    setSubscribedChannels(prev => {
      const newSet = new Set(prev);
      newSet.add(channel);
      return newSet;
    });
    sendMessage({ type: 'SUBSCRIBE', channel });
    console.log(`📡 Abonnement au canal: ${channel}`);
  }, [isConnected, sendMessage]);

  const unsubscribeFromChannel = useCallback((channel: string) => {
    setSubscribedChannels(prev => {
      const newSet = new Set(prev);
      newSet.delete(channel);
      return newSet;
    });
    if (isConnected) {
      sendMessage({ type: 'UNSUBSCRIBE', channel });
    }
    console.log(`📡 Désabonnement du canal: ${channel}`);
  }, [isConnected, sendMessage]);

  const refreshChambres = useCallback(() => {
    if (isConnected) {
      sendMessage({ 
        type: 'REFRESH_CHAMBRES', 
        data: { source: 'manual', timestamp: new Date().toISOString() } 
      });
    } else {
      console.warn('⚠️ WebSocket non connecté, rafraîchissement par cache local');
      window.dispatchEvent(new CustomEvent('refresh-chambres', { detail: { source: 'manual' } }));
    }
  }, [isConnected, sendMessage]);

  const refreshDashboard = useCallback(() => {
    if (isConnected) {
      sendMessage({ 
        type: 'REFRESH_DASHBOARD', 
        data: { source: 'manual', timestamp: new Date().toISOString() } 
      });
    } else {
      console.warn('⚠️ WebSocket non connecté, rafraîchissement par cache local');
      window.dispatchEvent(new CustomEvent('refresh-dashboard', { detail: { source: 'manual' } }));
    }
  }, [isConnected, sendMessage]);

  const value: WebSocketContextType = {
    sendMessage,
    lastMessage,
    isConnected,
    connectionError,
    subscribeToChannel,
    unsubscribeFromChannel,
    refreshChambres,
    refreshDashboard,
    connectedUsers,
    subscribe: subscribeToChannel,
    unsubscribe: unsubscribeFromChannel,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export default WebSocketContext;