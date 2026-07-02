import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Payment, Reservation, Invoice, Client, Room } from '../models';

export class PaiementsController {
  /**
   * Récupérer tous les paiements
   */
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

  /**
   * Récupérer les impayés (CDC section 3.4.2)
   */
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

  /**
   * Récupérer la trésorerie (CDC section 3.7.3)
   */
  async getTresorerie(req: Request, res: Response) {
    try {
      const { mois, annee } = req.query;
      const month = parseInt(mois as string) || new Date().getMonth() + 1;
      const year = parseInt(annee as string) || new Date().getFullYear();

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      // Encaissements réalisés
      const paiements = await Payment.findAll({
        where: {
          datePaiement: {
            [Op.between]: [startDate, endDate]
          }
        }
      });

      const encaissementsRealises = paiements.reduce((sum, p) => sum + p.montant, 0);

      // Encaissements prévus (réservations à venir)
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

  /**
   * Récupérer les paiements d'une réservation
   */
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

  /**
   * Récupérer un paiement par ID
   */
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

  /**
   * Créer un paiement
   */
  async create(req: Request, res: Response) {
    try {
      const { 
        reservationId, 
        montant, 
        modePaiement, 
        typePaiement, 
        reference, 
        notes 
      } = req.body;
      const userId = (req as any).user?.id;

      const reservation = await Reservation.findByPk(reservationId);
      if (!reservation) {
        return res.status(404).json({
          success: false,
          message: 'Réservation non trouvée'
        });
      }

      // Vérifier que le montant ne dépasse pas le total
      const paiementsExistants = await Payment.findAll({
        where: { reservationId }
      });
      const totalPaye = paiementsExistants.reduce((sum, p) => sum + p.montant, 0);

      if (totalPaye + montant > reservation.montantTotal) {
        return res.status(400).json({
          success: false,
          message: `Le montant total des paiements ne peut pas dépasser ${reservation.montantTotal} €`
        });
      }

      const paiement = await Payment.create({
        reservationId,
        montant,
        modePaiement,
        typePaiement: typePaiement || 'SOLDE',
        reference,
        notes,
        enregistrePar: userId
      });

      // Mettre à jour le statut de paiement de la réservation
      await this.updateReservationPaymentStatus(reservationId);

      return res.status(201).json({
        success: true,
        message: 'Paiement enregistré avec succès',
        data: paiement
      });
    } catch (error) {
      console.error('Erreur create paiement:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'enregistrement du paiement'
      });
    }
  }

  /**
   * Générer une facture (CDC section 8.3)
   */
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

      // Vérifier si une facture existe déjà
      const existingFacture = await Invoice.findOne({ 
        where: { reservationId } 
      });
      
      if (existingFacture) {
        return res.status(400).json({
          success: false,
          message: 'Une facture existe déjà pour cette réservation'
        });
      }

      // Générer le numéro de facture
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

  /**
   * Récupérer une facture
   */
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

  /**
   * Alerter les impayés (CDC section 3.4.2)
   */
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

      // Ici, on pourrait envoyer des emails de relance
      // Pour l'instant, on retourne juste la liste

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

  /**
   * Mettre à jour le statut de paiement d'une réservation
   */
  private async updateReservationPaymentStatus(reservationId: number) {
    try {
      const paiements = await Payment.findAll({ 
        where: { reservationId } 
      });
      const totalPaye = paiements.reduce((sum, p) => sum + p.montant, 0);

      const reservation = await Reservation.findByPk(reservationId);
      if (!reservation) return;

      let statutPaiement = 'ACOMPTE_EN_ATTENTE';
      
      if (totalPaye >= reservation.montantTotal) {
        statutPaiement = 'SOLDE_COMPLET';
      } else if (totalPaye >= reservation.montantAcompte) {
        statutPaiement = 'ACOMPTE_RECU';
      } else if (totalPaye > 0) {
        statutPaiement = 'SOLDE_PARTIEL';
      }

      await reservation.update({ statutPaiement });
    } catch (error) {
      console.error('Erreur updateReservationPaymentStatus:', error);
    }
  }
}