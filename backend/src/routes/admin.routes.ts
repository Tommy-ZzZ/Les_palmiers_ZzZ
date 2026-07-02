import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authenticate, isGerante, isGeranteOrComptable } from '../middleware/auth.middleware';

const router = Router();
const controller = new AdminController();

// ════════════════════════════════════════════════════════
// 🔒 TOUTES LES ROUTES NÉCESSITENT AUTHENTIFICATION
// ════════════════════════════════════════════════════════
router.use(authenticate);

// ════════════════════════════════════════════════════════
// 📊 TABLEAU DE BORD & INDICATEURS (§3.7)
// ════════════════════════════════════════════════════════
router.get('/dashboard', isGerante, controller.getDashboard);
router.get('/stats/revpar', isGeranteOrComptable, controller.getRevPAR);

// ════════════════════════════════════════════════════════
// 💰 GESTION DES TARIFS (§3.1.2 - RG2, RG7)
// ════════════════════════════════════════════════════════
router.get('/tarifs', isGerante, controller.getTarifs);
router.post('/tarifs', isGerante, controller.createTarif);
router.put('/tarifs/:id', isGerante, controller.updateTarif);

// ════════════════════════════════════════════════════════
// 🏷️ GESTION DES CODES PROMO
// ════════════════════════════════════════════════════════
router.get('/promos', isGerante, controller.getPromos);
router.post('/promos', isGerante, controller.createPromo);
router.put('/promos/:id', isGerante, controller.updatePromo);

// ════════════════════════════════════════════════════════
// 👥 GESTION DES UTILISATEURS (§4.1)
// ════════════════════════════════════════════════════════
router.get('/utilisateurs', isGerante, controller.getUtilisateurs);
router.post('/utilisateurs', isGerante, controller.createUtilisateur);
router.put('/utilisateurs/:id', isGerante, controller.updateUtilisateur);
router.delete('/utilisateurs/:id', isGerante, controller.deleteUtilisateur);

// ✅ NOUVEAU: Changement de mot de passe (avec vérification admin)
router.post('/utilisateurs/:id/change-password', isGerante, controller.changePassword);

// ════════════════════════════════════════════════════════
// ✉️ MODÈLES EMAIL (§3.6.2 - RG6)
// ════════════════════════════════════════════════════════
router.get('/modeles-email', isGerante, controller.getModelesEmail);
router.put('/modeles-email/:id', isGerante, controller.updateModeleEmail);

// ════════════════════════════════════════════════════════
// 📋 JOURNAL D'AUDIT (§4.4)
// ════════════════════════════════════════════════════════
router.get('/audit', isGerante, controller.getAuditLogs);

// ════════════════════════════════════════════════════════
// 📥 EXPORTS (§3.7.3)
// ════════════════════════════════════════════════════════
router.get('/export/reservations', isGeranteOrComptable, controller.exportReservations);
router.get('/export/clients', isGeranteOrComptable, controller.exportClients);

export default router;