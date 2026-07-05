// backend/src/controllers/paiements.controller.ts
import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Payment, Reservation, Invoice, Client, Room } from '../models';
import { StatutReservation, StatutPaiement } from '../models/Reservation';
import { WebSocketManager } from '../websocket/server';

export class PaiementsController {
  /**
   * Synchroniser le statut d'une chambre
   */
  private async synchroniserStatutChambre(chambreId: number): Promise<void> {
    try {
      const chambre = await Room.findByPk(chambreId);
      if (!chambre) return;

      if (
        chambre.statut === 'EN_MAINTENANCE' ||
        chambre.statut === 'HORS_SERVICE' ||
        chambre.statut === 'BLOQUEE'
      ) {
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const reservationActive = await Reservation.count({
        where: {
          chambreId,
          statut: { [Op.in]: ['CONFIRMEE', 'EN_ATTENTE_ACOMPTE'] },
          dateArrivee: { [Op.lte]: today },
          dateDepart: { [Op.gt]: today }
        }
      });

      const nouveauStatut = reservationActive > 0 ? 'OCCUPEE' : 'DISPONIBLE';
      if (chambre.statut !== nouveauStatut) {
        await chambre.update({ statut: nouveauStatut });
        console.log(`🔄 [sync] Chambre ${chambreId}: ${chambre.statut} → ${nouveauStatut}`);
      }
    } catch (error) {
      console.error('❌ Erreur synchroniserStatutChambre:', error);
    }
  }

  /**
   * Mettre à jour le statut de paiement d'une réservation
   * ✅ CORRECTION : Paiement complet → CONFIRMEE
   */
  private async updateReservationPaymentStatus(reservationId: number) {
    try {
      const paiements = await Payment.findAll({ 
        where: { reservationId } 
      });
      const totalPaye = paiements.reduce((sum, p) => sum + p.montant, 0);

      const reservation = await Reservation.findByPk(reservationId);
      if (!reservation) return;

      const montantTotal = Number(reservation.montantTotal) || 0;
      const montantRestantDu = Math.round((montantTotal - totalPaye) * 100) / 100;

      let statutPaiement = StatutPaiement.ACOMPTE_EN_ATTENTE;
      
      if (totalPaye >= montantTotal) {
        statutPaiement = StatutPaiement.SOLDE_COMPLET;
      } else if (totalPaye >= Number(reservation.montantAcompte)) {
        statutPaiement = StatutPaiement.ACOMPTE_RECU;
      } else if (totalPaye > 0) {
        statutPaiement = StatutPaiement.SOLDE_PARTIEL;
      }

      await reservation.update({ 
        statutPaiement,
        montantSolde: Math.round((montantTotal - Number(reservation.montantAcompte)) * 100) / 100
      });

      // ✅ Si paiement complet → réservation CONFIRMEE
      if (statutPaiement === StatutPaiement.SOLDE_COMPLET && 
          reservation.statut === StatutReservation.EN_ATTENTE_ACOMPTE) {
        await reservation.update({ 
          statut: StatutReservation.CONFIRMEE
        });
        await this.synchroniserStatutChambre(reservation.chambreId);
        
        const wsManager = WebSocketManager.getInstance();
        wsManager.broadcastToAll({
          type: 'RESERVATION_CONFIRMED',
          data: {
            reservationId: reservation.id,
            chambreId: reservation.chambreId,
            clientNom: reservation.client?.nom || '',
            clientPrenom: reservation.client?.prenom || ''
          },
          timestamp: new Date().toISOString()
        });
        
        console.log(`✅ [Paiement] Réservation ${reservation.numero} confirmée - paiement complet`);
      }

      console.log(`💰 [Paiement] Réservation ${reservation.numero}: ${totalPaye}€/${montantTotal}€ - Statut: ${statutPaiement}`);
      
    } catch (error) {
      console.error('❌ Erreur updateReservationPaymentStatus:', error);
    }
  }

  async getAll(req: Request, res: Response) {
    try {
      const paiements = await Payment.findAll({
        include: [
          {
            model: Reservation,
            as: 'reservation',
            include: [
              { model: Client, as: 'client' },
              { model: Room, as: 'chambre' }
            ]
          }
        ],
        order: [['datePaiement', 'DESC']]
      });

      return res.status(200).json({
        success: true,
        data: paiements
      });
    } catch (error) {
      console.error('Erreur getAll paiements:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des paiements'
      });
    }
  }

  async getImpayes(req: Request, res: Response) {
    try {
      const today = new Date();
      const deuxJoursAvant = new Date(today);
      deuxJoursAvant.setDate(deuxJoursAvant.getDate() + 2);

      const reservations = await Reservation.findAll({
        where: {
          statut: { [Op.notIn]: ['ANNULEE', 'NO_SHOW', 'TERMINEE'] },
          statutPaiement: {
            [Op.in]: ['ACOMPTE_EN_ATTENTE', 'SOLDE_PARTIEL']
          },
          dateArrivee: {
            [Op.lte]: deuxJoursAvant
          }
        },
        include: [
          { model: Client, as: 'client' },
          { model: Room, as: 'chambre' },
          { model: Payment, as: 'paiements' }
        ]
      });

      return res.status(200).json({
        success: true,
        data: reservations
      });
    } catch (error) {
      console.error('Erreur getImpayes:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des impayés'
      });
    }
  }

  async getTresorerie(req: Request, res: Response) {
    try {
      const { mois, annee } = req.query;
      const month = parseInt(mois as string) || new Date().getMonth() + 1;
      const year = parseInt(annee as string) || new Date().getFullYear();

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const paiements = await Payment.findAll({
        where: {
          datePaiement: {
            [Op.between]: [startDate, endDate]
          }
        }
      });

      const encaissementsRealises = paiements.reduce((sum, p) => sum + p.montant, 0);

      const reservations = await Reservation.findAll({
        where: {
          dateArrivee: {
            [Op.between]: [startDate, endDate]
          },
          statut: { [Op.notIn]: ['ANNULEE', 'NO_SHOW'] }
        }
      });

      const encaissementsPrevis = reservations.reduce((sum, r) => {
        const paiementsRecus = paiements
          .filter(p => p.reservationId === r.id)
          .reduce((s, p) => s + p.montant, 0);
        return sum + (r.montantTotal - paiementsRecus);
      }, 0);

      return res.status(200).json({
        success: true,
        data: {
          mois: month,
          annee: year,
          encaissementsRealises,
          encaissementsPrevis,
          total: encaissementsRealises + encaissementsPrevis,
          nombrePaiements: paiements.length,
          nombreReservations: reservations.length
        }
      });
    } catch (error) {
      console.error('Erreur getTresorerie:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération de la trésorerie'
      });
    }
  }

  async getByReservation(req: Request, res: Response) {
    try {
      const { reservationId } = req.params;

      const paiements = await Payment.findAll({
        where: { reservationId },
        order: [['datePaiement', 'DESC']]
      });

      const reservation = await Reservation.findByPk(reservationId, {
        include: [
          { model: Client, as: 'client' },
          { model: Room, as: 'chambre' }
        ]
      });

      return res.status(200).json({
        success: true,
        data: {
          reservation,
          paiements,
          totalPaye: paiements.reduce((sum, p) => sum + p.montant, 0)
        }
      });
    } catch (error) {
      console.error('Erreur getByReservation:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des paiements'
      });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const paiement = await Payment.findByPk(id, {
        include: [
          {
            model: Reservation,
            as: 'reservation',
            include: [
              { model: Client, as: 'client' },
              { model: Room, as: 'chambre' }
            ]
          }
        ]
      });

      if (!paiement) {
        return res.status(404).json({
          success: false,
          message: 'Paiement non trouvé'
        });
      }

      return res.status(200).json({
        success: true,
        data: paiement
      });
    } catch (error) {
      console.error('Erreur getById:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération'
      });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const { 
        reservationId, 
        montant, 
        modePaiement, 
        typePaiement, 
        reference, 
        notes,
        numeroCheque,
        banqueEmettrice,
        typeCarte,
        numeroCarteMasque,
        referenceVirement
      } = req.body;
      const userId = (req as any).user?.id;

      const reservation = await Reservation.findByPk(reservationId, {
        include: [
          { model: Client, as: 'client' },
          { model: Room, as: 'chambre' }
        ]
      });
      
      if (!reservation) {
        return res.status(404).json({
          success: false,
          message: 'Réservation non trouvée'
        });
      }

      const paiementsExistants = await Payment.findAll({
        where: { reservationId }
      });
      const totalPaye = paiementsExistants.reduce((sum, p) => sum + p.montant, 0);

      const montantTotal = Number(reservation.montantTotal) || 0;
      if (totalPaye + montant > montantTotal) {
        return res.status(400).json({
          success: false,
          message: `Le montant total des paiements ne peut pas dépasser ${montantTotal} €`
        });
      }

      const paiementData: any = {
        reservationId,
        montant,
        modePaiement,
        typePaiement: typePaiement || 'SOLDE',
        reference,
        notes,
        enregistrePar: userId
      };

      if (modePaiement === 'CHEQUE') {
        paiementData.numeroCheque = numeroCheque;
        paiementData.banqueEmettrice = banqueEmettrice;
      }
      if (modePaiement === 'CARTE') {
        paiementData.typeCarte = typeCarte;
        paiementData.numeroCarteMasque = numeroCarteMasque || '****';
      }
      if (modePaiement === 'VIREMENT') {
        paiementData.referenceVirement = referenceVirement;
        paiementData.banqueEmettrice = banqueEmettrice || '';
      }

      const paiement = await Payment.create(paiementData);

      await this.updateReservationPaymentStatus(reservationId);

      const wsManager = WebSocketManager.getInstance();
      wsManager.emitPaymentRecorded(reservationId, reservation.chambreId, paiement);

      wsManager.broadcastToAll({
        type: 'REFRESH_CHAMBRES',
        data: { reason: 'payment_recorded', timestamp: new Date().toISOString() },
        timestamp: new Date().toISOString()
      });

      return res.status(201).json({
        success: true,
        message: 'Paiement enregistré avec succès',
        data: {
          paiement,
          reservation: {
            id: reservation.id,
            numero: reservation.numero,
            statut: reservation.statut,
            statutPaiement: reservation.statutPaiement,
            montantRestantDu: reservation.montantRestantDu
          }
        }
      });
    } catch (error) {
      console.error('Erreur create paiement:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'enregistrement du paiement'
      });
    }
  }

  async generateFacture(req: Request, res: Response) {
    try {
      const { reservationId } = req.params;
      const userId = (req as any).user?.id;

      const reservation = await Reservation.findByPk(reservationId, {
        include: [
          { model: Client, as: 'client' },
          { model: Room, as: 'chambre' }
        ]
      });

      if (!reservation) {
        return res.status(404).json({
          success: false,
          message: 'Réservation non trouvée'
        });
      }

      const existingFacture = await Invoice.findOne({ 
        where: { reservationId } 
      });
      
      if (existingFacture) {
        return res.status(400).json({
          success: false,
          message: 'Une facture existe déjà pour cette réservation'
        });
      }

      const count = await Invoice.count();
      const numero = `FAC-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

      const facture = await Invoice.create({
        numero,
        reservationId,
        montantHt: reservation.montantTotal,
        tauxTva: 0,
        montantTva: 0,
        montantTtc: reservation.montantTotal,
        editePar: userId
      });

      return res.status(201).json({
        success: true,
        message: 'Facture générée avec succès',
        data: facture
      });
    } catch (error) {
      console.error('Erreur generateFacture:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la génération de la facture'
      });
    }
  }

  async getFacture(req: Request, res: Response) {
    try {
      const { reservationId } = req.params;

      const facture = await Invoice.findOne({
        where: { reservationId },
        include: [
          {
            model: Reservation,
            as: 'reservation',
            include: [
              { model: Client, as: 'client' },
              { model: Room, as: 'chambre' }
            ]
          }
        ]
      });

      if (!facture) {
        return res.status(404).json({
          success: false,
          message: 'Facture non trouvée'
        });
      }

      return res.status(200).json({
        success: true,
        data: facture
      });
    } catch (error) {
      console.error('Erreur getFacture:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération de la facture'
      });
    }
  }

  async alerterImpayes(req: Request, res: Response) {
    try {
      const today = new Date();
      const deuxJoursAvant = new Date(today);
      deuxJoursAvant.setDate(deuxJoursAvant.getDate() + 2);

      const reservations = await Reservation.findAll({
        where: {
          statut: { [Op.notIn]: ['ANNULEE', 'NO_SHOW', 'TERMINEE'] },
          statutPaiement: {
            [Op.in]: ['ACOMPTE_EN_ATTENTE', 'SOLDE_PARTIEL']
          },
          dateArrivee: {
            [Op.lte]: deuxJoursAvant
          }
        },
        include: [
          { model: Client, as: 'client' },
          { model: Room, as: 'chambre' }
        ]
      });

      return res.status(200).json({
        success: true,
        message: `${reservations.length} réservations avec impayés`,
        data: reservations
      });
    } catch (error) {
      console.error('Erreur alerterImpayes:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'alerte des impayés'
      });
    }
  }
}

export default new PaiementsController();