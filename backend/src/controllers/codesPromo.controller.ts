import { Request, Response } from 'express';
import { PromoCode } from '../models';
import { WebSocketManager } from '../websocket/server';

export class CodesPromoController {

  // POST /api/codes-promo
  create = async (req: Request, res: Response) => {
    try {
      const {
        code,
        description,
        reductionPourcentage,
        reductionFixe,
        dateDebutValidite,
        dateFinValidite,
        usagesMax,
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

      const existing = await PromoCode.findOne({ where: { code: codeUpper } });
      if (existing) {
        return res.status(409).json({ success: false, message: 'Ce code promo existe déjà' });
      }

      const promo = await PromoCode.create({
        code: codeUpper,
        description: description || null,
        tauxReduction: reductionPourcentage ? Number(reductionPourcentage) : null,
        reductionFixe: reductionFixe ? Number(reductionFixe) : null,
        dateDebut: dateDebutValidite ? new Date(dateDebutValidite) : new Date(),
        dateFin: dateFinValidite ? new Date(dateFinValidite) : new Date(Date.now() + 30 * 86400000),
        nbUtilisationsMax: usagesMax ? Number(usagesMax) : null,
        nbUtilisations: 0,
        actif: actif !== undefined ? actif : true
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

  // GET /api/codes-promo
  getAll = async (req: Request, res: Response) => {
    try {
      const promos = await PromoCode.findAll({ order: [['createdAt', 'DESC']] });
      return res.status(200).json({ success: true, data: promos });
    } catch (error) {
      console.error('Erreur getAll codesPromo:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des codes promo'
      });
    }
  };

  // DELETE /api/codes-promo/:id
  delete = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const promo = await PromoCode.findByPk(id);
      if (!promo) {
        return res.status(404).json({ success: false, message: 'Code promo non trouvé' });
      }
      await promo.destroy();
      return res.status(200).json({ success: true, message: 'Code promo supprimé' });
    } catch (error) {
      console.error('Erreur delete codePromo:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression'
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