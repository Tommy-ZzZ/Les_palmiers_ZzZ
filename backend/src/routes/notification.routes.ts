import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// ✅ Protection de toutes les routes (authentification requise)
router.use(authenticate);

// 📋 Routes principales
router.get('/', notificationController.getAll);
router.get('/non-lues', notificationController.getNonLues);
router.get('/compte', notificationController.compterNonLues);
router.get('/type/:type', notificationController.getByType);
router.get('/reservation/:reservationId', notificationController.getByReservation);

// ✏️ Routes de modification
router.patch('/:id/lire', notificationController.marquerLue);
router.patch('/lire-tout', notificationController.marquerToutesLues);

// 🗑️ Routes de nettoyage
router.delete('/nettoyer', notificationController.nettoyerLues);

export default router;