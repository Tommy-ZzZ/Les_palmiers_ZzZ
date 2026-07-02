import { Request, Response } from 'express';
import { Op } from 'sequelize';
import bcrypt from 'bcryptjs';
import {
  Reservation,
  Client,
  Room,
  User,
  Tariff,
  PromoCode,
  Payment,
  Invoice,
  AuditLog,
  EmailTemplate,
  ClientPreference
} from '../models';

export class AdminController {
  // ============================================
  // DASHBOARD & INDICATEURS (§3.7)
  // ============================================

  async getDashboard(req: Request, res: Response) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      const arriveesJour = await Reservation.count({
        where: {
          dateArrivee: {
            [Op.between]: [today, new Date(today.getTime() + 24 * 60 * 60 * 1000)]
          },
          statut: { [Op.notIn]: ['ANNULEE', 'NO_SHOW'] }
        }
      });

      const departsJour = await Reservation.count({
        where: {
          dateDepart: {
            [Op.between]: [today, new Date(today.getTime() + 24 * 60 * 60 * 1000)]
          },
          statut: { [Op.notIn]: ['ANNULEE', 'NO_SHOW'] }
        }
      });

      const reservationsMois = await Reservation.findAll({
        where: {
          dateArrivee: { [Op.between]: [startOfMonth, endOfMonth] },
          statut: { [Op.notIn]: ['ANNULEE', 'NO_SHOW'] }
        }
      });

      const totalChambres = await Room.count({ where: { statut: { [Op.notIn]: ['HORS_SERVICE'] } } });
      const joursDansMois = endOfMonth.getDate();

      const nuitées = reservationsMois.reduce((total, r) => {
        const arrivee = new Date(r.dateArrivee);
        const depart = new Date(r.dateDepart);
        const nbNuits = Math.ceil((depart.getTime() - arrivee.getTime()) / (1000 * 60 * 60 * 24));
        return total + (nbNuits > 0 ? nbNuits : 1);
      }, 0);

      const tauxOccupation = totalChambres > 0 && joursDansMois > 0 
        ? (nuitées / (totalChambres * joursDansMois)) * 100 
        : 0;

      const chiffreAffaires = reservationsMois.reduce((total, r) => total + (r.montantTotal || 0), 0);

      const annulations = await Reservation.count({
        where: {
          statut: 'ANNULEE',
          dateAnnulation: { [Op.between]: [startOfMonth, endOfMonth] }
        }
      });

      const totalReservationsMois = reservationsMois.length + annulations;
      const tauxAnnulation = totalReservationsMois > 0 
        ? (annulations / totalReservationsMois) * 100 
        : 0;

      const dureeMoyenne = reservationsMois.length > 0 
        ? nuitées / reservationsMois.length 
        : 0;

      return res.status(200).json({
        success: true,
        data: {
          jour: {
            arrivees: arriveesJour,
            departs: departsJour,
            date: today
          },
          mois: {
            chiffreAffaires: Math.round(chiffreAffaires * 100) / 100,
            tauxOccupation: Math.round(tauxOccupation * 100) / 100,
            tauxAnnulation: Math.round(tauxAnnulation * 100) / 100,
            nombreReservations: reservationsMois.length,
            nuitées,
            dureeMoyenne: Math.round(dureeMoyenne * 10) / 10,
            totalChambres
          }
        }
      });

    } catch (error) {
      console.error('Erreur getDashboard:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération du tableau de bord'
      });
    }
  }

  // ============================================
  // REVPAR (§3.7.2)
  // ============================================

  async getRevPAR(req: Request, res: Response) {
    try {
      const { mois, annee } = req.query;
      const month = parseInt(mois as string) || new Date().getMonth() + 1;
      const year = parseInt(annee as string) || new Date().getFullYear();

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const totalChambres = await Room.count({ where: { statut: { [Op.notIn]: ['HORS_SERVICE'] } } });
      const joursDansMois = endDate.getDate();

      const reservations = await Reservation.findAll({
        where: {
          dateArrivee: { [Op.lte]: endDate },
          dateDepart: { [Op.gte]: startDate },
          statut: { [Op.notIn]: ['ANNULEE', 'NO_SHOW'] }
        }
      });

      const recettes = reservations.reduce((total, r) => total + (r.montantTotal || 0), 0);
      const capaciteTotale = totalChambres * joursDansMois;
      const revPAR = capaciteTotale > 0 ? recettes / capaciteTotale : 0;

      return res.status(200).json({
        success: true,
        data: {
          mois: month,
          annee: year,
          recettes: Math.round(recettes * 100) / 100,
          capaciteTotale,
          revPAR: Math.round(revPAR * 100) / 100
        }
      });

    } catch (error) {
      console.error('Erreur getRevPAR:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors du calcul du RevPAR'
      });
    }
  }

  // ============================================
  // GESTION DES TARIFS (§3.1.2 - RG2, RG7)
  // ============================================

  async getTarifs(req: Request, res: Response) {
    try {
      const tarifs = await Tariff.findAll({
        include: [
          { model: Room, as: 'chambre' }
        ],
        order: [['dateDebut', 'DESC']]
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
  }

  async createTarif(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      
      const { chambreId, prixBase, saison, dateDebut, dateFin } = req.body;
      if (!chambreId || !prixBase || !saison || !dateDebut) {
        return res.status(400).json({
          success: false,
          message: 'Champs requis: chambreId, prixBase, saison, dateDebut'
        });
      }

      const tarif = await Tariff.create({
        ...req.body,
        modifiePar: userId
      });

      await AuditLog.create({
        action: 'CREATE_TARIF',
        entite: 'Tariff',
        entiteId: tarif.id,
        utilisateurId: userId,
        nouvelleValeur: req.body
      });

      return res.status(201).json({
        success: true,
        message: 'Tarif créé avec succès',
        data: tarif
      });

    } catch (error) {
      console.error('Erreur createTarif:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la création du tarif'
      });
    }
  }

  async updateTarif(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      const tarif = await Tariff.findByPk(id);
      if (!tarif) {
        return res.status(404).json({
          success: false,
          message: 'Tarif non trouvé'
        });
      }

      const oldValues = tarif.toJSON();
      await tarif.update(req.body);

      await AuditLog.create({
        action: 'UPDATE_TARIF',
        entite: 'Tariff',
        entiteId: tarif.id,
        utilisateurId: userId,
        ancienneValeur: oldValues,
        nouvelleValeur: req.body
      });

      return res.status(200).json({
        success: true,
        message: 'Tarif mis à jour avec succès',
        data: tarif
      });

    } catch (error) {
      console.error('Erreur updateTarif:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour'
      });
    }
  }

  // ============================================
  // GESTION DES CODES PROMO
  // ============================================

  async getPromos(req: Request, res: Response) {
    try {
      const promos = await PromoCode.findAll({
        order: [['createdAt', 'DESC']]
      });

      return res.status(200).json({
        success: true,
        data: promos
      });

    } catch (error) {
      console.error('Erreur getPromos:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des codes promo'
      });
    }
  }

  async createPromo(req: Request, res: Response) {
    try {
      const promo = await PromoCode.create(req.body);

      return res.status(201).json({
        success: true,
        message: 'Code promo créé avec succès',
        data: promo
      });

    } catch (error) {
      console.error('Erreur createPromo:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la création du code promo'
      });
    }
  }

  async updatePromo(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const promo = await PromoCode.findByPk(id);

      if (!promo) {
        return res.status(404).json({
          success: false,
          message: 'Code promo non trouvé'
        });
      }

      await promo.update(req.body);

      return res.status(200).json({
        success: true,
        message: 'Code promo mis à jour avec succès',
        data: promo
      });

    } catch (error) {
      console.error('Erreur updatePromo:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour'
      });
    }
  }

  // ============================================
  // GESTION DES UTILISATEURS (§4.1)
  // ============================================

  async getUtilisateurs(req: Request, res: Response) {
    try {
      const users = await User.findAll({
        attributes: { exclude: ['motDePasseHash'] },
        order: [['nom', 'ASC'], ['prenom', 'ASC']]
      });

      return res.status(200).json({
        success: true,
        data: users
      });

    } catch (error) {
      console.error('Erreur getUtilisateurs:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des utilisateurs'
      });
    }
  }

  async createUtilisateur(req: Request, res: Response) {
    try {
      const { motDePasse, ...userData } = req.body;
      const adminId = (req as any).user?.id;

      if (!motDePasse || motDePasse.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'Le mot de passe doit contenir au moins 8 caractères'
        });
      }

      if (!userData.email || !userData.login) {
        return res.status(400).json({
          success: false,
          message: 'Email et login sont requis'
        });
      }

      const existingUser = await User.findOne({
        where: {
          [Op.or]: [
            { email: userData.email },
            { login: userData.login }
          ]
        }
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Un utilisateur avec cet email ou ce login existe déjà'
        });
      }

      const hashedPassword = await bcrypt.hash(motDePasse, 10);

      const user = await User.create({
        ...userData,
        motDePasseHash: hashedPassword,
        actif: true
      });

      const userResponse = user.toJSON();
      delete userResponse.motDePasseHash;

      await AuditLog.create({
        action: 'CREATE_USER',
        entite: 'User',
        entiteId: user.id,
        utilisateurId: adminId,
        nouvelleValeur: { 
          email: user.email, 
          login: user.login, 
          role: user.role,
          nom: user.nom,
          prenom: user.prenom
        }
      });

      return res.status(201).json({
        success: true,
        message: 'Utilisateur créé avec succès',
        data: userResponse
      });

    } catch (error) {
      console.error('Erreur createUtilisateur:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la création de l\'utilisateur'
      });
    }
  }

  async updateUtilisateur(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { motDePasse, ...userData } = req.body;
      const adminId = (req as any).user?.id;

      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouvé'
        });
      }

      const oldValues = { 
        email: user.email, 
        role: user.role, 
        actif: user.actif,
        nom: user.nom,
        prenom: user.prenom,
        telephone: user.telephone
      };

      if (motDePasse) {
        if (motDePasse.length < 8) {
          return res.status(400).json({
            success: false,
            message: 'Le mot de passe doit contenir au moins 8 caractères'
          });
        }
        userData.motDePasseHash = await bcrypt.hash(motDePasse, 10);
      }

      await user.update(userData);

      const userResponse = user.toJSON();
      delete userResponse.motDePasseHash;

      await AuditLog.create({
        action: 'UPDATE_USER',
        entite: 'User',
        entiteId: user.id,
        utilisateurId: adminId,
        ancienneValeur: oldValues,
        nouvelleValeur: { 
          email: user.email, 
          role: user.role, 
          actif: user.actif,
          nom: user.nom,
          prenom: user.prenom,
          telephone: user.telephone
        }
      });

      return res.status(200).json({
        success: true,
        message: 'Utilisateur mis à jour avec succès',
        data: userResponse
      });

    } catch (error) {
      console.error('Erreur updateUtilisateur:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour'
      });
    }
  }

  async deleteUtilisateur(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      if (parseInt(id) === userId) {
        return res.status(403).json({
          success: false,
          message: 'Vous ne pouvez pas supprimer votre propre compte'
        });
      }

      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouvé'
        });
      }

      const userInfo = { login: user.login, email: user.email, nom: user.nom, prenom: user.prenom };
      await user.destroy();

      await AuditLog.create({
        action: 'DELETE_USER',
        entite: 'User',
        entiteId: parseInt(id),
        utilisateurId: userId,
        ancienneValeur: userInfo
      });

      return res.status(200).json({
        success: true,
        message: 'Utilisateur supprimé avec succès'
      });

    } catch (error) {
      console.error('Erreur deleteUtilisateur:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression'
      });
    }
  }

  // ============================================
  // CHANGEMENT MOT DE PASSE (avec vérification admin)
  // ============================================

  async changePassword(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { nouveauMotDePasse, motDePasseAdmin } = req.body;
      const adminId = (req as any).user?.id;

      if (!nouveauMotDePasse || nouveauMotDePasse.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'Le nouveau mot de passe doit contenir au moins 8 caractères'
        });
      }

      if (!motDePasseAdmin) {
        return res.status(400).json({
          success: false,
          message: 'Le mot de passe de l\'administrateur est requis pour confirmer'
        });
      }

      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouvé'
        });
      }

      const admin = await User.findByPk(adminId);
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: 'Administrateur non trouvé'
        });
      }

      const passwordValid = await bcrypt.compare(motDePasseAdmin, admin.motDePasseHash);
      if (!passwordValid) {
        return res.status(403).json({
          success: false,
          message: 'Mot de passe administrateur incorrect'
        });
      }

      const hashedPassword = await bcrypt.hash(nouveauMotDePasse, 10);
      await user.update({ motDePasseHash: hashedPassword });

      await AuditLog.create({
        action: 'CHANGE_PASSWORD',
        entite: 'User',
        entiteId: user.id,
        utilisateurId: adminId,
        nouvelleValeur: { 
          utilisateur: user.login,
          modifiePar: admin.login
        }
      });

      return res.status(200).json({
        success: true,
        message: `Mot de passe de ${user.login} modifié avec succès`
      });

    } catch (error) {
      console.error('Erreur changePassword:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors du changement de mot de passe'
      });
    }
  }

  // ============================================
  // MODÈLES EMAIL (§3.6.2 - RG6)
  // ============================================

  async getModelesEmail(req: Request, res: Response) {
    try {
      const modeles = await EmailTemplate.findAll({
        order: [['typeEmail', 'ASC']]
      });

      return res.status(200).json({
        success: true,
        data: modeles
      });

    } catch (error) {
      console.error('Erreur getModelesEmail:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des modèles'
      });
    }
  }

  async updateModeleEmail(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { sujet, corps } = req.body;
      const userId = (req as any).user?.id;

      const modele = await EmailTemplate.findByPk(id);
      if (!modele) {
        return res.status(404).json({
          success: false,
          message: 'Modèle non trouvé'
        });
      }

      const oldValues = modele.toJSON();
      await modele.update({ 
        sujet, 
        corps, 
        actif: true,
        dateModification: new Date()
      });

      await AuditLog.create({
        action: 'UPDATE_EMAIL_TEMPLATE',
        entite: 'EmailTemplate',
        entiteId: modele.id,
        utilisateurId: userId,
        ancienneValeur: { sujet: oldValues.sujet },
        nouvelleValeur: { sujet }
      });

      return res.status(200).json({
        success: true,
        message: 'Modèle mis à jour avec succès',
        data: modele
      });

    } catch (error) {
      console.error('Erreur updateModeleEmail:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour du modèle'
      });
    }
  }

  // ============================================
  // JOURNAL D'AUDIT (§4.4)
  // ============================================

  async getAuditLogs(req: Request, res: Response) {
    try {
      const { limit = 100, offset = 0, action, entite } = req.query;

      const where: any = {};
      if (action) where.action = action;
      if (entite) where.entite = entite;

      const logs = await AuditLog.findAndCountAll({
        where,
        order: [['dateAction', 'DESC']],
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });

      const formattedLogs = logs.rows.map(log => ({
        id: log.id,
        action: log.action,
        ressource: log.entite,
        id_ressource: log.entiteId,
        date_heure: log.dateAction,
        ip: log.adresseIp,
        details: JSON.stringify({
          ancien: log.ancienneValeur,
          nouveau: log.nouvelleValeur
        }),
        utilisateur_login: log.utilisateurId ? 'user_' + log.utilisateurId : 'Système'
      }));

      return res.status(200).json({
        success: true,
        data: formattedLogs,
        total: logs.count,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });

    } catch (error) {
      console.error('Erreur getAuditLogs:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des logs'
      });
    }
  }

  // ============================================
  // EXPORTS (§3.7.3)
  // ============================================

  async exportReservations(req: Request, res: Response) {
    try {
      const { dateDebut, dateFin } = req.query;

      const where: any = {};
      if (dateDebut && dateFin) {
        where.dateArrivee = { [Op.between]: [dateDebut, dateFin] };
      }

      const reservations = await Reservation.findAll({
        where,
        include: [
          { model: Client, as: 'client' },
          { model: Room, as: 'chambre' },
          { model: Payment, as: 'paiements' }
        ],
        order: [['dateArrivee', 'DESC']]
      });

      const csv = this.formatReservationsCSV(reservations);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=reservations_${new Date().toISOString().split('T')[0]}.csv`);

      return res.status(200).send('\uFEFF' + csv);

    } catch (error) {
      console.error('Erreur exportReservations:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'export'
      });
    }
  }

  async exportClients(req: Request, res: Response) {
    try {
      const clients = await Client.findAll({
        include: [
          { model: ClientPreference, as: 'preferences' }
        ],
        order: [['nom', 'ASC']]
      });

      const csv = this.formatClientsCSV(clients);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=clients_${new Date().toISOString().split('T')[0]}.csv`);

      return res.status(200).send('\uFEFF' + csv);

    } catch (error) {
      console.error('Erreur exportClients:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'export'
      });
    }
  }

  // ============================================
  // MÉTHODES PRIVÉES - FORMATAGE CSV
  // ============================================

  private formatReservationsCSV(reservations: any[]): string {
    const headers = [
      'Numéro', 'Client', 'Email', 'Chambre', 'Arrivée', 'Départ',
      'Nuits', 'Adultes', 'Enfants', 'Montant Total', 'Acompte', 'Solde',
      'Statut', 'Date Création'
    ];

    const rows = reservations.map(r => [
      r.numeroReservation || r.numero || '',
      `${r.client?.nom || ''} ${r.client?.prenom || ''}`,
      r.client?.email || '',
      r.chambre?.nom || '',
      new Date(r.dateArrivee).toLocaleDateString('fr-FR'),
      new Date(r.dateDepart).toLocaleDateString('fr-FR'),
      r.nbNuits || 0,
      r.nbAdultes || 0,
      r.nbEnfants || 0,
      r.montantTotal || 0,
      r.montantAcompte || 0,
      r.montantSolde || 0,
      r.statut || '',
      new Date(r.dateCreation).toLocaleDateString('fr-FR')
    ]);

    return [headers.join(';'), ...rows.map(row => row.join(';'))].join('\n');
  }

  private formatClientsCSV(clients: any[]): string {
    const headers = [
      'Nom', 'Prénom', 'Email', 'Téléphone', 'Statut',
      'Segment', 'Origine', 'Canal Acquisition',
      'Nb Séjours', 'Montant Total Dépensé', 'Date Création'
    ];

    const rows = clients.map(c => [
      c.nom || '',
      c.prenom || '',
      c.email || '',
      c.telephone || '',
      c.statut || 'NOUVEAU',
      c.segment || '',
      c.origineGeographique || '',
      c.canalAcquisition || '',
      c.nbSejours || 0,
      c.montantTotalDepense || 0,
      new Date(c.dateCreation).toLocaleDateString('fr-FR')
    ]);

    return [headers.join(';'), ...rows.map(row => row.join(';'))].join('\n');
  }
}

export default AdminController;