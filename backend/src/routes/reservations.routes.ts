// backend/src/routes/reservations.routes.ts
import { Router } from 'express';
import { ReservationsController } from '../controllers/reservations.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const controller = new ReservationsController();

// ✅ Toutes les routes protégées par authentification
router.use(authenticate);

// 📋 Routes principales
router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);

// 📅 Arrivées / Départs (CDC 3.1.3)
router.get('/arrivees-jour', controller.getArriveesJour);
router.get('/departs-jour', controller.getDepartsJour);
router.get('/prochains-7-jours', controller.getProchains7Jours);

// ❌ Annulation (RG5) - Soft delete
router.delete('/:id/annuler', controller.cancel);

// 🗑️ Suppression définitive - Hard delete
router.delete('/:id/supprimer', controller.supprimer);

// 💰 Calcul / Simulation
router.post('/calculer', controller.calculer);

// 📊 Statistiques (CDC 3.7.1)
router.get('/stats/occupation', controller.getStatsOccupation);
router.get('/stats/taux-occupation', controller.getTauxOccupation);

export default router;