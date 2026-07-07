// backend/src/routes/chambres.routes.ts
import { Router } from 'express';
import { ChambresController } from '../controllers/chambres.controller';
import { authenticate, isGerante } from '../middleware/auth.middleware';

const router = Router();
const controller = new ChambresController();

// ============================================
// ROUTES SPÉCIFIQUES - DOIVENT ÊTRE AVANT /:id
// ============================================

// ✅ Consultation des blocages (pour le calendrier)
router.get('/blockages', controller.getBlockages.bind(controller));

// Consultation des chambres avec occupation calculée
router.get('/avec-occupation', controller.getChambresAvecOccupation.bind(controller));

// Consultation des chambres disponibles sur une période
router.get('/disponibles', controller.getDisponibles.bind(controller));

// Consultation du calendrier
router.get('/calendrier', controller.getCalendrier.bind(controller));

// Consultation des arrivées et départs du jour
router.get('/arrivees-departs-jour', controller.getArriveesDepartsJour.bind(controller));

// ✅ Récupérer tous les codes promo actifs
router.get('/codes-promo/actifs', controller.getActivePromoCodes.bind(controller));

// ============================================
// ROUTES PUBLIQUES
// ============================================

// Consultation de toutes les chambres
router.get('/', controller.getAll.bind(controller));

// Consultation d'une chambre par ID
router.get('/:id', controller.getById.bind(controller));

// ============================================
// ROUTES PROTÉGÉES (authentification requise)
// ============================================

router.use(authenticate);

// Gestion des chambres (gérante uniquement)
router.post('/', isGerante, controller.create.bind(controller));
router.put('/:id', isGerante, controller.update.bind(controller));
router.delete('/:id', isGerante, controller.delete.bind(controller));
router.patch('/:id/statut', isGerante, controller.updateStatut.bind(controller));

// Gestion des tarifs par chambre
router.get('/:id/tarifs', isGerante, controller.getTarifs.bind(controller));
router.put('/:id/tarifs', isGerante, controller.updateTarifs.bind(controller));
router.get('/:id/historique', isGerante, controller.getHistorique.bind(controller));

// Blocage de dates
router.post('/:id/bloquer', isGerante, controller.bloquerDates.bind(controller));
router.delete('/:id/bloquer/:blocageId', isGerante, controller.debloquerDates.bind(controller));

// Réservations futures par chambre
router.get('/:id/reservations-futures', isGerante, controller.getReservationsFutures.bind(controller));

// ✅ Appliquer un code promo à une chambre
router.post('/:id/appliquer-promo', isGerante, controller.appliquerPromo.bind(controller));

export default router;