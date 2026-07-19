// backend/src/controllers/chambres.controller.ts
import { Request, Response } from 'express';
import { Op, Sequelize } from 'sequelize';
import { Room, Tariff, RoomEquipment, Equipment, RoomBlock, Reservation, User, Client, PromoCode } from '../models';
import { WebSocketManager } from '../websocket/server';

// ✅ AJOUT — la méthode getVeloReservationRoomId() de
// services-annexes.controller.ts crée une VRAIE ligne dans la table Room
// (numero: 'VELO-0', nom: 'LOCATION_VELO') pour pouvoir rattacher les
// locations de vélos à une "réservation fantôme". Cette chambre virtuelle
// n'est pas destinée à être affichée : elle doit être exclue de TOUTES les
// requêtes de chambres ci-dessous, sinon elle apparaît comme une vraie
// carte sur la page /chambres.
const EXCLURE_CHAMBRE_VELO = {
  numero: { [Op.ne]: 'VELO-0' },
  nom: { [Op.ne]: 'LOCATION_VELO' }
};

export class ChambresController {
  private async estChambreOccupeeAujourdHui(chambreId: number): Promise<boolean> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const count = await Reservation.count({
      where: {
        chambreId,
        statut: { [Op.in]: ['CONFIRMEE', 'EN_ATTENTE_ACOMPTE'] },
        dateArrivee: { [Op.lte]: today },
        dateDepart: { [Op.gt]: today }
      }
    });

    return count > 0;
  }

  private async calculerStatutAffichage(chambre: Room, reservationsActives: Reservation[] = []): Promise<string> {
    if (chambre.statut === 'EN_MAINTENANCE' || chambre.statut === 'HORS_SERVICE' || chambre.statut === 'BLOQUEE') {
      return chambre.statut;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const aReservationActive = reservationsActives.some(reservation => {
      if (reservation.chambreId !== chambre.id) return false;
      if (reservation.statut === 'ANNULEE' || reservation.statut === 'NO_SHOW' || reservation.statut === 'TERMINEE') return false;
      return new Date(reservation.dateDepart) >= today;
    });

    if (aReservationActive) {
      return 'OCCUPEE';
    }

    const occupeeAujourdHui = await this.estChambreOccupeeAujourdHui(chambre.id);
    return occupeeAujourdHui ? 'OCCUPEE' : 'DISPONIBLE';
  }

  private determinerSaison(date: Date): string {
    const mois = date.getMonth() + 1;
    if (mois === 7 || mois === 8 || mois === 12) return 'HAUTE';
    if ((mois >= 4 && mois <= 6) || (mois >= 9 && mois <= 10)) return 'MOYENNE';
    return 'BASSE';
  }

  /**
   * ✅ AJOUT : Récupérer les codes promo actifs pour une chambre
   * ✅ CORRECTION : Utilisation des noms réels de colonnes SQL (snake_case)
   *    dans Sequelize.col(), car Sequelize.col() ne traduit PAS le mapping
   *    `field:` défini dans le modèle (contrairement aux clés du `where` classique).
   *    => nbUtilisations  -> nb_utilisations
   *       nbUtilisationsMax -> nb_utilisations_max
   */
  private async getActivePromoCodesForChambre(chambreId: number): Promise<PromoCode[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const promos = await PromoCode.findAll({
      where: {
        actif: true,
        dateDebut: { [Op.lte]: today },
        dateFin: { [Op.gte]: today },
        [Op.or]: [
          { nbUtilisationsMax: null },
          Sequelize.where(
            Sequelize.col('nb_utilisations'),
            Op.lt,
            Sequelize.col('nb_utilisations_max')
          )
        ]
      }
    });

    return promos;
  }

  getAll = async (req: Request, res: Response) => {
    try {
      const chambres = await Room.findAll({
        where: EXCLURE_CHAMBRE_VELO,
        include: [
          {
            model: Equipment,
            as: 'equipements',
            through: { attributes: [] }
          },
          {
            model: Tariff,
            as: 'tarifs',
            order: [['saison', 'ASC']]
          }
        ],
        order: [['numero', 'ASC']]
      });

      const formattedChambres = await Promise.all(chambres.map(async chambre => {
        const chambreJson = chambre.toJSON();
        const tarifs = chambreJson.tarifs || [];
        const statutAffichage = await this.calculerStatutAffichage(chambre);

        const tarifsBySaison: Record<string, any> = {};
        tarifs.forEach((t: any) => {
          const saison = t.saison || 'MOYENNE';
          tarifsBySaison[saison] = {
            prixBase: t.prixBase || 0,
            prixWeekend: t.prixBase ? t.prixBase * (t.coeffWeekend || 1.15) : 0,
            prixEnfant: t.prixEnfant || 10,
            prixLitSupplementaire: t.prixLitSupplementaire || 20,
            prixPetitDejeuner: t.prixPetitDejeuner || 15,
            coeffWeekend: t.coeffWeekend || 1.15,
            coeffDegressif: t.coeffDegressif5Nuits || 0.9
          };
        });

        const defaultTarif = {
          prixBase: 85,
          prixWeekend: 95,
          prixEnfant: 10,
          prixLitSupplementaire: 20,
          prixPetitDejeuner: 15,
          coeffWeekend: 1.15,
          coeffDegressif: 0.9
        };

        const currentSeason = this.determinerSaison(new Date());
        const currentTarif = tarifsBySaison[currentSeason] || tarifsBySaison['MOYENNE'] || defaultTarif;

        const equipementsList = chambreJson.equipements?.map((e: any) => e.nom) || [];

        // ✅ Récupérer les codes promo actifs
        const codesPromoActifs = await this.getActivePromoCodesForChambre(chambre.id);

        return {
          ...chambreJson,
          statut: statutAffichage,
          equipements: equipementsList,
          tarif_base: currentTarif.prixBase,
          tarif_weekend: currentTarif.prixWeekend,
          tarif_enfant: currentTarif.prixEnfant,
          tarif_lit_supp: currentTarif.prixLitSupplementaire,
          tarif_petit_dejeuner: currentTarif.prixPetitDejeuner,
          tarifs_complets: tarifsBySaison,
          saison_actuelle: currentSeason,
          codesPromoActifs: codesPromoActifs
        };
      }));

      return res.status(200).json({
        success: true,
        data: formattedChambres
      });

    } catch (error) {
      console.error('Erreur getAll chambres:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des chambres'
      });
    }
  };

  getDisponibles = async (req: Request, res: Response) => {
    try {
      const { dateArrivee, dateDepart, capacite } = req.query;

      if (!dateArrivee || !dateDepart) {
        return res.status(400).json({
          success: false,
          message: 'dateArrivee et dateDepart sont requis'
        });
      }

      const arrivee = new Date(dateArrivee as string);
      const depart = new Date(dateDepart as string);

      if (depart <= arrivee) {
        return res.status(400).json({
          success: false,
          message: 'La date de départ doit être postérieure à la date d\'arrivée'
        });
      }

      const allRooms = await Room.findAll({
        where: EXCLURE_CHAMBRE_VELO,
        include: [
          {
            model: Equipment,
            as: 'equipements',
            through: { attributes: [] }
          }
        ]
      });

      const availableRooms = await Promise.all(
        allRooms.map(async (room) => {
          const conflictingReservations = await Reservation.count({
            where: {
              chambreId: room.id,
              statut: { [Op.in]: ['CONFIRMEE', 'EN_ATTENTE_ACOMPTE'] },
              [Op.or]: [
                {
                  dateArrivee: { [Op.lt]: depart },
                  dateDepart: { [Op.gt]: arrivee }
                }
              ]
            }
          });

          const blockings = await RoomBlock.count({
            where: {
              chambreId: room.id,
              [Op.or]: [
                {
                  dateDebut: { [Op.lt]: depart },
                  dateFin: { [Op.gt]: arrivee }
                }
              ]
            }
          });

          const isStatutBloquant =
            room.statut === 'EN_MAINTENANCE' ||
            room.statut === 'HORS_SERVICE' ||
            room.statut === 'BLOQUEE';

          const isAvailable = !isStatutBloquant && conflictingReservations === 0 && blockings === 0;

          let capacityOk = true;
          if (capacite) {
            const cap = parseInt(capacite as string);
            capacityOk = room.capaciteAdultes >= cap;
          }

          return {
            ...room.toJSON(),
            disponible: isAvailable && capacityOk
          };
        })
      );

      const disponibles = availableRooms.filter(r => r.disponible === true);

      return res.status(200).json({
        success: true,
        data: disponibles
      });

    } catch (error) {
      console.error('Erreur getDisponibles:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la vérification des disponibilités'
      });
    }
  };

  getCalendrier = async (req: Request, res: Response) => {
    try {
      const { mois, annee } = req.query;
      const currentDate = new Date();
      const month = parseInt(mois as string) || currentDate.getMonth() + 1;
      const year = parseInt(annee as string) || currentDate.getFullYear();

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const chambres = await Room.findAll({
        where: EXCLURE_CHAMBRE_VELO,
        include: [
          {
            model: Equipment,
            as: 'equipements',
            through: { attributes: [] }
          }
        ]
      });

      const reservations = await Reservation.findAll({
        where: {
          statut: { [Op.in]: ['CONFIRMEE', 'EN_ATTENTE_ACOMPTE'] },
          dateDepart: { [Op.gte]: startDate },
          dateArrivee: { [Op.lte]: endDate }
        },
        include: ['client', 'chambre']
      });

      const blocages = await RoomBlock.findAll({
        where: {
          dateFin: { [Op.gte]: startDate },
          dateDebut: { [Op.lte]: endDate }
        }
      });

      const calendrier = chambres.map(chambre => {
        const jours = [];
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];

          const hasReservation = reservations.some(r =>
            r.chambreId === chambre.id &&
            r.dateArrivee <= d &&
            r.dateDepart > d
          );

          const hasBlocage = blocages.some(b =>
            b.chambreId === chambre.id &&
            b.dateDebut <= d &&
            b.dateFin >= d
          );

          const reservation = reservations.find(r =>
            r.chambreId === chambre.id &&
            r.dateArrivee <= d &&
            r.dateDepart > d
          );

          const chambreEstBloqueeManuellement =
            chambre.statut === 'EN_MAINTENANCE' ||
            chambre.statut === 'HORS_SERVICE' ||
            chambre.statut === 'BLOQUEE';

          jours.push({
            date: dateStr,
            disponible: !hasReservation && !hasBlocage && !chambreEstBloqueeManuellement,
            reserve: hasReservation,
            bloque: hasBlocage,
            reservationId: reservation?.id || null,
            clientNom: reservation?.client?.nom || null
          });
        }
        return {
          chambre: {
            id: chambre.id,
            numero: chambre.numero,
            nom: chambre.nom
          },
          jours
        };
      });

      return res.status(200).json({
        success: true,
        data: {
          mois: month,
          annee: year,
          calendrier
        }
      });

    } catch (error) {
      console.error('Erreur getCalendrier:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la génération du calendrier'
      });
    }
  };

  getBlockages = async (req: Request, res: Response) => {
    try {
      const { dateDebut, dateFin } = req.query;

      const where: any = {};

      if (dateDebut && dateFin) {
        where[Op.or] = [
          {
            dateDebut: { [Op.lte]: dateFin },
            dateFin: { [Op.gte]: dateDebut }
          }
        ];
      } else if (dateDebut) {
        where.dateFin = { [Op.gte]: dateDebut };
      } else if (dateFin) {
        where.dateDebut = { [Op.lte]: dateFin };
      }

      const blocages = await RoomBlock.findAll({
        where,
        include: [
          {
            model: Room,
            as: 'chambre',
            attributes: ['id', 'numero', 'nom'],
            where: EXCLURE_CHAMBRE_VELO
          }
        ],
        order: [['dateDebut', 'ASC']]
      });

      return res.status(200).json({
        success: true,
        data: blocages
      });

    } catch (error) {
      console.error('Erreur getBlockages:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des blocages'
      });
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const chambre = await Room.findOne({
        where: { id, ...EXCLURE_CHAMBRE_VELO },
        include: [
          {
            model: Equipment,
            as: 'equipements',
            through: { attributes: [] }
          },
          {
            model: Tariff,
            as: 'tarifs',
            order: [['saison', 'ASC']]
          }
        ]
      });

      if (!chambre) {
        return res.status(404).json({
          success: false,
          message: 'Chambre non trouvée'
        });
      }

      const statutAffichage = await this.calculerStatutAffichage(chambre);
      const codesPromoActifs = await this.getActivePromoCodesForChambre(chambre.id);

      return res.status(200).json({
        success: true,
        data: {
          ...chambre.toJSON(),
          statut: statutAffichage,
          codesPromoActifs: codesPromoActifs
        }
      });

    } catch (error) {
      console.error('Erreur getById:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération'
      });
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const chambre = await Room.create(req.body);

      if (req.body.equipementIds && req.body.equipementIds.length > 0) {
        await RoomEquipment.bulkCreate(
          req.body.equipementIds.map((equipementId: number) => ({
            chambreId: chambre.id,
            equipementId
          }))
        );
      }

      const wsManager = (req as any).wsManager as WebSocketManager;
      if (wsManager) {
        wsManager.broadcastToAll({
          type: 'REFRESH_CHAMBRES',
          data: { reason: 'chambre_created', chambreId: chambre.id },
          timestamp: new Date().toISOString()
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Chambre créée avec succès',
        data: chambre
      });

    } catch (error) {
      console.error('Erreur create chambre:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la création'
      });
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const chambre = await Room.findByPk(id);

      if (!chambre) {
        return res.status(404).json({
          success: false,
          message: 'Chambre non trouvée'
        });
      }

      await chambre.update(req.body);

      if (req.body.equipementIds) {
        await RoomEquipment.destroy({ where: { chambreId: id } });
        await RoomEquipment.bulkCreate(
          req.body.equipementIds.map((equipementId: number) => ({
            chambreId: parseInt(id),
            equipementId
          }))
        );
      }

      const wsManager = (req as any).wsManager as WebSocketManager;
      if (wsManager) {
        wsManager.broadcastToAll({
          type: 'REFRESH_CHAMBRES',
          data: { reason: 'chambre_updated', chambreId: id },
          timestamp: new Date().toISOString()
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Chambre mise à jour avec succès',
        data: chambre
      });

    } catch (error) {
      console.error('Erreur update chambre:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour'
      });
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const chambre = await Room.findByPk(id);

      if (!chambre) {
        return res.status(404).json({
          success: false,
          message: 'Chambre non trouvée'
        });
      }

      await chambre.destroy();

      const wsManager = (req as any).wsManager as WebSocketManager;
      if (wsManager) {
        wsManager.broadcastToAll({
          type: 'REFRESH_CHAMBRES',
          data: { reason: 'chambre_deleted', chambreId: id },
          timestamp: new Date().toISOString()
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Chambre supprimée avec succès'
      });

    } catch (error) {
      console.error('Erreur delete chambre:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression'
      });
    }
  };

  updateStatut = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { statut } = req.body;

      const statutsValides = ['DISPONIBLE', 'EN_MAINTENANCE', 'HORS_SERVICE', 'BLOQUEE'];
      if (!statutsValides.includes(statut)) {
        return res.status(400).json({
          success: false,
          message: `Statut invalide. Valeurs autorisées: ${statutsValides.join(', ')}`
        });
      }

      const chambre = await Room.findByPk(id);
      if (!chambre) {
        return res.status(404).json({
          success: false,
          message: 'Chambre non trouvée'
        });
      }

      const oldStatut = chambre.statut;
      await chambre.update({ statut });

      console.log(`🔧 [updateStatut] Chambre ${id}: ${oldStatut} → ${statut}`);

      const wsManager = (req as any).wsManager as WebSocketManager;
      if (wsManager) {
        wsManager.emitChambreStatusChanged(parseInt(id), oldStatut, statut);
      }

      return res.status(200).json({
        success: true,
        message: `Statut mis à jour avec succès: ${statut}`,
        data: chambre
      });

    } catch (error) {
      console.error('Erreur updateStatut:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour du statut'
      });
    }
  };

  bloquerDates = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { dateDebut, dateFin, motif, type } = req.body;
      const userId = (req as any).user?.id;

      const chambre = await Room.findByPk(id);
      if (!chambre) {
        return res.status(404).json({
          success: false,
          message: 'Chambre non trouvée'
        });
      }

      const conflictingReservations = await Reservation.count({
        where: {
          chambreId: parseInt(id),
          statut: { [Op.in]: ['CONFIRMEE', 'EN_ATTENTE_ACOMPTE'] },
          [Op.or]: [
            {
              dateArrivee: { [Op.lt]: new Date(dateFin) },
              dateDepart: { [Op.gt]: new Date(dateDebut) }
            }
          ]
        }
      });

      if (conflictingReservations > 0) {
        return res.status(409).json({
          success: false,
          message: 'Impossible de bloquer: des réservations existent sur cette période'
        });
      }

      const blocage = await RoomBlock.create({
        chambreId: parseInt(id),
        dateDebut: new Date(dateDebut),
        dateFin: new Date(dateFin),
        motif,
        type: type || 'MAINTENANCE',
        creePar: userId
      });

      const wsManager = (req as any).wsManager as WebSocketManager;
      if (wsManager) {
        wsManager.broadcastToAll({
          type: 'CHAMBRE_BLOCKED',
          data: {
            chambreId: parseInt(id),
            dateDebut,
            dateFin,
            motif,
            type
          },
          timestamp: new Date().toISOString()
        });

        wsManager.broadcastToAll({
          type: 'REFRESH_CHAMBRES',
          data: { reason: 'chambre_blocked', timestamp: new Date().toISOString() },
          timestamp: new Date().toISOString()
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Dates bloquées avec succès',
        data: blocage
      });

    } catch (error) {
      console.error('Erreur bloquerDates:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors du blocage des dates'
      });
    }
  };

  debloquerDates = async (req: Request, res: Response) => {
    try {
      const { id, blocageId } = req.params;

      const blocage = await RoomBlock.findOne({
        where: { id: blocageId, chambreId: id }
      });

      if (!blocage) {
        return res.status(404).json({
          success: false,
          message: 'Blocage non trouvé'
        });
      }

      await blocage.destroy();

      const wsManager = (req as any).wsManager as WebSocketManager;
      if (wsManager) {
        wsManager.broadcastToAll({
          type: 'CHAMBRE_UNBLOCKED',
          data: {
            chambreId: parseInt(id),
            blocageId: parseInt(blocageId as string)
          },
          timestamp: new Date().toISOString()
        });

        wsManager.broadcastToAll({
          type: 'REFRESH_CHAMBRES',
          data: { reason: 'chambre_unblocked', timestamp: new Date().toISOString() },
          timestamp: new Date().toISOString()
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Dates débloquées avec succès'
      });

    } catch (error) {
      console.error('Erreur debloquerDates:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors du déblocage des dates'
      });
    }
  };

  getTarifs = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const tarifs = await Tariff.findAll({
        where: { chambreId: id },
        order: [
          ['saison', 'ASC'],
          ['dateApplication', 'DESC']
        ]
      });

      return res.status(200).json({
        success: true,
        data: tarifs
      });

    } catch (error) {
      console.error('Erreur getTarifs:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des tarifs'
      });
    }
  };

  updateTarifs = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { tarifs } = req.body;
      const userId = (req as any).user?.id;

      const chambre = await Room.findByPk(id);
      if (!chambre) {
        return res.status(404).json({
          success: false,
          message: 'Chambre non trouvée'
        });
      }

      await Tariff.destroy({ where: { chambreId: id } });

      const saisonMap: Record<string, string> = {
        'BASSE_SAISON': 'BASSE',
        'MOYENNE_SAISON': 'MOYENNE',
        'HAUTE_SAISON': 'HAUTE',
        'BASSE': 'BASSE',
        'MOYENNE': 'MOYENNE',
        'HAUTE': 'HAUTE'
      };

      const newTarifs = await Promise.all(
        tarifs.map(async (t: any) => {
          const saisonValue = saisonMap[t.saison] || t.saison;

          return await Tariff.create({
            chambreId: parseInt(id),
            saison: saisonValue,
            prixBase: t.prixBase || 0,
            prixPetitDejeuner: t.prixPetitDejeuner || 15,
            prixLitSupplementaire: t.prixLitSupplementaire || 20,
            prixEnfant: t.prixEnfant || 10,
            coeffWeekend: t.coeffWeekend || 1.15,
            coeffDegressif5Nuits: t.coeffDegressif || 0.9,
            dateApplication: new Date(),
            dateFin: null,
            modifiePar: userId
          });
        })
      );

      const wsManager = (req as any).wsManager as WebSocketManager;
      if (wsManager) {
        wsManager.broadcastToAll({
          type: 'REFRESH_CHAMBRES',
          data: { reason: 'tarifs_updated', chambreId: id },
          timestamp: new Date().toISOString()
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Tarifs mis à jour avec succès',
        data: newTarifs
      });

    } catch (error) {
      console.error('Erreur updateTarifs:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour des tarifs: ' + (error as Error).message
      });
    }
  };

  getHistorique = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const historique = await Tariff.findAll({
        where: { chambreId: id },
        include: [
          {
            model: User,
            as: 'modificateur',
            attributes: ['prenom', 'nom']
          }
        ],
        order: [['updatedAt', 'DESC']],
        limit: 20
      });

      return res.status(200).json({
        success: true,
        data: historique
      });

    } catch (error) {
      console.error('Erreur getHistorique:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération de l\'historique'
      });
    }
  };

  getReservationsFutures = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const reservations = await Reservation.findAll({
        where: {
          chambreId: id,
          statut: { [Op.notIn]: ['ANNULEE', 'NO_SHOW', 'TERMINEE'] },
          dateArrivee: { [Op.gte]: new Date() }
        },
        include: [
          {
            model: Client,
            as: 'client',
            attributes: ['nom', 'prenom', 'email', 'telephone']
          }
        ],
        order: [['dateArrivee', 'ASC']]
      });

      return res.status(200).json({
        success: true,
        data: reservations
      });

    } catch (error) {
      console.error('Erreur getReservationsFutures:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des réservations futures'
      });
    }
  };

  getArriveesDepartsJour = async (req: Request, res: Response) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const reservations = await Reservation.findAll({
        where: {
          statut: { [Op.in]: ['CONFIRMEE', 'EN_ATTENTE_ACOMPTE'] },
          [Op.or]: [
            {
              dateArrivee: { [Op.gte]: today, [Op.lt]: tomorrow }
            },
            {
              dateDepart: { [Op.gte]: today, [Op.lt]: tomorrow }
            }
          ]
        },
        include: [
          {
            model: Client,
            as: 'client',
            attributes: ['nom', 'prenom', 'email', 'telephone']
          },
          {
            model: Room,
            as: 'chambre',
            attributes: ['numero', 'nom'],
            where: EXCLURE_CHAMBRE_VELO,
            required: true
          }
        ],
        order: [['dateArrivee', 'ASC']]
      });

      const arrivees = reservations.filter(r =>
        r.dateArrivee >= today && r.dateArrivee < tomorrow
      );

      const departs = reservations.filter(r =>
        r.dateDepart >= today && r.dateDepart < tomorrow
      );

      return res.status(200).json({
        success: true,
        data: {
          date: today.toISOString().split('T')[0],
          arrivees,
          departs,
          nbArrivees: arrivees.length,
          nbDeparts: departs.length
        }
      });

    } catch (error) {
      console.error('Erreur getArriveesDepartsJour:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des arrivées/départs du jour'
      });
    }
  };

  getChambresAvecOccupation = async (req: Request, res: Response) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const chambres = await Room.findAll({
        where: EXCLURE_CHAMBRE_VELO,
        include: [
          {
            model: Equipment,
            as: 'equipements',
            through: { attributes: [] }
          },
          {
            model: Tariff,
            as: 'tarifs',
            order: [['saison', 'ASC']]
          }
        ],
        order: [['numero', 'ASC']]
      });

      const reservationsActives = await Reservation.findAll({
        where: {
          statut: { [Op.in]: ['CONFIRMEE', 'EN_ATTENTE_ACOMPTE'] },
          dateDepart: { [Op.gte]: today }
        },
        include: [
          {
            model: Client,
            as: 'client',
            attributes: ['nom', 'prenom']
          },
          {
            model: Room,
            as: 'chambre',
            attributes: ['id', 'nom', 'numero'],
            where: EXCLURE_CHAMBRE_VELO,
            required: true
          }
        ],
        order: [['dateArrivee', 'ASC']]
      });

      const blocagesActifs = await RoomBlock.findAll({
        where: {
          dateFin: { [Op.gte]: today }
        },
        include: [
          {
            model: Room,
            as: 'chambre',
            attributes: [],
            where: EXCLURE_CHAMBRE_VELO,
            required: true
          }
        ]
      });

      const stats = {
        total: chambres.length,
        disponibles: 0,
        occupees: 0,
        maintenance: 0,
        bloques: 0,
        tauxOccupationGlobal: 0,
        revenusMois: 0
      };

      const formattedChambres = await Promise.all(chambres.map(async chambre => {
        const chambreJson = chambre.toJSON();

        const chambreReservations = reservationsActives.filter(r => r.chambreId === chambre.id);
        const statutAffichage = await this.calculerStatutAffichage(chambre, chambreReservations);

        const reservationEnCours = chambreReservations.find(r => {
          const arrivee = new Date(r.dateArrivee);
          const depart = new Date(r.dateDepart);
          return today >= arrivee && today < depart;
        });

        const prochaineReservation = chambreReservations
          .filter(r => new Date(r.dateArrivee) >= today)
          .sort((a, b) => new Date(a.dateArrivee).getTime() - new Date(b.dateArrivee).getTime())[0] || null;

        const chambreBlocages = blocagesActifs.filter(b => b.chambreId === chambre.id);

        const tarifs = chambreJson.tarifs || [];
        const tarifsBySaison: Record<string, any> = {};
        tarifs.forEach((t: any) => {
          const saison = t.saison || 'MOYENNE';
          tarifsBySaison[saison] = {
            prixBase: t.prixBase || 0,
            prixWeekend: t.prixBase ? t.prixBase * (t.coeffWeekend || 1.15) : 0,
            prixEnfant: t.prixEnfant || 10,
            prixLitSupplementaire: t.prixLitSupplementaire || 20,
            prixPetitDejeuner: t.prixPetitDejeuner || 15,
            coeffWeekend: t.coeffWeekend || 1.15,
            coeffDegressif: t.coeffDegressif5Nuits || 0.9
          };
        });

        const defaultTarif = {
          prixBase: 85,
          prixWeekend: 95,
          prixEnfant: 10,
          prixLitSupplementaire: 20,
          prixPetitDejeuner: 15,
          coeffWeekend: 1.15,
          coeffDegressif: 0.9
        };

        const currentSeason = this.determinerSaison(new Date());
        const currentTarif = tarifsBySaison[currentSeason] || tarifsBySaison['MOYENNE'] || defaultTarif;

        const estOccupee = chambreReservations.some(r => {
          if (r.statut !== 'CONFIRMEE' && r.statut !== 'EN_ATTENTE_ACOMPTE') return false;
          return new Date(r.dateDepart) >= today;
        });
        const equipementsList = chambreJson.equipements?.map((e: any) => e.nom) || [];

        // ✅ Récupérer les codes promo actifs
        const codesPromoActifs = await this.getActivePromoCodesForChambre(chambre.id);

        if (statutAffichage === 'DISPONIBLE' && !estOccupee) stats.disponibles++;
        else if (estOccupee) stats.occupees++;
        else if (statutAffichage === 'EN_MAINTENANCE' || statutAffichage === 'HORS_SERVICE') stats.maintenance++;
        else if (statutAffichage === 'BLOQUEE') stats.bloques++;

        let joursDisponiblesConsecutifs = 0;
        if (!estOccupee && statutAffichage === 'DISPONIBLE') {
          let dateTest = new Date(today);
          while (joursDisponiblesConsecutifs < 30) {
            const testFin = new Date(dateTest);
            testFin.setDate(testFin.getDate() + 1);

            const estDispo = !chambreReservations.some(r => {
              const a = new Date(r.dateArrivee);
              const d = new Date(r.dateDepart);
              return dateTest < d && a < testFin;
            });

            if (!estDispo) break;
            joursDisponiblesConsecutifs++;
            dateTest = testFin;
          }
        }

        return {
          ...chambreJson,
          statut: statutAffichage,
          equipements: equipementsList,
          tarif_base: currentTarif.prixBase,
          tarif_weekend: currentTarif.prixWeekend,
          tarif_enfant: currentTarif.prixEnfant,
          tarif_lit_supp: currentTarif.prixLitSupplementaire,
          tarif_petit_dejeuner: currentTarif.prixPetitDejeuner,
          tarifs_complets: tarifsBySaison,
          saison_actuelle: currentSeason,
          estOccupeeActuellement: estOccupee,
          occupationActuelle: reservationEnCours ? {
            reservationId: reservationEnCours.id,
            clientNom: `${reservationEnCours.client?.prenom || ''} ${reservationEnCours.client?.nom || ''}`,
            dateArrivee: reservationEnCours.dateArrivee,
            dateDepart: reservationEnCours.dateDepart,
            joursRestants: Math.ceil((new Date(reservationEnCours.dateDepart).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          } : null,
          prochaineReservation: prochaineReservation ? {
            id: prochaineReservation.id,
            clientNom: `${prochaineReservation.client?.prenom || ''} ${prochaineReservation.client?.nom || ''}`,
            dateArrivee: prochaineReservation.dateArrivee,
            dateDepart: prochaineReservation.dateDepart,
            nbNuits: Math.ceil((new Date(prochaineReservation.dateDepart).getTime() - new Date(prochaineReservation.dateArrivee).getTime()) / (1000 * 60 * 60 * 24))
          } : null,
          reservationsActuelles: chambreReservations.map(r => ({
            id: r.id,
            chambreId: r.chambreId,
            dateArrivee: r.dateArrivee,
            dateDepart: r.dateDepart,
            statut: r.statut,
            client_nom: r.client?.nom || '',
            client_prenom: r.client?.prenom || ''
          })),
          blocagesActifs: chambreBlocages,
          joursDisponiblesConsecutifs,
          codesPromoActifs: codesPromoActifs
        };
      }));

      const totalNuits = chambres.reduce((total, c) => {
        const resas = reservationsActives.filter(r => r.chambreId === c.id);
        return total + resas.reduce((sum, r) => {
          const a = new Date(r.dateArrivee);
          const d = new Date(r.dateDepart);
          return sum + Math.ceil((d.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
        }, 0);
      }, 0);

      stats.tauxOccupationGlobal = Math.round((totalNuits / (chambres.length * 30)) * 100);

      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

      // ✅ Exclu également les réservations "fantômes" de vélos/transferts
      // du calcul des revenus du mois de la page Chambres (chambreId de la
      // chambre virtuelle exclu via la sous-requête sur Room).
      const chambreVeloIds = (await Room.findAll({
        where: { [Op.or]: [{ numero: 'VELO-0' }, { nom: 'LOCATION_VELO' }] },
        attributes: ['id']
      })).map(r => r.id);

      const reservationsDuMois = await Reservation.findAll({
        where: {
          statut: { [Op.notIn]: ['ANNULEE'] },
          dateArrivee: { [Op.gte]: startOfMonth, [Op.lte]: endOfMonth },
          ...(chambreVeloIds.length > 0 ? { chambreId: { [Op.notIn]: chambreVeloIds } } : {})
        },
        attributes: ['id', 'montantTotal', 'dateArrivee', 'statut']
      });

      stats.revenusMois = Math.round(
        reservationsDuMois.reduce((sum, r) => sum + (Number(r.montantTotal) || 0), 0) * 100
      ) / 100;

      const prochainesArrivees = reservationsActives
        .filter(r => {
          const a = new Date(r.dateArrivee);
          const diff = Math.ceil((a.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return diff >= 0 && diff <= 7;
        })
        .sort((a, b) => new Date(a.dateArrivee).getTime() - new Date(b.dateArrivee).getTime())
        .slice(0, 5)
        .map(r => ({
          id: r.id,
          chambreNom: r.chambre?.nom || '',
          clientNom: `${r.client?.prenom || ''} ${r.client?.nom || ''}`,
          dateArrivee: r.dateArrivee
        }));

      const prochainsDeparts = reservationsActives
        .filter(r => {
          const d = new Date(r.dateDepart);
          const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return diff >= 0 && diff <= 3;
        })
        .sort((a, b) => new Date(a.dateDepart).getTime() - new Date(b.dateDepart).getTime())
        .slice(0, 5)
        .map(r => ({
          id: r.id,
          chambreNom: r.chambre?.nom || '',
          clientNom: `${r.client?.prenom || ''} ${r.client?.nom || ''}`,
          dateDepart: r.dateDepart
        }));

      const reservationsActuellesGlobal = reservationsActives.map(r => ({
        id: r.id,
        chambreId: r.chambreId,
        dateArrivee: r.dateArrivee,
        dateDepart: r.dateDepart,
        statut: r.statut,
        client_nom: r.client?.nom || '',
        client_prenom: r.client?.prenom || ''
      }));

      // ✅ Récupérer les codes promo actifs pour toutes les chambres
      const allCodesPromo = await PromoCode.findAll({
        where: {
          actif: true,
          dateDebut: { [Op.lte]: today },
          dateFin: { [Op.gte]: today }
        }
      });

      return res.status(200).json({
        success: true,
        data: {
          chambres: formattedChambres,
          reservationsActuelles: reservationsActuellesGlobal,
          statistiques: stats,
          prochainesArrivees,
          prochainsDeparts,
          codesPromoActifs: allCodesPromo
        }
      });

    } catch (error) {
      console.error('❌ Erreur getChambresAvecOccupation:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des chambres avec occupation'
      });
    }
  };

  /**
   * ✅ AJOUT : Appliquer un code promo à une chambre
   */
  appliquerPromo = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { code } = req.body;

      if (!code) {
        return res.status(400).json({
          success: false,
          message: 'Le code promo est requis'
        });
      }

      const chambre = await Room.findByPk(id);
      if (!chambre) {
        return res.status(404).json({
          success: false,
          message: 'Chambre non trouvée'
        });
      }

      const promo = await PromoCode.findOne({
        where: {
          code: { [Op.iLike]: code.toUpperCase() },
          actif: true,
          dateDebut: { [Op.lte]: new Date() },
          dateFin: { [Op.gte]: new Date() }
        }
      });

      if (!promo) {
        return res.status(404).json({
          success: false,
          message: 'Code promo invalide ou expiré'
        });
      }

      // Vérifier si le code a atteint son nombre d'utilisations maximum
      if (promo.nbUtilisationsMax && promo.nbUtilisations >= promo.nbUtilisationsMax) {
        return res.status(400).json({
          success: false,
          message: 'Ce code promo a atteint son nombre maximum d\'utilisations'
        });
      }

      // Incrémenter le nombre d'utilisations
      await promo.increment('nbUtilisations');

      // ✅ Émettre un événement WebSocket
      const wsManager = (req as any).wsManager as WebSocketManager;
      if (wsManager) {
        wsManager.broadcastToAll({
          type: 'REFRESH_CHAMBRES',
          data: { reason: 'promo_applied', chambreId: id, code: promo.code },
          timestamp: new Date().toISOString()
        });
      }

      return res.status(200).json({
        success: true,
        message: `Code promo ${promo.code} appliqué avec succès`,
        data: {
          promo: {
            id: promo.id,
            code: promo.code,
            description: promo.description,
            tauxReduction: promo.tauxReduction,
            reductionFixe: promo.reductionFixe,
            nbUtilisations: promo.nbUtilisations,
            nbUtilisationsMax: promo.nbUtilisationsMax
          }
        }
      });

    } catch (error) {
      console.error('Erreur appliquerPromo:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'application du code promo'
      });
    }
  };

  /**
   * ✅ AJOUT : Récupérer tous les codes promo actifs
   * ✅ CORRECTION : mêmes noms de colonnes SQL réels (snake_case) dans Sequelize.col()
   */
  getActivePromoCodes = async (req: Request, res: Response) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const promos = await PromoCode.findAll({
        where: {
          actif: true,
          dateDebut: { [Op.lte]: today },
          dateFin: { [Op.gte]: today },
          [Op.or]: [
            { nbUtilisationsMax: null },
            Sequelize.where(
              Sequelize.col('nb_utilisations'),
              Op.lt,
              Sequelize.col('nb_utilisations_max')
            )
          ]
        },
        order: [['created_at', 'DESC']]
      });

      return res.status(200).json({
        success: true,
        data: promos
      });

    } catch (error) {
      console.error('Erreur getActivePromoCodes:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des codes promo'
      });
    }
  };
}

export default new ChambresController();