// E:\Projets\les-palmiers\backend\src\routes\clients.routes.ts

import { Router } from 'express';
import { ClientsController } from '../controllers/clients.controller';
import { authenticate, isGerante } from '../middleware/auth.middleware';

const router = Router();
const controller = new ClientsController();

// Toutes les routes nécessitent une authentification
router.use(authenticate);

// ✅ AJOUT DE LA ROUTE DE RECHERCHE (doit être avant les routes avec paramètre :id)
router.get('/search', controller.search);

// Routes principales
router.get('/', controller.getAll);
router.get('/stats', controller.getStats);
router.get('/:id', controller.getById);
router.get('/:id/historique', controller.getHistorique);
router.get('/:id/detail', controller.getDetail);
router.get('/:id/export-rgpd', controller.exportRgpd);

// Routes d'écriture
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', isGerante, controller.delete);

export const clientsRouter = router;