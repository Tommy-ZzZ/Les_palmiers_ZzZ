import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';

const router = Router();
const controller = new AuthController();

router.post('/login', controller.login);
router.post('/logout', controller.logout);
router.get('/me', controller.getCurrentUser);

export default router; // ✅ Export par défaut