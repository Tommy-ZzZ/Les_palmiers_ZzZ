// E:\Projets\les-palmiers\backend\src\controllers\clients.controller.ts

import { Request, Response } from 'express';
import { Op } from 'sequelize';
import Client, { StatutClient, SegmentClient, OrigineGeo, CanalAcquisition } from '../models/Client';
import Reservation, { StatutReservation } from '../models/Reservation';
import Room from '../models/Room';

export class ClientsController {
  
  // ─── Récupérer tous les clients avec statistiques ───
  async getAll(req: Request, res: Response) {
    try {
      console.log('[ClientsController] getAll - Début');
      
      const { search, statut, page = 1, limit = 15 } = req.query;

      const where: any = {};

      if (search) {
        where[Op.or] = [
          { nom: { [Op.iLike]: `%${search}%` } },
          { prenom: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } }
        ];
      }

      if (statut) {
        where.statut = statut;
      }

      const offset = (Number(page) - 1) * Number(limit);

      console.log('[ClientsController] getAll - Fetching clients...');
      
      const { count, rows } = await Client.findAndCountAll({
        where,
        order: [['nom', 'ASC'], ['prenom', 'ASC']],
        limit: Number(limit),
        offset
      });

      console.log(`[ClientsController] getAll - ${rows.length} clients trouvés`);

      // Calculer les statistiques pour chaque client
      const clientsWithStats = [];
      
      for (const client of rows) {
        try {
          const clientData = client.toJSON();
          
          // Compter les réservations
          const reservationCount = await Reservation.count({
            where: {
              clientId: client.id,
              statut: {
                [Op.in]: ['CONFIRMEE', 'EN_COURS', 'TERMINEE']
              }
            }
          });
          
          // Calculer le montant total
          const reservations = await Reservation.findAll({
            where: {
              clientId: client.id,
              statut: {
                [Op.in]: ['CONFIRMEE', 'EN_COURS', 'TERMINEE']
              }
            },
            attributes: ['montantTotal']
          });
          
          let montantTotal = 0;
          for (const r of reservations) {
            montantTotal += Number(r.montantTotal || 0);
          }
          
          const nbSejours = reservationCount;
          const estGroupe = clientData.estGroupe || false;
          
          // Déterminer le statut
          let statutClient: 'VIP' | 'REGULIER' | 'NOUVEAU' = 'NOUVEAU';
          if (estGroupe || nbSejours >= 3) statutClient = 'VIP';
          else if (nbSejours >= 2) statutClient = 'REGULIER';
          
          clientsWithStats.push({
            id: clientData.id,
            civilite: clientData.civilite,
            nom: clientData.nom,
            prenom: clientData.prenom,
            email: clientData.email,
            telephone: clientData.telephone,
            adresse: clientData.adresse,
            code_postal: clientData.codePostal,
            ville: clientData.ville,
            pays: clientData.pays,
            statut: statutClient,
            segment: clientData.segment,
            origine_geographique: clientData.origineGeo,
            canal_acquisition: clientData.canalAcquisition,
            nb_sejours: nbSejours,
            montant_total_depense: montantTotal,
            date_creation: clientData.dateCreation,
            date_modification: clientData.updated_at,
            vip: estGroupe || nbSejours >= 3,
            allergies: clientData.allergies || '',
            regime_alimentaire: clientData.regimeAlimentaire || '',
            chambre_preferee: clientData.chambrePreferee || '',
            commentaire: clientData.commentairesPrives || ''
          });
        } catch (clientError) {
          console.error(`[ClientsController] Erreur pour client ${client.id}:`, clientError);
          // Continuer avec les autres clients
        }
      }

      console.log(`[ClientsController] getAll - ${clientsWithStats.length} clients traités`);

      return res.status(200).json({
        success: true,
        data: clientsWithStats,
        pagination: {
          total: count,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(count / Number(limit))
        }
      });

    } catch (error) {
      console.error('[ClientsController] getAll - Erreur:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des clients',
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    }
  }

  // ─── Rechercher des clients (pour l'autocomplétion) ───
  async search(req: Request, res: Response) {
    try {
      const { q } = req.query;
      
      if (!q || typeof q !== 'string' || q.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'La recherche doit contenir au moins 2 caractères'
        });
      }

      console.log(`[ClientsController] search - Recherche: "${q}"`);

      const clients = await Client.findAll({
        where: {
          [Op.or]: [
            { nom: { [Op.iLike]: `%${q}%` } },
            { prenom: { [Op.iLike]: `%${q}%` } },
            { email: { [Op.iLike]: `%${q}%` } },
            { telephone: { [Op.iLike]: `%${q}%` } }
          ]
        },
        limit: 10,
        attributes: [
          'id', 'civilite', 'nom', 'prenom', 'telephone', 'email',
          'statut', 'estGroupe', 'nbSejoursRealises', 'montantTotalPaye',
          'allergies', 'regimeAlimentaire', 'chambrePreferee', 'commentairesPrives'
        ]
      });

      // Ajouter le champ vip pour le frontend
      const clientsWithVip = clients.map(client => {
        const data = client.toJSON();
        const nbSejours = data.nbSejoursRealises || 0;
        const estGroupe = data.estGroupe || false;
        return {
          ...data,
          vip: estGroupe || nbSejours >= 3,
          nb_sejours: nbSejours,
          allergies: data.allergies || '',
          regime_alimentaire: data.regimeAlimentaire || '',
          chambre_preferee: data.chambrePreferee || '',
          commentaire: data.commentairesPrives || ''
        };
      });

      return res.status(200).json({
        success: true,
        data: clientsWithVip
      });

    } catch (error) {
      console.error('Erreur search clients:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la recherche des clients'
      });
    }
  }

  // ─── Récupérer un client avec ses statistiques (CORRIGÉ) ───
  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      // ✅ VALIDATION DE L'ID
      const clientId = parseInt(id, 10);
      if (isNaN(clientId) || clientId <= 0) {
        return res.status(400).json({
          success: false,
          message: 'ID client invalide'
        });
      }

      console.log(`[ClientsController] getById - Récupération client ${clientId}`);

      // ✅ Recherche avec les attributs complets incluant allergies, régime, chambre préférée, commentaires
      const client = await Client.findByPk(clientId, {
        attributes: [
          'id', 'civilite', 'nom', 'prenom', 'telephone', 'email',
          'adresse', 'codePostal', 'ville', 'pays', 'segment',
          'origineGeo', 'canalAcquisition', 'statut', 'estGroupe',
          'nbSejoursRealises', 'montantTotalPaye', 'dateCreation',
          'updated_at', 'allergies', 'regimeAlimentaire',
          'chambrePreferee', 'commentairesPrives'
        ]
      });

      if (!client) {
        return res.status(404).json({
          success: false,
          message: 'Client non trouvé'
        });
      }

      // Compter les réservations
      const reservationCount = await Reservation.count({
        where: {
          clientId: client.id,
          statut: {
            [Op.in]: ['CONFIRMEE', 'EN_COURS', 'TERMINEE']
          }
        }
      });
      
      // Calculer le montant total
      const reservations = await Reservation.findAll({
        where: {
          clientId: client.id,
          statut: {
            [Op.in]: ['CONFIRMEE', 'EN_COURS', 'TERMINEE']
          }
        },
        attributes: ['montantTotal']
      });
      
      let montantTotal = 0;
      for (const r of reservations) {
        montantTotal += Number(r.montantTotal || 0);
      }

      const clientData = client.toJSON();
      const nbSejours = reservationCount;
      const estGroupe = clientData.estGroupe || false;
      
      let statutClient: 'VIP' | 'REGULIER' | 'NOUVEAU' = 'NOUVEAU';
      if (estGroupe || nbSejours >= 3) statutClient = 'VIP';
      else if (nbSejours >= 2) statutClient = 'REGULIER';

      // ✅ Retourner TOUTES les données du client incluant allergies, régime, chambre préférée, commentaires
      return res.status(200).json({
        success: true,
        data: {
          id: clientData.id,
          civilite: clientData.civilite,
          nom: clientData.nom,
          prenom: clientData.prenom,
          email: clientData.email,
          telephone: clientData.telephone,
          adresse: clientData.adresse,
          code_postal: clientData.codePostal,
          ville: clientData.ville,
          pays: clientData.pays,
          statut: statutClient,
          segment: clientData.segment,
          origine_geographique: clientData.origineGeo,
          canal_acquisition: clientData.canalAcquisition,
          nb_sejours: nbSejours,
          montant_total_depense: montantTotal,
          date_creation: clientData.dateCreation,
          date_modification: clientData.updated_at,
          vip: estGroupe || nbSejours >= 3,
          // ✅ AJOUT DES CHAMPS MANQUANTS
          allergies: clientData.allergies || '',
          regime_alimentaire: clientData.regimeAlimentaire || '',
          chambre_preferee: clientData.chambrePreferee || '',
          commentaire: clientData.commentairesPrives || ''
        }
      });

    } catch (error) {
      console.error('Erreur getById client:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération'
      });
    }
  }

  // ─── Récupérer l'historique des réservations ───
  async getHistorique(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      // ✅ VALIDATION DE L'ID
      const clientId = parseInt(id, 10);
      if (isNaN(clientId) || clientId <= 0) {
        return res.status(400).json({
          success: false,
          message: 'ID client invalide'
        });
      }

      const reservations = await Reservation.findAll({
        where: { clientId },
        include: [
          { 
            model: Room, 
            as: 'chambre',
            attributes: ['id', 'nom', 'numero']
          }
        ],
        order: [['dateArrivee', 'DESC']]
      });

      return res.status(200).json({
        success: true,
        data: reservations
      });

    } catch (error) {
      console.error('Erreur getHistorique:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération de l\'historique'
      });
    }
  }

  // ─── Détail complet client (CORRIGÉ) ───
  async getDetail(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      // ✅ VALIDATION DE L'ID
      const clientId = parseInt(id, 10);
      if (isNaN(clientId) || clientId <= 0) {
        return res.status(400).json({
          success: false,
          message: 'ID client invalide'
        });
      }
      
      const client = await Client.findByPk(clientId, {
        attributes: [
          'id', 'civilite', 'nom', 'prenom', 'telephone', 'email',
          'adresse', 'codePostal', 'ville', 'pays', 'segment',
          'origineGeo', 'canalAcquisition', 'statut', 'estGroupe',
          'nbSejoursRealises', 'montantTotalPaye', 'dateCreation',
          'updated_at', 'allergies', 'regimeAlimentaire',
          'chambrePreferee', 'commentairesPrives'
        ]
      });

      if (!client) {
        return res.status(404).json({
          success: false,
          message: 'Client non trouvé'
        });
      }

      // Compter les réservations
      const reservationCount = await Reservation.count({
        where: {
          clientId: client.id,
          statut: {
            [Op.in]: ['CONFIRMEE', 'EN_COURS', 'TERMINEE']
          }
        }
      });
      
      // Calculer le montant total
      const reservations = await Reservation.findAll({
        where: {
          clientId: client.id,
          statut: {
            [Op.in]: ['CONFIRMEE', 'EN_COURS', 'TERMINEE']
          }
        },
        attributes: ['montantTotal']
      });
      
      let montantTotal = 0;
      for (const r of reservations) {
        montantTotal += Number(r.montantTotal || 0);
      }

      // Récupérer les réservations avec détails
      const reservationsWithDetails = await Reservation.findAll({
        where: { clientId },
        include: [
          { 
            model: Room, 
            as: 'chambre',
            attributes: ['id', 'nom', 'numero']
          }
        ],
        order: [['dateArrivee', 'DESC']],
        limit: 20
      });

      const clientData = client.toJSON();
      const nbSejours = reservationCount;
      const estGroupe = clientData.estGroupe || false;
      
      let statutClient: 'VIP' | 'REGULIER' | 'NOUVEAU' = 'NOUVEAU';
      if (estGroupe || nbSejours >= 3) statutClient = 'VIP';
      else if (nbSejours >= 2) statutClient = 'REGULIER';

      return res.status(200).json({
        success: true,
        data: {
          client: {
            id: clientData.id,
            civilite: clientData.civilite,
            nom: clientData.nom,
            prenom: clientData.prenom,
            email: clientData.email,
            telephone: clientData.telephone,
            adresse: clientData.adresse,
            code_postal: clientData.codePostal,
            ville: clientData.ville,
            pays: clientData.pays,
            statut: statutClient,
            segment: clientData.segment,
            origine_geographique: clientData.origineGeo,
            canal_acquisition: clientData.canalAcquisition,
            nb_sejours: nbSejours,
            montant_total_depense: montantTotal,
            date_creation: clientData.dateCreation,
            date_modification: clientData.updated_at,
            vip: estGroupe || nbSejours >= 3,
            // ✅ AJOUT DES CHAMPS MANQUANTS
            allergies: clientData.allergies || '',
            regime_alimentaire: clientData.regimeAlimentaire || '',
            chambre_preferee: clientData.chambrePreferee || '',
            commentaire: clientData.commentairesPrives || ''
          },
          reservations: reservationsWithDetails.map(r => ({
            id: r.id,
            numero_reservation: r.numero,
            date_arrivee: r.dateArrivee,
            date_depart: r.dateDepart,
            chambre_nom: (r as any).chambre?.nom || '—',
            montant_total: r.montantTotal,
            statut: r.statut
          })),
          enfants: []
        }
      });

    } catch (error) {
      console.error('Erreur getDetail:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération du détail'
      });
    }
  }

  // ─── Statistiques globales clients ───
  async getStats(req: Request, res: Response) {
    try {
      const total = await Client.count();
      
      const allClients = await Client.findAll();
      let vipCount = 0;
      let regulierCount = 0;
      let nouveauCount = 0;
      let totalDepenses = 0;

      for (const client of allClients) {
        // Compter les réservations
        const reservationCount = await Reservation.count({
          where: {
            clientId: client.id,
            statut: {
              [Op.in]: ['CONFIRMEE', 'EN_COURS', 'TERMINEE']
            }
          }
        });
        
        // Calculer le montant total
        const reservations = await Reservation.findAll({
          where: {
            clientId: client.id,
            statut: {
              [Op.in]: ['CONFIRMEE', 'EN_COURS', 'TERMINEE']
            }
          },
          attributes: ['montantTotal']
        });
        
        let montantTotal = 0;
        for (const r of reservations) {
          montantTotal += Number(r.montantTotal || 0);
        }
        
        totalDepenses += montantTotal;
        
        const nbSejours = reservationCount;
        const estGroupe = client.estGroupe || false;
        
        if (estGroupe || nbSejours >= 3) vipCount++;
        else if (nbSejours >= 2) regulierCount++;
        else nouveauCount++;
      }

      return res.status(200).json({
        success: true,
        data: {
          total,
          vip: vipCount,
          regulier: regulierCount,
          nouveau: nouveauCount,
          totalDepenses
        }
      });

    } catch (error) {
      console.error('Erreur getStats:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des statistiques'
      });
    }
  }

  // ─── Créer un client ───
  async create(req: Request, res: Response) {
    try {
      console.log('[ClientsController] create - Création client:', req.body);

      const clientData = {
        civilite: req.body.civilite,
        nom: req.body.nom,
        prenom: req.body.prenom,
        email: req.body.email,
        telephone: req.body.telephone,
        adresse: req.body.adresse,
        codePostal: req.body.code_postal,
        ville: req.body.ville,
        pays: req.body.pays || 'France',
        segment: req.body.segment || SegmentClient.TOURISTE_INDIVIDUEL,
        origineGeo: req.body.origine_geographique || OrigineGeo.METROPOLE,
        canalAcquisition: req.body.canal_acquisition || CanalAcquisition.DIRECT,
        statut: StatutClient.NOUVEAU,
        estGroupe: req.body.vip || false,
        nbSejoursRealises: 0,
        montantTotalPaye: 0,
        // ✅ AJOUT DES CHAMPS MANQUANTS
        allergies: req.body.allergies || '',
        regimeAlimentaire: req.body.regime_alimentaire || '',
        chambrePreferee: req.body.chambre_preferee || '',
        commentairesPrives: req.body.commentaire || req.body.notes || ''
      };

      const client = await Client.create(clientData);

      return res.status(201).json({
        success: true,
        message: 'Client créé avec succès',
        data: {
          id: client.id,
          civilite: client.civilite,
          nom: client.nom,
          prenom: client.prenom,
          email: client.email,
          telephone: client.telephone,
          adresse: client.adresse,
          code_postal: client.codePostal,
          ville: client.ville,
          pays: client.pays,
          statut: StatutClient.NOUVEAU,
          segment: client.segment,
          origine_geographique: client.origineGeo,
          canal_acquisition: client.canalAcquisition,
          nb_sejours: 0,
          montant_total_depense: 0,
          date_creation: client.dateCreation,
          date_modification: client.updated_at,
          vip: client.estGroupe,
          // ✅ AJOUT DES CHAMPS MANQUANTS
          allergies: client.allergies || '',
          regime_alimentaire: client.regimeAlimentaire || '',
          chambre_preferee: client.chambrePreferee || '',
          commentaire: client.commentairesPrives || ''
        }
      });

    } catch (error: any) {
      console.error('Erreur create client:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Erreur lors de la création'
      });
    }
  }

  // ─── Mettre à jour un client ───
  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      // ✅ VALIDATION DE L'ID
      const clientId = parseInt(id, 10);
      if (isNaN(clientId) || clientId <= 0) {
        return res.status(400).json({
          success: false,
          message: 'ID client invalide'
        });
      }
      
      const client = await Client.findByPk(clientId);

      if (!client) {
        return res.status(404).json({
          success: false,
          message: 'Client non trouvé'
        });
      }

      const updateData: any = {
        civilite: req.body.civilite,
        nom: req.body.nom,
        prenom: req.body.prenom,
        email: req.body.email,
        telephone: req.body.telephone,
        adresse: req.body.adresse,
        codePostal: req.body.code_postal,
        ville: req.body.ville,
        pays: req.body.pays,
        segment: req.body.segment,
        origineGeo: req.body.origine_geographique,
        canalAcquisition: req.body.canal_acquisition,
        estGroupe: req.body.vip,
        // ✅ AJOUT DES CHAMPS MANQUANTS
        allergies: req.body.allergies,
        regimeAlimentaire: req.body.regime_alimentaire,
        chambrePreferee: req.body.chambre_preferee,
        commentairesPrives: req.body.commentaire || req.body.notes
      };

      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) delete updateData[key];
      });

      await client.update(updateData);

      // Compter les réservations
      const reservationCount = await Reservation.count({
        where: {
          clientId: client.id,
          statut: {
            [Op.in]: ['CONFIRMEE', 'EN_COURS', 'TERMINEE']
          }
        }
      });
      
      // Calculer le montant total
      const reservations = await Reservation.findAll({
        where: {
          clientId: client.id,
          statut: {
            [Op.in]: ['CONFIRMEE', 'EN_COURS', 'TERMINEE']
          }
        },
        attributes: ['montantTotal']
      });
      
      let montantTotal = 0;
      for (const r of reservations) {
        montantTotal += Number(r.montantTotal || 0);
      }

      const clientData = client.toJSON();
      const nbSejours = reservationCount;
      const estGroupe = clientData.estGroupe || false;
      
      let statutClient: 'VIP' | 'REGULIER' | 'NOUVEAU' = 'NOUVEAU';
      if (estGroupe || nbSejours >= 3) statutClient = 'VIP';
      else if (nbSejours >= 2) statutClient = 'REGULIER';

      return res.status(200).json({
        success: true,
        message: 'Client mis à jour avec succès',
        data: {
          id: clientData.id,
          civilite: clientData.civilite,
          nom: clientData.nom,
          prenom: clientData.prenom,
          email: clientData.email,
          telephone: clientData.telephone,
          adresse: clientData.adresse,
          code_postal: clientData.codePostal,
          ville: clientData.ville,
          pays: clientData.pays,
          statut: statutClient,
          segment: clientData.segment,
          origine_geographique: clientData.origineGeo,
          canal_acquisition: clientData.canalAcquisition,
          nb_sejours: nbSejours,
          montant_total_depense: montantTotal,
          date_creation: clientData.dateCreation,
          date_modification: clientData.updated_at,
          vip: estGroupe || nbSejours >= 3,
          // ✅ AJOUT DES CHAMPS MANQUANTS
          allergies: clientData.allergies || '',
          regime_alimentaire: clientData.regimeAlimentaire || '',
          chambre_preferee: clientData.chambrePreferee || '',
          commentaire: clientData.commentairesPrives || ''
        }
      });

    } catch (error: any) {
      console.error('Erreur update client:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Erreur lors de la mise à jour'
      });
    }
  }

  // ─── Supprimer un client ───
  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      // ✅ VALIDATION DE L'ID
      const clientId = parseInt(id, 10);
      if (isNaN(clientId) || clientId <= 0) {
        return res.status(400).json({
          success: false,
          message: 'ID client invalide'
        });
      }
      
      const client = await Client.findByPk(clientId);

      if (!client) {
        return res.status(404).json({
          success: false,
          message: 'Client non trouvé'
        });
      }

      const reservations = await Reservation.count({ where: { clientId } });
      if (reservations > 0) {
        return res.status(400).json({
          success: false,
          message: 'Impossible de supprimer ce client car il a des réservations'
        });
      }

      await client.destroy();

      return res.status(200).json({
        success: true,
        message: 'Client supprimé avec succès'
      });

    } catch (error) {
      console.error('Erreur delete client:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression'
      });
    }
  }

  // ─── Export RGPD ───
  async exportRgpd(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      // ✅ VALIDATION DE L'ID
      const clientId = parseInt(id, 10);
      if (isNaN(clientId) || clientId <= 0) {
        return res.status(400).json({
          success: false,
          message: 'ID client invalide'
        });
      }
      
      const client = await Client.findByPk(clientId, {
        attributes: [
          'id', 'civilite', 'nom', 'prenom', 'telephone', 'email',
          'adresse', 'codePostal', 'ville', 'pays', 'segment',
          'origineGeo', 'canalAcquisition', 'statut', 'estGroupe',
          'nbSejoursRealises', 'montantTotalPaye', 'dateCreation',
          'updated_at', 'allergies', 'regimeAlimentaire',
          'chambrePreferee', 'commentairesPrives'
        ]
      });

      if (!client) {
        return res.status(404).json({
          success: false,
          message: 'Client non trouvé'
        });
      }

      // Compter les réservations
      const reservationCount = await Reservation.count({
        where: {
          clientId: client.id,
          statut: {
            [Op.in]: ['CONFIRMEE', 'EN_COURS', 'TERMINEE']
          }
        }
      });
      
      // Calculer le montant total
      const allReservations = await Reservation.findAll({
        where: {
          clientId: client.id,
          statut: {
            [Op.in]: ['CONFIRMEE', 'EN_COURS', 'TERMINEE']
          }
        },
        attributes: ['montantTotal']
      });
      
      let montantTotal = 0;
      for (const r of allReservations) {
        montantTotal += Number(r.montantTotal || 0);
      }

      const reservations = await Reservation.findAll({
        where: { clientId },
        include: [
          { model: Room, as: 'chambre' }
        ],
        order: [['dateArrivee', 'DESC']],
        limit: 100
      });

      const clientData = client.toJSON();
      const nbSejours = reservationCount;
      const estGroupe = clientData.estGroupe || false;
      
      let statutClient: 'VIP' | 'REGULIER' | 'NOUVEAU' = 'NOUVEAU';
      if (estGroupe || nbSejours >= 3) statutClient = 'VIP';
      else if (nbSejours >= 2) statutClient = 'REGULIER';

      return res.status(200).json({
        success: true,
        data: {
          date_export: new Date().toISOString(),
          client: {
            id: clientData.id,
            civilite: clientData.civilite,
            nom: clientData.nom,
            prenom: clientData.prenom,
            email: clientData.email,
            telephone: clientData.telephone,
            adresse: clientData.adresse,
            code_postal: clientData.codePostal,
            ville: clientData.ville,
            pays: clientData.pays,
            statut: statutClient,
            segment: clientData.segment,
            origine_geographique: clientData.origineGeo,
            canal_acquisition: clientData.canalAcquisition,
            date_creation: clientData.dateCreation,
            nb_sejours: nbSejours,
            montant_total_depense: montantTotal,
            vip: estGroupe || nbSejours >= 3,
            // ✅ AJOUT DES CHAMPS MANQUANTS
            allergies: clientData.allergies || '',
            regime_alimentaire: clientData.regimeAlimentaire || '',
            chambre_preferee: clientData.chambrePreferee || '',
            commentaire: clientData.commentairesPrives || ''
          },
          reservations: reservations.map(r => ({
            id: r.id,
            numero: r.numero,
            date_arrivee: r.dateArrivee,
            date_depart: r.dateDepart,
            chambre: (r as any).chambre ? {
              id: (r as any).chambre.id,
              nom: (r as any).chambre.nom,
              numero: (r as any).chambre.numero
            } : null,
            montant_total: r.montantTotal,
            statut: r.statut
          }))
        }
      });

    } catch (error) {
      console.error('Erreur exportRgpd:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'export RGPD'
      });
    }
  }
}