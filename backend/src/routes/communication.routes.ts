// backend/src/routes/communication.routes.ts
import express from 'express';
import communicationController from '../controllers/communication.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

// ============================================
// MODÈLES — §3.6.2
// ============================================

router.get('/modeles', authenticate, communicationController.getModeles.bind(communicationController));
router.get('/modeles/:id', authenticate, communicationController.getModele.bind(communicationController));
router.post('/modeles', authenticate, communicationController.createModele.bind(communicationController));
router.put('/modeles/:id', authenticate, communicationController.updateModele.bind(communicationController));
router.patch('/modeles/:id/valider', authenticate, communicationController.validerModele.bind(communicationController));
router.delete('/modeles/:id', authenticate, communicationController.deleteModele.bind(communicationController));

// ============================================
// ENVOIS — §3.6.1
// ============================================

router.post('/envoyer', authenticate, communicationController.envoyerEmail.bind(communicationController));
router.get('/historique', authenticate, communicationController.getHistorique.bind(communicationController));
router.get('/messages/:id', authenticate, communicationController.getMessage.bind(communicationController));
router.post('/messages/:id/reessayer', authenticate, communicationController.reessayerEnvoi.bind(communicationController));

// ============================================
// STATISTIQUES
// ============================================

router.get('/stats', authenticate, communicationController.getStats.bind(communicationController));

// ============================================
// RELANCES — §3.4.2
// ============================================

router.post('/relances', authenticate, communicationController.envoyerRelanceGroupe.bind(communicationController));
router.post('/clients/:clientId/relance', authenticate, communicationController.envoyerRelance.bind(communicationController));

export default router;