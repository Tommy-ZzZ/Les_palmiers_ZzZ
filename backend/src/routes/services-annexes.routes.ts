// backend/src/routes/services-annexes.routes.ts
import { Router } from 'express';
import { ServicesAnnexesController } from '../controllers/services-annexes.controller';
import { authenticate, isGerante } from '../middleware/auth.middleware';

const router = Router();
const controller = new ServicesAnnexesController();

// ✅ Toutes les routes nécessitent authentification
router.use(authenticate);

// ========================
// VÉLOS — §3.5.1
// ========================
router.get('/velos', controller.getVelos.bind(controller));
router.get('/velos/disponibles', controller.getVelosDisponibles.bind(controller));
router.get('/velos/locations-en-cours', controller.getLocationsEnCours.bind(controller));
router.post('/velos', isGerante, controller.createVelo.bind(controller));
router.put('/velos/:id', isGerante, controller.updateVelo.bind(controller));
router.delete('/velos/:id', isGerante, controller.deleteVelo.bind(controller));

// ✅ Locations de vélos — CRUD complet
router.post('/velos/reserver', controller.createLocationVelo.bind(controller));
router.put('/velos/location/:id', isGerante, controller.updateLocationVelo.bind(controller));
router.put('/velos/location/:id/terminer', controller.terminerLocationVelo.bind(controller));
router.delete('/velos/location/:id', isGerante, controller.deleteLocationVelo.bind(controller));

// ========================
// TRANSFERTS — §3.5.2
// ========================
router.get('/transferts', controller.getTransferts.bind(controller));
router.get('/transferts/historique', controller.getHistoriqueTransferts.bind(controller));
router.post('/transferts', controller.createTransfert.bind(controller));
router.put('/transferts/:id', controller.updateTransfert.bind(controller));
router.delete('/transferts/:id', isGerante, controller.deleteTransfert.bind(controller));

// ========================
// ACTIVITÉS — §3.5.3
// ========================
router.get('/activites/catalogue', controller.getActivites.bind(controller));
router.get('/activites/commissions', controller.getCommissions.bind(controller));
router.get('/activites/reservations-externes', controller.getReservationsExternes.bind(controller));
router.post('/activites/reserver', controller.createReservationActivite.bind(controller));
router.post('/activites', isGerante, controller.createActivite.bind(controller));
router.put('/activites/:id', isGerante, controller.updateActivite.bind(controller));
router.delete('/activites/:id', isGerante, controller.deleteActivite.bind(controller));

// ========================
// PARTENAIRES — §3.5.3
// ========================
router.get('/partenaires', controller.getPartenaires.bind(controller));
router.post('/partenaires', isGerante, controller.createPartenaire.bind(controller));
router.put('/partenaires/:id', isGerante, controller.updatePartenaire.bind(controller));
router.delete('/partenaires/:id', isGerante, controller.deletePartenaire.bind(controller));

export default router;