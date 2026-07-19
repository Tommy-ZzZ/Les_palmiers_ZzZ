// backend/src/routes/codesPromo.routes.ts
//
// À monter dans app.ts avec :
//   import codesPromoRoutes from './routes/codesPromo.routes';
//   app.use('/api/codes-promo', codesPromoRoutes);
//
import { Router } from 'express';
import { CodesPromoController } from '../controllers/codesPromo.controller';
import { authenticate, isGerante } from '../middleware/auth.middleware';

const router = Router();
const controller = new CodesPromoController();

router.use(authenticate);

router.get('/', isGerante, controller.getAll.bind(controller));
router.post('/', isGerante, controller.create.bind(controller));
router.delete('/:id', isGerante, controller.delete.bind(controller));
router.patch('/:id/toggle', isGerante, controller.toggleActif.bind(controller));

export default router;