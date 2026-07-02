// frontend/src/services/api.ts
import axios from 'axios';
import toast from 'react-hot-toast';
import type { CommunicationStats as SharedCommunicationStats, MessageEmail as SharedMessageEmail, ModeleMessage as SharedModeleMessage, StatutEnvoi as SharedStatutEnvoi, TypeMessage as SharedTypeMessage } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Injection du token JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('palmiers_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Gestion des erreurs globales
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('[API] error:', {
      status: error.response?.status,
      url: error.config?.url,
      message: error.response?.data?.message,
    });
    
    if (error.response?.status === 401) {
      toast.error('Session expirée. Veuillez vous reconnecter.');
      localStorage.removeItem('palmiers_token');
      localStorage.removeItem('palmiers_user');
      window.location.href = '/login';
    } else if (error.response?.status === 403) {
      toast.error('Accès refusé — permissions insuffisantes');
    } else if (error.response?.status >= 500) {
      toast.error('Erreur serveur. Veuillez réessayer.');
    }
    return Promise.reject(error);
  }
);

// ============================================
// TYPES - COMMUNICATION
// ============================================

export type TypeMessage = SharedTypeMessage;
export type StatutEnvoi = SharedStatutEnvoi;
export type ModeleMessage = SharedModeleMessage;
export type MessageEmail = SharedMessageEmail;
export type CommunicationStats = SharedCommunicationStats & {
  parStatut?: Record<StatutEnvoi, number>;
  derniersEnvois?: MessageEmail[];
  tauxSucces?: number;
};

// ============================================
// SERVICES - CHAMBRES
// ============================================

export const chambreService = {
  async getAll() {
    const response = await api.get('/chambres');
    return response.data;
  },

  async getAvecOccupation() {
    const response = await api.get('/chambres/avec-occupation');
    return response.data;
  },

  async getDisponibles(dateArrivee: string, dateDepart: string, capacite?: number) {
    const response = await api.get('/chambres/disponibles', {
      params: { dateArrivee, dateDepart, capacite }
    });
    return response.data;
  },

  async getCalendrier(mois: number, annee: number) {
    const response = await api.get('/chambres/calendrier', {
      params: { mois, annee }
    });
    return response.data;
  },

  async getById(id: number) {
    const response = await api.get(`/chambres/${id}`);
    return response.data;
  },

  async create(data: any) {
    const response = await api.post('/chambres', data);
    return response.data;
  },

  async update(id: number, data: any) {
    const response = await api.put(`/chambres/${id}`, data);
    return response.data;
  },

  async delete(id: number) {
    const response = await api.delete(`/chambres/${id}`);
    return response.data;
  },

  async updateStatut(id: number, statut: string) {
    const response = await api.patch(`/chambres/${id}/statut`, { statut });
    return response.data;
  },

  async bloquerDates(id: number, data: { dateDebut: string; dateFin: string; motif: string; type: string }) {
    const response = await api.post(`/chambres/${id}/bloquer`, data);
    return response.data;
  },

  async debloquerDates(id: number, blocageId: number) {
    const response = await api.delete(`/chambres/${id}/bloquer/${blocageId}`);
    return response.data;
  },

  async getTarifs(id: number) {
    const response = await api.get(`/chambres/${id}/tarifs`);
    return response.data;
  },

  async updateTarifs(id: number, tarifs: any[]) {
    const response = await api.put(`/chambres/${id}/tarifs`, { tarifs });
    return response.data;
  },

  async getHistorique(id: number) {
    const response = await api.get(`/chambres/${id}/historique`);
    return response.data;
  },

  async getReservationsFutures(id: number) {
    const response = await api.get(`/chambres/${id}/reservations-futures`);
    return response.data;
  },

  async getArriveesDepartsJour() {
    const response = await api.get('/chambres/arrivees-departs-jour');
    return response.data;
  }
};

// ============================================
// SERVICES - RÉSERVATIONS (avec rafraîchissement notifications)
// ============================================

export const reservationService = {
  async getAll(filters?: { statut?: string; dateDebut?: string; dateFin?: string; search?: string; include?: string[] }) {
    const response = await api.get('/reservations', { params: filters });
    return response.data;
  },

  async getArriveesJour() {
    const response = await api.get('/reservations/arrivees-jour');
    return response.data;
  },

  async getDepartsJour() {
    const response = await api.get('/reservations/departs-jour');
    return response.data;
  },

  async getProchains7Jours() {
    const response = await api.get('/reservations/prochains-7-jours');
    return response.data;
  },

  async getById(id: number) {
    const response = await api.get(`/reservations/${id}`);
    return response.data;
  },

  async calculer(data: any) {
    const response = await api.post('/reservations/calculer', data);
    return response.data;
  },

  async create(data: any) {
    const response = await api.post('/reservations', data);
    // ✅ Rafraîchir les notifications après création
    if (response.data?.success) {
      try {
        await notificationService.getAll();
      } catch (e) {
        console.warn('[reservationService.create] Erreur refresh notifications:', e);
      }
    }
    return response.data;
  },

  async update(id: number, data: any) {
    const response = await api.put(`/reservations/${id}`, data);
    // ✅ Rafraîchir les notifications après modification
    if (response.data?.success) {
      try {
        await notificationService.getAll();
      } catch (e) {
        console.warn('[reservationService.update] Erreur refresh notifications:', e);
      }
    }
    return response.data;
  },

  async cancel(id: number, motif?: string) {
    const response = await api.delete(`/reservations/${id}/annuler`, { data: { motif } });
    // ✅ Rafraîchir les notifications après annulation
    if (response.data?.success) {
      try {
        await notificationService.getAll();
      } catch (e) {
        console.warn('[reservationService.cancel] Erreur refresh notifications:', e);
      }
    }
    return response.data;
  },

  async delete(id: number) {
    const response = await api.delete(`/reservations/${id}/supprimer`);
    // ✅ Rafraîchir les notifications après suppression
    if (response.data?.success) {
      try {
        await notificationService.getAll();
      } catch (e) {
        console.warn('[reservationService.delete] Erreur refresh notifications:', e);
      }
    }
    return response.data;
  },

  async getStatsOccupation(mois?: number, annee?: number) {
    const response = await api.get('/reservations/stats/occupation', { params: { mois, annee } });
    return response.data;
  },

  async getTauxOccupation(dateDebut?: string, dateFin?: string) {
    const response = await api.get('/reservations/stats/taux-occupation', { params: { dateDebut, dateFin } });
    return response.data;
  }
};

// ============================================
// SERVICES - CLIENTS (CORRIGÉ)
// ============================================

export const clientService = {
  async getAll(params?: { page?: number; limit?: number; search?: string }) {
    const response = await api.get('/clients', { params });
    return response.data;
  },

  // ✅ CORRECTION: Validation de l'ID avant appel API
  async getById(id: number | string) {
    // Convertir l'ID en nombre
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
    
    // ✅ Vérifier si l'ID est valide
    if (!numericId || isNaN(numericId) || numericId <= 0) {
      console.warn(`⚠️ clientService.getById - ID invalide: ${id}`);
      // Retourner un objet avec data: null au lieu d'une erreur
      return { success: true, data: null };
    }
    
    const response = await api.get(`/clients/${numericId}`);
    return response.data;
  },

  async create(data: any) {
    const response = await api.post('/clients', data);
    return response.data;
  },

  async update(id: number, data: any) {
    const response = await api.put(`/clients/${id}`, data);
    return response.data;
  },

  async delete(id: number) {
    const response = await api.delete(`/clients/${id}`);
    return response.data;
  },

  // ✅ CORRECTION: Gestion des recherches vides
  async search(query: string) {
    // Si la requête est vide ou trop courte, retourner un tableau vide
    if (!query || query.trim().length < 2) {
      return { success: true, data: [] };
    }
    const response = await api.get('/clients/search', { params: { q: query } });
    return response.data;
  }
};

// ============================================
// SERVICES - PAIEMENTS
// ============================================

export const paiementService = {
  async getAll(params?: { reservationId?: number; statut?: string }) {
    const response = await api.get('/paiements', { params });
    return response.data;
  },

  async getById(id: number) {
    const response = await api.get(`/paiements/${id}`);
    return response.data;
  },

  async getByReservation(reservationId: number) {
    const response = await api.get(`/paiements/reservation/${reservationId}`);
    return response.data;
  },

  async getTresorerie(mois?: number, annee?: number) {
    const params = new URLSearchParams();
    if (mois) params.append('mois', String(mois));
    if (annee) params.append('annee', String(annee));
    const response = await api.get(`/paiements/tresorerie?${params.toString()}`);
    return response.data;
  },

  async getImpayes() {
    const response = await api.get('/paiements/impayes');
    return response.data;
  },

  async generateFacture(reservationId: number) {
    const response = await api.post(`/paiements/${reservationId}/facture`);
    return response.data;
  },

  async alerterImpayes() {
    const response = await api.post('/paiements/alerter-impayes');
    return response.data;
  },

  async create(data: {
    reservationId: number;
    montant: number;
    modePaiement: string;
    typePaiement: string;
    reference?: string;
    notes?: string;
  }) {
    const response = await api.post('/paiements', data);
    // ✅ Rafraîchir les notifications après un paiement
    if (response.data?.success) {
      try {
        await notificationService.getAll();
      } catch (e) {
        console.warn('[paiementService.create] Erreur refresh notifications:', e);
      }
    }
    return response.data;
  },

  async envoyerRelance(reservationId: number) {
    const response = await api.post(`/paiements/${reservationId}/relance`);
    return response.data;
  }
};

// ============================================
// SERVICES - AUTH
// ============================================

export const authService = {
  async login(email: string, password: string) {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  async logout() {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  async getMe() {
    const response = await api.get('/auth/me');
    return response.data;
  }
};

// ============================================
// SERVICES - COMMUNICATION (§3.6)
// ============================================

export const communicationService = {
  // ─── MODÈLES (§3.6.2) ───

  /**
   * Récupérer tous les modèles de messages
   */
  async getModeles(): Promise<{ success: boolean; data: ModeleMessage[] }> {
    const response = await api.get('/communication/modeles');
    return response.data;
  },

  /**
   * Récupérer un modèle par son ID
   */
  async getModele(id: number): Promise<{ success: boolean; data: ModeleMessage; message?: string }> {
    const response = await api.get(`/communication/modeles/${id}`);
    return response.data;
  },

  /**
   * Créer un nouveau modèle
   */
  async createModele(data: Partial<ModeleMessage>): Promise<{ success: boolean; data: ModeleMessage; message?: string }> {
    const response = await api.post('/communication/modeles', data);
    return response.data;
  },

  /**
   * Mettre à jour un modèle (RG7 : historisation)
   */
  async updateModele(id: number, data: Partial<ModeleMessage>): Promise<{ success: boolean; data: ModeleMessage; message?: string }> {
    const response = await api.put(`/communication/modeles/${id}`, data);
    return response.data;
  },

  /**
   * Valider un modèle (RG6 : validation par la gérante)
   */
  async validerModele(id: number): Promise<{ success: boolean; message?: string }> {
    const response = await api.patch(`/communication/modeles/${id}/valider`);
    return response.data;
  },

  /**
   * Supprimer un modèle
   */
  async deleteModele(id: number): Promise<{ success: boolean; message?: string }> {
    const response = await api.delete(`/communication/modeles/${id}`);
    return response.data;
  },

  /**
   * Supprimer un message
   */
  async deleteMessage(id: number): Promise<{ success: boolean; message?: string }> {
    const response = await api.delete(`/communication/messages/${id}`);
    return response.data;
  },

  // ─── ENVOIS (§3.6.1) ───

  /**
   * Envoyer un email
   */
  async envoyerEmail(data: {
    clientId: number;
    reservationId?: number;
    modeleId?: number;
    messageId?: number;
    type: TypeMessage;
    sujet?: string;
    corps?: string;
  }): Promise<{ success: boolean; data: MessageEmail; message?: string }> {
    const response = await api.post('/communication/envoyer', data);
    return response.data;
  },

  /**
   * Récupérer l'historique des envois
   */
  async getHistorique(filters?: {
    clientId?: number;
    type?: TypeMessage;
    statut?: StatutEnvoi;
    dateDebut?: string;
    dateFin?: string;
  }): Promise<{ success: boolean; data: MessageEmail[]; message?: string }> {
    const response = await api.get('/communication/historique', { params: filters });
    return response.data;
  },

  /**
   * Récupérer un email par son ID
   */
  async getMessage(id: number): Promise<{ success: boolean; data: MessageEmail; message?: string }> {
    const response = await api.get(`/communication/messages/${id}`);
    return response.data;
  },

  /**
   * Réessayer l'envoi d'un email en échec
   */
  async reessayerEnvoi(id: number): Promise<{ success: boolean; data: MessageEmail; message?: string }> {
    const response = await api.post(`/communication/messages/${id}/reessayer`);
    return response.data;
  },

  // ─── STATISTIQUES ───

  /**
   * Récupérer les statistiques de communication
   */
  async getStats(): Promise<{ success: boolean; data: CommunicationStats; message?: string }> {
    const response = await api.get('/communication/stats');
    return response.data;
  },

  // ─── RELANCES (§3.4.2) ───

  /**
   * Envoyer des relances groupées
   */
  async envoyerRelanceGroupe(clientIds: number[]): Promise<{ success: boolean; count: number; message?: string }> {
    const response = await api.post('/communication/relances', { clientIds });
    return response.data;
  },

  /**
   * Envoyer une relance à un client spécifique
   */
  async envoyerRelance(clientId: number, reservationId?: number): Promise<{ success: boolean; message?: string }> {
    const response = await api.post(`/communication/clients/${clientId}/relance`, { reservationId });
    return response.data;
  },

  // ─── EMAILS AUTOMATIQUES (§3.6.1) ───

  /**
   * Envoyer l'email de confirmation (à la création)
   */
  async envoyerConfirmation(reservationId: number): Promise<{ success: boolean; data: MessageEmail; message?: string }> {
    const response = await api.post(`/communication/reservations/${reservationId}/confirmation`);
    return response.data;
  },

  /**
   * Envoyer l'email de rappel (J-7)
   */
  async envoyerRappel(reservationId: number): Promise<{ success: boolean; data: MessageEmail; message?: string }> {
    const response = await api.post(`/communication/reservations/${reservationId}/rappel`);
    return response.data;
  },

  /**
   * Envoyer l'email de remerciement (J+2)
   */
  async envoyerRemerciement(reservationId: number): Promise<{ success: boolean; data: MessageEmail; message?: string }> {
    const response = await api.post(`/communication/reservations/${reservationId}/remerciement`);
    return response.data;
  },

  /**
   * Envoyer l'email d'annulation
   */
  async envoyerAnnulation(reservationId: number, motif?: string): Promise<{ success: boolean; data: MessageEmail; message?: string }> {
    const response = await api.post(`/communication/reservations/${reservationId}/annulation`, { motif });
    return response.data;
  },

  /**
   * Envoyer une relance pour acompte impayé
   */
  async envoyerRelanceAcompte(reservationId: number): Promise<{ success: boolean; data: MessageEmail; message?: string }> {
    const response = await api.post(`/communication/reservations/${reservationId}/relance-acompte`);
    return response.data;
  },

  // ─── PRÉVISUALISATION (§3.6.2) ───

  /**
   * Prévisualiser un email (variables dynamiques substituées)
   */
  async previewEmail(data: {
    modeleId: number;
    clientId: number;
    reservationId?: number;
  }): Promise<{ success: boolean; data: { sujet: string; corps: string }; message?: string }> {
    const response = await api.post('/communication/preview', data);
    return response.data;
  },

  /**
   * Prévisualiser un email avec des variables personnalisées
   */
  async previewEmailCustom(data: {
    sujet: string;
    corps: string;
    variables: Record<string, string>;
  }): Promise<{ success: boolean; data: { sujet: string; corps: string }; message?: string }> {
    const response = await api.post('/communication/preview-custom', data);
    return response.data;
  },

  // ─── TEMPLATES OVH (§5.3) ───

  /**
   * Tester la connexion au service email (OVH)
   */
  async testEmailConnection(): Promise<{ success: boolean; message: string }> {
    const response = await api.get('/communication/test-email');
    return response.data;
  }
};

// ============================================
// SERVICES - NOTIFICATIONS (§3.4.2)
// ============================================

export type GraviteNotification = 'info' | 'success' | 'warning' | 'error';

export interface NotificationApi {
  id: number;
  type: string;
  titre: string;
  message: string;
  gravite: GraviteNotification;
  lu: boolean;
  reservationId: number | null;
  clientId: number | null;
  createdAt: string;
}

export const notificationService = {
  /**
   * Récupérer toutes les notifications (avec génération des alertes)
   * GET /api/notifications
   */
  async getAll(limit?: number): Promise<{ success: boolean; data: NotificationApi[]; nonLues: number; total: number }> {
    const response = await api.get('/notifications', { params: { limit } });
    return response.data;
  },

  /**
   * Récupérer uniquement les notifications non lues
   * GET /api/notifications/non-lues
   */
  async getNonLues(): Promise<{ success: boolean; data: NotificationApi[]; count: number }> {
    const response = await api.get('/notifications/non-lues');
    return response.data;
  },

  /**
   * Récupérer les notifications par type
   * GET /api/notifications/type/:type
   */
  async getByType(type: string): Promise<{ success: boolean; data: NotificationApi[] }> {
    const response = await api.get(`/notifications/type/${type}`);
    return response.data;
  },

  /**
   * Récupérer les notifications par réservation
   * GET /api/notifications/reservation/:reservationId
   */
  async getByReservation(reservationId: number): Promise<{ success: boolean; data: NotificationApi[] }> {
    const response = await api.get(`/notifications/reservation/${reservationId}`);
    return response.data;
  },

  /**
   * Compter les notifications non lues
   * GET /api/notifications/compte
   */
  async compterNonLues(): Promise<{ success: boolean; count: number }> {
    const response = await api.get('/notifications/compte');
    return response.data;
  },

  /**
   * Marquer une notification comme lue
   * PATCH /api/notifications/:id/lire
   */
  async marquerLue(id: number): Promise<{ success: boolean; data: NotificationApi; message?: string }> {
    const response = await api.patch(`/notifications/${id}/lire`);
    return response.data;
  },

  /**
   * Marquer toutes les notifications comme lues
   * PATCH /api/notifications/lire-tout
   */
  async marquerToutesLues(): Promise<{ success: boolean; message?: string }> {
    const response = await api.patch('/notifications/lire-tout');
    return response.data;
  },

  /**
   * Nettoyer les notifications lues (suppression)
   * DELETE /api/notifications/nettoyer
   */
  async nettoyerLues(): Promise<{ success: boolean; deleted: number; message?: string }> {
    const response = await api.delete('/notifications/nettoyer');
    return response.data;
  },

  /**
   * Rafraîchir les notifications (force refresh)
   * GET /api/notifications?refresh=true
   */
  async refresh(): Promise<{ success: boolean; data: NotificationApi[]; nonLues: number; total: number }> {
    const response = await api.get('/notifications', { params: { limit: 50, refresh: true } });
    return response.data;
  }
};

export default api;