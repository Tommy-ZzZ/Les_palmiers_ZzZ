import { Router } from 'express';
import { PaiementsController } from '../controllers/paiements.controller';
import { authenticate, isGerante } from '../middleware/auth.middleware';

const router = Router();
const controller = new PaiementsController();

// ✅ Toutes les routes nécessitent authentification
router.use(authenticate);

// ✅ Routes principales
router.get('/', controller.getAll.bind(controller));
router.get('/impayes', controller.getImpayes.bind(controller));
router.get('/tresorerie', controller.getTresorerie.bind(controller));
router.get('/reservation/:reservationId', controller.getByReservation.bind(controller));
router.get('/:id', controller.getById.bind(controller));

// ✅ Routes d'écriture
router.post('/', controller.create.bind(controller));

// ✅ Routes des factures
router.post('/:reservationId/facture', isGerante, controller.generateFacture.bind(controller));
router.get('/:reservationId/facture', controller.getFacture.bind(controller));

// ✅ Alerte impayés (gérante uniquement)
router.post('/alerter-impayes', isGerante, controller.alerterImpayes.bind(controller));

// ✅ AJOUT : relance individuelle (juste après la route reservation/:reservationId)
router.post('/relance/:reservationId', controller.envoyerRelance.bind(controller));

export default router;