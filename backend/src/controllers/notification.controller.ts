import { Request, Response } from 'express';
import {
  genererEtRecupererNotifications,
  marquerCommeLue,
  marquerToutesCommeLues,
  compterNonLues,
  getNotificationsNonLues,
  nettoyerNotificationsLues,
  getNotificationsByType,
  getNotificationsByReservation,
} from '../services/notification.service';

/**
 * Contrôleur des notifications
 * Suit le cahier des charges §3.4.2 (Alertes et relances)
 */
export const notificationController = {
  /**
   * Récupérer toutes les notifications (avec génération des alertes)
   * GET /api/notifications
   */
  async getAll(req: Request, res: Response) {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const notifications = await genererEtRecupererNotifications(limit);
      const nonLues = await compterNonLues();
      
      res.json({ 
        success: true, 
        data: notifications, 
        nonLues,
        total: notifications.length 
      });
    } catch (error: any) {
      console.error('[notificationController.getAll]', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la récupération des notifications' 
      });
    }
  },

  /**
   * Récupérer uniquement les notifications non lues
   * GET /api/notifications/non-lues
   */
  async getNonLues(req: Request, res: Response) {
    try {
      const notifications = await getNotificationsNonLues();
      const count = await compterNonLues();
      
      res.json({ 
        success: true, 
        data: notifications, 
        count 
      });
    } catch (error: any) {
      console.error('[notificationController.getNonLues]', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la récupération des notifications non lues' 
      });
    }
  },

  /**
   * Récupérer les notifications par type
   * GET /api/notifications/type/:type
   */
  async getByType(req: Request, res: Response) {
    try {
      const { type } = req.params;
      const notifications = await getNotificationsByType(type as any);
      
      res.json({ 
        success: true, 
        data: notifications 
      });
    } catch (error: any) {
      console.error('[notificationController.getByType]', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la récupération des notifications par type' 
      });
    }
  },

  /**
   * Récupérer les notifications par réservation
   * GET /api/notifications/reservation/:reservationId
   */
  async getByReservation(req: Request, res: Response) {
    try {
      const { reservationId } = req.params;
      const notifications = await getNotificationsByReservation(Number(reservationId));
      
      res.json({ 
        success: true, 
        data: notifications 
      });
    } catch (error: any) {
      console.error('[notificationController.getByReservation]', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la récupération des notifications par réservation' 
      });
    }
  },

  /**
   * Marquer une notification comme lue
   * PATCH /api/notifications/:id/lire
   */
  async marquerLue(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const notification = await marquerCommeLue(Number(id));
      
      if (!notification) {
        return res.status(404).json({ 
          success: false, 
          message: 'Notification introuvable' 
        });
      }
      
      res.json({ 
        success: true, 
        data: notification,
        message: 'Notification marquée comme lue' 
      });
    } catch (error: any) {
      console.error('[notificationController.marquerLue]', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la mise à jour' 
      });
    }
  },

  /**
   * Marquer toutes les notifications comme lues
   * PATCH /api/notifications/lire-tout
   */
  async marquerToutesLues(req: Request, res: Response) {
    try {
      await marquerToutesCommeLues();
      res.json({ 
        success: true, 
        message: 'Toutes les notifications ont été marquées comme lues' 
      });
    } catch (error: any) {
      console.error('[notificationController.marquerToutesLues]', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la mise à jour' 
      });
    }
  },

  /**
   * Compter les notifications non lues
   * GET /api/notifications/compte
   */
  async compterNonLues(req: Request, res: Response) {
    try {
      const count = await compterNonLues();
      res.json({ 
        success: true, 
        count 
      });
    } catch (error: any) {
      console.error('[notificationController.compterNonLues]', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erreur lors du comptage des notifications' 
      });
    }
  },

  /**
   * Nettoyer les notifications lues (suppression)
   * DELETE /api/notifications/nettoyer
   */
  async nettoyerLues(req: Request, res: Response) {
    try {
      const deleted = await nettoyerNotificationsLues();
      res.json({ 
        success: true, 
        deleted,
        message: `${deleted} notification(s) supprimée(s)` 
      });
    } catch (error: any) {
      console.error('[notificationController.nettoyerLues]', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erreur lors du nettoyage des notifications' 
      });
    }
  },
};