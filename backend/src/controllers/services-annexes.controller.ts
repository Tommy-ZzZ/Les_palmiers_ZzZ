import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { 
  Bike, 
  BikeRental, 
  Transfer, 
  Partner, 
  Activity, 
  ReservationActivity, 
  Reservation,
  Client,
  Room
} from '../models';

export class ServicesAnnexesController {
  // ========================
  // VÉLOS
  // ========================

  async getVelos(req: Request, res: Response) {
    try {
      const velos = await Bike.findAll({
        order: [['type', 'ASC']]
      });

      return res.status(200).json({
        success: true,
        data: velos
      });
    } catch (error) {
      console.error('Erreur getVelos:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des vélos'
      });
    }
  }

  async getVelosDisponibles(req: Request, res: Response) {
    try {
      const { dateDebut, dateFin } = req.query;

      const velos = await Bike.findAll({
        where: { etat: { [Op.not]: 'HORS_SERVICE' } }
      });

      if (!dateDebut || !dateFin) {
        return res.status(200).json({
          success: true,
          data: velos
        });
      }

      const disponibles = await Promise.all(
        velos.map(async (velo) => {
          const locations = await BikeRental.count({
            where: {
              veloId: velo.id,
              statut: 'EN_COURS',
              dateDebut: { [Op.lt]: dateFin },
              dateFin: { [Op.gt]: dateDebut }
            }
          });
          return {
            ...velo.toJSON(),
            disponible: locations === 0
          };
        })
      );

      return res.status(200).json({
        success: true,
        data: disponibles.filter(v => v.disponible)
      });
    } catch (error) {
      console.error('Erreur getVelosDisponibles:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la vérification des disponibilités'
      });
    }
  }

  async getLocationsEnCours(req: Request, res: Response) {
    try {
      const locations = await BikeRental.findAll({
        where: { statut: 'EN_COURS' },
        include: [
          { model: Bike, as: 'velo' },
          {
            model: Reservation,
            as: 'reservation',
            include: [
              { model: Client, as: 'client' },
              { model: Room, as: 'chambre' }
            ]
          }
        ],
        order: [['dateDebut', 'ASC']]
      });

      return res.status(200).json({
        success: true,
        data: locations
      });
    } catch (error) {
      console.error('Erreur getLocationsEnCours:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des locations'
      });
    }
  }

  async createVelo(req: Request, res: Response) {
    try {
      const velo = await Bike.create(req.body);
      return res.status(201).json({
        success: true,
        message: 'Vélo créé avec succès',
        data: velo
      });
    } catch (error) {
      console.error('Erreur createVelo:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la création du vélo'
      });
    }
  }

  async updateVelo(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const velo = await Bike.findByPk(id);

      if (!velo) {
        return res.status(404).json({
          success: false,
          message: 'Vélo non trouvé'
        });
      }

      await velo.update(req.body);

      return res.status(200).json({
        success: true,
        message: 'Vélo mis à jour avec succès',
        data: velo
      });
    } catch (error) {
      console.error('Erreur updateVelo:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour'
      });
    }
  }

  async deleteVelo(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const velo = await Bike.findByPk(id);

      if (!velo) {
        return res.status(404).json({
          success: false,
          message: 'Vélo non trouvé'
        });
      }

      await velo.destroy();

      return res.status(200).json({
        success: true,
        message: 'Vélo supprimé avec succès'
      });
    } catch (error) {
      console.error('Erreur deleteVelo:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression'
      });
    }
  }

  // ========================
  // LOCATIONS DE VÉLOS
  // ========================

  async createLocationVelo(req: Request, res: Response) {
    try {
      const { reservationId, veloId, dateDebut, dateFin, typeTarification, montant } = req.body;

      // Vérifier la disponibilité du vélo
      const conflict = await BikeRental.findOne({
        where: {
          veloId,
          statut: 'EN_COURS',
          dateDebut: { [Op.lt]: dateFin },
          dateFin: { [Op.gt]: dateDebut }
        }
      });

      if (conflict) {
        return res.status(409).json({
          success: false,
          message: 'Ce vélo n\'est pas disponible sur cette période'
        });
      }

      const location = await BikeRental.create({
        reservationId,
        veloId,
        dateDebut,
        dateFin,
        typeTarification: typeTarification || 'JOURNALIERE',
        montant: montant || 0
      });

      return res.status(201).json({
        success: true,
        message: 'Location créée avec succès',
        data: location
      });
    } catch (error) {
      console.error('Erreur createLocationVelo:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la création de la location'
      });
    }
  }

  async terminerLocationVelo(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const location = await BikeRental.findByPk(id);

      if (!location) {
        return res.status(404).json({
          success: false,
          message: 'Location non trouvée'
        });
      }

      await location.update({ statut: 'TERMINEE' });

      return res.status(200).json({
        success: true,
        message: 'Location terminée avec succès',
        data: location
      });
    } catch (error) {
      console.error('Erreur terminerLocationVelo:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la terminaison de la location'
      });
    }
  }

  // ========================
  // TRANSFERTS
  // ========================

  async getTransferts(req: Request, res: Response) {
    try {
      const { statut } = req.query;
      const where: any = {};

      if (statut) {
        where.statut = statut;
      }

      const transferts = await Transfer.findAll({
        where,
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
        order: [['dateHeure', 'ASC']]
      });

      return res.status(200).json({
        success: true,
        data: transferts
      });
    } catch (error) {
      console.error('Erreur getTransferts:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des transferts'
      });
    }
  }

  async getHistoriqueTransferts(req: Request, res: Response) {
    try {
      const transferts = await Transfer.findAll({
        where: { statut: { [Op.in]: ['REALISE', 'ANNULE'] } },
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
        order: [['dateHeure', 'DESC']],
        limit: 50
      });

      return res.status(200).json({
        success: true,
        data: transferts
      });
    } catch (error) {
      console.error('Erreur getHistoriqueTransferts:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération de l\'historique'
      });
    }
  }

  async createTransfert(req: Request, res: Response) {
    try {
      const transfert = await Transfer.create(req.body);

      return res.status(201).json({
        success: true,
        message: 'Transfert créé avec succès',
        data: transfert
      });
    } catch (error) {
      console.error('Erreur createTransfert:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la création du transfert'
      });
    }
  }

  async updateTransfert(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const transfert = await Transfer.findByPk(id);

      if (!transfert) {
        return res.status(404).json({
          success: false,
          message: 'Transfert non trouvé'
        });
      }

      await transfert.update(req.body);

      return res.status(200).json({
        success: true,
        message: 'Transfert mis à jour avec succès',
        data: transfert
      });
    } catch (error) {
      console.error('Erreur updateTransfert:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour'
      });
    }
  }

  async deleteTransfert(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const transfert = await Transfer.findByPk(id);

      if (!transfert) {
        return res.status(404).json({
          success: false,
          message: 'Transfert non trouvé'
        });
      }

      await transfert.destroy();

      return res.status(200).json({
        success: true,
        message: 'Transfert supprimé avec succès'
      });
    } catch (error) {
      console.error('Erreur deleteTransfert:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression'
      });
    }
  }

  // ========================
  // ACTIVITÉS
  // ========================

  async getActivites(req: Request, res: Response) {
    try {
      const activites = await Activity.findAll({
        include: [{ model: Partner, as: 'partenaire' }],
        where: { actif: true },
        order: [['nom', 'ASC']]
      });

      return res.status(200).json({
        success: true,
        data: activites
      });
    } catch (error) {
      console.error('Erreur getActivites:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des activités'
      });
    }
  }

  async getCommissions(req: Request, res: Response) {
    try {
      const { dateDebut, dateFin } = req.query;

      const where: any = {};
      if (dateDebut && dateFin) {
        where.dateActivite = { [Op.between]: [dateDebut, dateFin] };
      }

      const reservations = await ReservationActivity.findAll({
        where,
        include: [
          {
            model: Activity,
            as: 'activite',
            include: [{ model: Partner, as: 'partenaire' }]
          },
          {
            model: Reservation,
            as: 'reservation',
            include: [{ model: Client, as: 'client' }]
          }
        ],
        order: [['dateActivite', 'DESC']]
      });

      const totalCommissions = reservations.reduce((sum, r) => sum + r.commissionPercue, 0);

      return res.status(200).json({
        success: true,
        data: {
          reservations,
          totalCommissions,
          nombreReservations: reservations.length
        }
      });
    } catch (error) {
      console.error('Erreur getCommissions:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des commissions'
      });
    }
  }

  async getReservationsExternes(req: Request, res: Response) {
    try {
      const reservations = await ReservationActivity.findAll({
        include: [
          {
            model: Activity,
            as: 'activite',
            include: [{ model: Partner, as: 'partenaire' }]
          },
          {
            model: Reservation,
            as: 'reservation',
            include: [{ model: Client, as: 'client' }]
          }
        ],
        order: [['dateActivite', 'DESC']]
      });

      return res.status(200).json({
        success: true,
        data: reservations
      });
    } catch (error) {
      console.error('Erreur getReservationsExternes:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des réservations externes'
      });
    }
  }

  async createActivite(req: Request, res: Response) {
    try {
      const activite = await Activity.create(req.body);

      return res.status(201).json({
        success: true,
        message: 'Activité créée avec succès',
        data: activite
      });
    } catch (error) {
      console.error('Erreur createActivite:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la création de l\'activité'
      });
    }
  }

  async updateActivite(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const activite = await Activity.findByPk(id);

      if (!activite) {
        return res.status(404).json({
          success: false,
          message: 'Activité non trouvée'
        });
      }

      await activite.update(req.body);

      return res.status(200).json({
        success: true,
        message: 'Activité mise à jour avec succès',
        data: activite
      });
    } catch (error) {
      console.error('Erreur updateActivite:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour'
      });
    }
  }

  async deleteActivite(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const activite = await Activity.findByPk(id);

      if (!activite) {
        return res.status(404).json({
          success: false,
          message: 'Activité non trouvée'
        });
      }

      await activite.destroy();

      return res.status(200).json({
        success: true,
        message: 'Activité supprimée avec succès'
      });
    } catch (error) {
      console.error('Erreur deleteActivite:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression'
      });
    }
  }

  // ========================
  // RÉSERVATIONS D'ACTIVITÉS
  // ========================

  async createReservationActivite(req: Request, res: Response) {
    try {
      const { reservationId, activiteId, dateActivite, nbParticipants, montantPaye } = req.body;

      const activite = await Activity.findByPk(activiteId);
      if (!activite) {
        return res.status(404).json({
          success: false,
          message: 'Activité non trouvée'
        });
      }

      const commissionPercue = activite.commissionGite || 0;

      const reservation = await ReservationActivity.create({
        reservationId,
        activiteId,
        dateActivite,
        nbParticipants: nbParticipants || 1,
        montantPaye: montantPaye || 0,
        commissionPercue,
        statut: 'CONFIRMEE'
      });

      return res.status(201).json({
        success: true,
        message: 'Réservation d\'activité créée avec succès',
        data: reservation
      });
    } catch (error) {
      console.error('Erreur createReservationActivite:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la création de la réservation'
      });
    }
  }

  // ========================
  // PARTENAIRES
  // ========================

  async getPartenaires(req: Request, res: Response) {
    try {
      const partenaires = await Partner.findAll({
        where: { actif: true },
        include: [
          {
            model: Activity,
            as: 'activites',
            where: { actif: true },
            required: false
          }
        ],
        order: [['nom', 'ASC']]
      });

      return res.status(200).json({
        success: true,
        data: partenaires
      });
    } catch (error) {
      console.error('Erreur getPartenaires:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des partenaires'
      });
    }
  }

  async createPartenaire(req: Request, res: Response) {
    try {
      const partenaire = await Partner.create(req.body);

      return res.status(201).json({
        success: true,
        message: 'Partenaire créé avec succès',
        data: partenaire
      });
    } catch (error) {
      console.error('Erreur createPartenaire:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la création du partenaire'
      });
    }
  }
}