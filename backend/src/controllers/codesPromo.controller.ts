// backend/src/controllers/codesPromo.controller.ts
import { Request, Response } from 'express';
import { PromoCode } from '../models';
import { WebSocketManager } from '../websocket/server';

export class CodesPromoController {

  // GET /api/codes-promo
  // Liste TOUS les codes promo (actifs, inactifs, expirés confondus).
  getAll = async (req: Request, res: Response) => {
    try {
      const promos = await PromoCode.findAll({ order: [['created_at', 'DESC']] });
      return res.status(200).json({ success: true, data: promos });
    } catch (error) {
      console.error('Erreur getAll codesPromo:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des codes promo'
      });
    }
  };

  // POST /api/codes-promo
  // Les champs attendus correspondent exactement au modèle Sequelize
  // PromoCode (voir models/PromoCode.ts) : code, description,
  // tauxReduction, reductionFixe, dateDebut, dateFin, nbUtilisationsMax, actif.
  create = async (req: Request, res: Response) => {
    try {
      const {
        code,
        description,
        tauxReduction,
        reductionFixe,
        dateDebut,
        dateFin,
        nbUtilisationsMax,
        actif
      } = req.body;

      if (!code) {
        return res.status(400).json({ success: false, message: 'Le code est requis' });
      }

      const codeUpper = String(code).toUpperCase();
      const regex = /^[A-Z0-9]{1,6}$/;
      if (!regex.test(codeUpper)) {
        return res.status(400).json({
          success: false,
          message: "Le code doit contenir 1 à 6 caractères (majuscules et chiffres uniquement)"
        });
      }

      if (!dateDebut || !dateFin) {
        return res.status(400).json({
          success: false,
          message: 'Les dates de validité (dateDebut, dateFin) sont requises'
        });
      }

      if (new Date(dateFin) < new Date(dateDebut)) {
        return res.status(400).json({
          success: false,
          message: 'La date de fin doit être postérieure à la date de début'
        });
      }

      if (!tauxReduction && !reductionFixe) {
        return res.status(400).json({
          success: false,
          message: 'Une réduction en pourcentage (tauxReduction) ou fixe (reductionFixe) est requise'
        });
      }

      const existing = await PromoCode.findOne({ where: { code: codeUpper } });
      if (existing) {
        return res.status(409).json({ success: false, message: 'Ce code promo existe déjà' });
      }

      const promo = await PromoCode.create({
        code: codeUpper,
        description: description || undefined,
        tauxReduction: tauxReduction ? Number(tauxReduction) : 0,
        reductionFixe: reductionFixe ? Number(reductionFixe) : undefined,
        dateDebut,
        dateFin,
        nbUtilisationsMax: nbUtilisationsMax ? Number(nbUtilisationsMax) : undefined,
        nbUtilisations: 0,
        actif: actif !== undefined ? Boolean(actif) : true
      });

      const wsManager = (req as any).wsManager as WebSocketManager;
      if (wsManager) {
        wsManager.broadcastToAll({
          type: 'REFRESH_CHAMBRES',
          data: { reason: 'promo_created', code: promo.code },
          timestamp: new Date().toISOString()
        });
      }

      return res.status(201).json({
        success: true,
        message: `Code promo ${promo.code} créé avec succès`,
        data: promo
      });

    } catch (error) {
      console.error('Erreur create codePromo:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la création du code promo: ' + (error as Error).message
      });
    }
  };

  // DELETE /api/codes-promo/:id
  // ✅ CORRECTION — le blocage précédent (409 "code déjà utilisé") a été
  // retiré : la suppression fonctionne maintenant que le code ait été
  // utilisé ou non. Si votre base a une contrainte de clé étrangère stricte
  // (ON DELETE RESTRICT) sur Reservation.codePromoId, la suppression d'un
  // code encore référencé par une réservation peut échouer côté base ;
  // dans ce cas le catch ci-dessous renvoie un message clair au lieu de
  // planter silencieusement.
  delete = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const promo = await PromoCode.findByPk(id);
      if (!promo) {
        return res.status(404).json({ success: false, message: 'Code promo non trouvé' });
      }

      const codeSupprime = promo.code;
      await promo.destroy();

      const wsManager = (req as any).wsManager as WebSocketManager;
      if (wsManager) {
        wsManager.broadcastToAll({
          type: 'REFRESH_CHAMBRES',
          data: { reason: 'promo_deleted', codePromoId: id, code: codeSupprime },
          timestamp: new Date().toISOString()
        });
      }

      return res.status(200).json({ success: true, message: `Code promo ${codeSupprime} supprimé` });
    } catch (error: any) {
      console.error('Erreur delete codePromo:', error);

      // Contrainte FK de la base (si Reservation.codePromoId référence encore ce code)
      if (error?.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(409).json({
          success: false,
          message: 'Ce code promo est référencé par au moins une réservation existante et ne peut pas être supprimé. Désactivez-le plutôt.'
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression: ' + (error as Error).message
      });
    }
  };

  // PATCH /api/codes-promo/:id/toggle
  toggleActif = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const promo = await PromoCode.findByPk(id);
      if (!promo) {
        return res.status(404).json({ success: false, message: 'Code promo non trouvé' });
      }
      await promo.update({ actif: !promo.actif });

      const wsManager = (req as any).wsManager as WebSocketManager;
      if (wsManager) {
        wsManager.broadcastToAll({
          type: 'REFRESH_CHAMBRES',
          data: { reason: 'promo_toggled', code: promo.code, actif: promo.actif },
          timestamp: new Date().toISOString()
        });
      }

      return res.status(200).json({
        success: true,
        message: `Code promo ${promo.actif ? 'activé' : 'désactivé'}`,
        data: promo
      });
    } catch (error) {
      console.error('Erreur toggleActif codePromo:', error);
      return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour' });
    }
  };
}

export default new CodesPromoController();