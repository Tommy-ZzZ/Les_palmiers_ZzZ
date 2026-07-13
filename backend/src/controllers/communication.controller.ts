// backend/src/controllers/communication.controller.ts
import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Message, MessageEmail, Client, Reservation, Room, HistoriqueModification, User } from '../models';
import { envoyerViaOVH, substituerVariables, testerConfigEmail } from '../services/email.service';

// ─── CONTROLLER ───
export class CommunicationController {
  // ============================================
  // TEST DE CONFIGURATION EMAIL
  // ============================================

  async testerEmail(req: Request, res: Response) {
    try {
      const resultat = await testerConfigEmail();
      res.json(resultat);
    } catch (error: any) {
      console.error('[testerEmail] Erreur:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erreur lors du test de la configuration email',
        error: error.message 
      });
    }
  }

  // ============================================
  // MODÈLES — §3.6.2
  // ============================================

  async getModeles(req: Request, res: Response) {
    try {
      const modeles = await Message.findAll({
        order: [['dateModification', 'DESC']],
      });

      res.json({ success: true, data: modeles });
    } catch (error: any) {
      console.error('[getModeles] Erreur:', error);
      res.status(500).json({ success: false, message: 'Erreur lors de la récupération des modèles' });
    }
  }

  async getModele(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const modele = await Message.findByPk(id);

      if (!modele) {
        return res.status(404).json({ success: false, message: 'Modèle non trouvé' });
      }

      res.json({ success: true, data: modele });
    } catch (error: any) {
      console.error('[getModele] Erreur:', error);
      res.status(500).json({ success: false, message: 'Erreur lors de la récupération du modèle' });
    }
  }

  async createModele(req: Request, res: Response) {
    try {
      const { nom, type, sujet, corps, variables } = req.body;

      if (!nom || !type || !sujet || !corps) {
        return res.status(400).json({ success: false, message: 'Les champs nom, type, sujet et corps sont requis' });
      }

      const modele = await Message.create({
        nom,
        type,
        sujet,
        corps,
        variables: variables || [],
        dateModification: new Date(),
        valide: false,
        creePar: (req as any).user?.id,
        dateCreation: new Date(),
      });

      res.status(201).json({ success: true, data: modele, message: 'Modèle créé avec succès' });
    } catch (error: any) {
      console.error('[createModele] Erreur:', error);
      res.status(500).json({ success: false, message: 'Erreur lors de la création du modèle' });
    }
  }

  async updateModele(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { nom, type, sujet, corps, variables } = req.body;

      const modele = await Message.findByPk(id);
      if (!modele) {
        return res.status(404).json({ success: false, message: 'Modèle non trouvé' });
      }

      const ancienneValeur = JSON.stringify(modele.toJSON());

      await modele.update({
        nom: nom || modele.nom,
        type: type || modele.type,
        sujet: sujet || modele.sujet,
        corps: corps || modele.corps,
        variables: variables || modele.variables,
        dateModification: new Date(),
        valide: false,
      });

      await HistoriqueModification.create({
        entite: 'Message',
        idEntite: parseInt(id),
        action: 'UPDATE',
        ancienneValeur,
        nouvelleValeur: JSON.stringify(modele.toJSON()),
        modifiePar: (req as any).user?.id || 0,
        dateHeure: new Date(),
      });

      res.json({ success: true, data: modele, message: 'Modèle mis à jour avec succès' });
    } catch (error: any) {
      console.error('[updateModele] Erreur:', error);
      res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour du modèle' });
    }
  }

  async validerModele(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const modele = await Message.findByPk(id);
      if (!modele) {
        return res.status(404).json({ success: false, message: 'Modèle non trouvé' });
      }

      if ((req as any).user?.role !== 'GERANTE') {
        return res.status(403).json({ success: false, message: 'Seule la gérante peut valider un modèle (RG6)' });
      }

      await modele.update({
        valide: true,
        validePar: (req as any).user?.id,
        dateModification: new Date(),
      });

      res.json({ success: true, message: 'Modèle validé avec succès' });
    } catch (error: any) {
      console.error('[validerModele] Erreur:', error);
      res.status(500).json({ success: false, message: 'Erreur lors de la validation du modèle' });
    }
  }

  async deleteModele(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const modele = await Message.findByPk(id);
      if (!modele) {
        return res.status(404).json({ success: false, message: 'Modèle non trouvé' });
      }

      await HistoriqueModification.create({
        entite: 'Message',
        idEntite: parseInt(id),
        action: 'DELETE',
        ancienneValeur: JSON.stringify(modele.toJSON()),
        nouvelleValeur: null,
        modifiePar: (req as any).user?.id || 0,
        dateHeure: new Date(),
      });

      await modele.destroy();
      res.json({ success: true, message: 'Modèle supprimé avec succès' });
    } catch (error: any) {
      console.error('[deleteModele] Erreur:', error);
      res.status(500).json({ success: false, message: 'Erreur lors de la suppression du modèle' });
    }
  }

  // ============================================
  // ENVOIS — §3.6.1
  // ============================================

  async envoyerEmail(req: Request, res: Response) {
    try {
      const { clientId, reservationId, messageId, type, sujet, corps } = req.body;

      if (!clientId) {
        return res.status(400).json({ success: false, message: 'Le clientId est requis' });
      }

      const client = await Client.findByPk(clientId);
      if (!client) {
        return res.status(404).json({ success: false, message: 'Client non trouvé' });
      }

      if (!client.email) {
        return res.status(400).json({ success: false, message: 'Ce client n\'a pas d\'adresse email' });
      }

      // Récupère la réservation (avec sa chambre) si elle est fournie, afin que
      // les variables dynamiques comme {{date_arrivee}}, {{chambre_nom}} ou
      // {{montant_total}} soient réellement substituées (§3.6.2).
      let reservation: Reservation | null = null;
      if (reservationId) {
        reservation = await Reservation.findByPk(reservationId, {
          include: [{ model: Room, as: 'chambre' }],
        });
      }

      // On part du sujet/corps saisi par l'utilisateur (celui envoyé par le
      // formulaire), et on ne retombe sur le contenu brut du modèle que si
      // l'utilisateur n'a rien renseigné.
      let messageSujet = sujet;
      let messageCorps = corps;

      if (messageId) {
        const modele = await Message.findByPk(messageId);
        if (!modele) {
          return res.status(404).json({ success: false, message: 'Modèle non trouvé' });
        }
        messageSujet = messageSujet || modele.sujet;
        messageCorps = messageCorps || modele.corps;
      }

      // Substitution des variables dynamiques, qu'il s'agisse d'un modèle
      // appliqué ou d'un texte libre contenant des variables.
      messageSujet = substituerVariables(messageSujet || '', { client, reservationId, reservation: reservation || undefined });
      messageCorps = substituerVariables(messageCorps || '', { client, reservationId, reservation: reservation || undefined });

      const resultat = await envoyerViaOVH({
        to: client.email,
        subject: messageSujet || 'Message des Palmiers',
        html: messageCorps || '',
      });

      const messageEmail = await MessageEmail.create({
        type: type || 'MANUEL',
        destinataire: client.email,
        clientId: client.id,
        reservationId: reservationId || null,
        sujet: messageSujet || '',
        corps: messageCorps || '',
        dateEnvoi: new Date(),
        statut: resultat.success ? 'ENVOYE' : 'ECHEC',
        erreurMessage: resultat.error,
        messageId: messageId || null,
      });

      res.json({
        success: resultat.success,
        data: messageEmail,
        message: resultat.success ? 'Email envoyé avec succès' : `Erreur d'envoi : ${resultat.error}`,
      });
    } catch (error: any) {
      console.error('[envoyerEmail] Erreur:', error);
      res.status(500).json({ success: false, message: 'Erreur lors de l\'envoi de l\'email' });
    }
  }

  async getHistorique(req: Request, res: Response) {
    try {
      const { clientId, type, statut, dateDebut, dateFin, limit = 50, offset = 0 } = req.query;

      const where: any = {};
      if (clientId) where.clientId = parseInt(clientId as string);
      if (type) where.type = type;
      if (statut) where.statut = statut;
      if (dateDebut) where.dateEnvoi = { [Op.gte]: new Date(dateDebut as string) };
      if (dateFin) where.dateEnvoi = { [Op.lte]: new Date(dateFin as string) };

      const { count, rows } = await MessageEmail.findAndCountAll({
        where,
        order: [['dateEnvoi', 'DESC']],
        limit: parseInt(limit as string) || 50,
        offset: parseInt(offset as string) || 0,
      });

      res.json({
        success: true,
        data: rows,
        pagination: {
          total: count,
          limit: parseInt(limit as string) || 50,
          offset: parseInt(offset as string) || 0
        },
      });
    } catch (error: any) {
      console.error('[getHistorique] Erreur:', error);
      res.status(500).json({ success: false, message: 'Erreur lors de la récupération de l\'historique' });
    }
  }

  async getMessage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const message = await MessageEmail.findByPk(id);

      if (!message) {
        return res.status(404).json({ success: false, message: 'Message non trouvé' });
      }

      res.json({ success: true, data: message });
    } catch (error: any) {
      console.error('[getMessage] Erreur:', error);
      res.status(500).json({ success: false, message: 'Erreur lors de la récupération du message' });
    }
  }

  async deleteMessage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const message = await MessageEmail.findByPk(id);
      if (!message) {
        return res.status(404).json({ success: false, message: 'Message non trouvé' });
      }

      await message.destroy();
      res.json({ success: true, message: 'Message supprimé avec succès' });
    } catch (error: any) {
      console.error('[deleteMessage] Erreur:', error);
      res.status(500).json({ success: false, message: 'Erreur lors de la suppression du message' });
    }
  }

  async reessayerEnvoi(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const message = await MessageEmail.findByPk(id);
      if (!message) {
        return res.status(404).json({ success: false, message: 'Message non trouvé' });
      }

      if (message.statut !== 'ECHEC') {
        return res.status(400).json({ success: false, message: 'Seuls les messages en échec peuvent être réessayés' });
      }

      const resultat = await envoyerViaOVH({
        to: message.destinataire,
        subject: message.sujet,
        html: message.corps,
      });

      await message.update({
        statut: resultat.success ? 'ENVOYE' : 'ECHEC',
        erreurMessage: resultat.error,
        dateEnvoi: new Date(),
      });

      res.json({
        success: resultat.success,
        data: message,
        message: resultat.success ? 'Réessai réussi' : `Réessai échoué : ${resultat.error}`,
      });
    } catch (error: any) {
      console.error('[reessayerEnvoi] Erreur:', error);
      res.status(500).json({ success: false, message: 'Erreur lors du réessai' });
    }
  }

  // ============================================
  // STATISTIQUES
  // ============================================

  async getStats(req: Request, res: Response) {
    try {
      const totalEnvoyes = await MessageEmail.count({ where: { statut: 'ENVOYE' } });
      const enAttente = await MessageEmail.count({ where: { statut: 'EN_ATTENTE' } });
      const echecs = await MessageEmail.count({ where: { statut: 'ECHEC' } });
      const ouverts = await MessageEmail.count({ where: { statut: 'OUVERT' } });

      const sequelize = MessageEmail.sequelize;
      if (sequelize) {
        const parTypeResult = await MessageEmail.findAll({
          attributes: ['type', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
          group: ['type'],
          raw: true,
        });

        const parType: Record<string, number> = {};
        parTypeResult.forEach((item: any) => {
          parType[item.type] = parseInt(item.count);
        });

        const tauxOuverture = totalEnvoyes > 0 ? Math.round((ouverts / totalEnvoyes) * 100) : 0;

        res.json({
          success: true,
          data: { totalEnvoyes, enAttente, echecs, ouverts, tauxOuverture, parType },
        });
      } else {
        res.json({
          success: true,
          data: { totalEnvoyes, enAttente, echecs, ouverts, tauxOuverture: 0, parType: {} },
        });
      }
    } catch (error: any) {
      console.error('[getStats] Erreur:', error);
      res.status(500).json({ success: false, message: 'Erreur lors de la récupération des statistiques' });
    }
  }

  // ============================================
  // RELANCES — §3.4.2
  // ============================================

  async envoyerRelanceGroupe(req: Request, res: Response) {
    try {
      const { clientIds } = req.body;

      if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
        return res.status(400).json({ success: false, message: 'La liste des clientIds est requise' });
      }

      let count = 0;
      const errors: string[] = [];

      for (const clientId of clientIds) {
        try {
          const client = await Client.findByPk(clientId);
          if (client && client.email) {
            const result = await envoyerViaOVH({
              to: client.email,
              subject: 'Rappel : Paiement en attente - Les Palmiers',
              html: `
                <p>Bonjour ${client.prenom} ${client.nom},</p>
                <p>Nous vous rappelons qu'un paiement est en attente pour votre réservation.</p>
                <p>Merci de régulariser votre situation.</p>
                <p>Cordialement,<br>L'équipe des Palmiers</p>
              `,
            });
            if (result.success) {
              count++;
              await MessageEmail.create({
                type: 'RELANCE_PAIEMENT',
                destinataire: client.email,
                clientId: client.id,
                sujet: 'Rappel : Paiement en attente - Les Palmiers',
                corps: `Bonjour ${client.prenom} ${client.nom},\n\nNous vous rappelons qu'un paiement est en attente pour votre réservation.\n\nMerci de régulariser votre situation.\n\nCordialement,\nL'équipe des Palmiers`,
                dateEnvoi: new Date(),
                statut: 'ENVOYE',
              });
            } else {
              errors.push(`Client ${clientId}: ${result.error}`);
            }
          }
        } catch (err: any) {
          errors.push(`Client ${clientId}: ${err.message}`);
        }
      }

      res.json({
        success: true,
        count,
        total: clientIds.length,
        errors: errors.length > 0 ? errors : undefined,
        message: `${count}/${clientIds.length} relances envoyées avec succès`,
      });
    } catch (error: any) {
      console.error('[envoyerRelanceGroupe] Erreur:', error);
      res.status(500).json({ success: false, message: 'Erreur lors de l\'envoi des relances' });
    }
  }

  async envoyerRelance(req: Request, res: Response) {
    try {
      const { clientId } = req.params;
      const { reservationId } = req.body;

      const client = await Client.findByPk(clientId);
      if (!client) {
        return res.status(404).json({ success: false, message: 'Client non trouvé' });
      }

      if (!client.email) {
        return res.status(400).json({ success: false, message: 'Ce client n\'a pas d\'adresse email' });
      }

      const result = await envoyerViaOVH({
        to: client.email,
        subject: 'Rappel : Paiement en attente - Les Palmiers',
        html: `
          <p>Bonjour ${client.prenom} ${client.nom},</p>
          <p>Nous vous rappelons qu'un paiement est en attente pour votre réservation.</p>
          <p>Merci de régulariser votre situation.</p>
          <p>Cordialement,<br>L'équipe des Palmiers</p>
        `,
      });

      if (result.success) {
        await MessageEmail.create({
          type: 'RELANCE_PAIEMENT',
          destinataire: client.email,
          clientId: client.id,
          reservationId: reservationId || null,
          sujet: 'Rappel : Paiement en attente - Les Palmiers',
          corps: `Bonjour ${client.prenom} ${client.nom},\n\nNous vous rappelons qu'un paiement est en attente pour votre réservation.\n\nMerci de régulariser votre situation.\n\nCordialement,\nL'équipe des Palmiers`,
          dateEnvoi: new Date(),
          statut: 'ENVOYE',
        });
      }

      res.json({
        success: result.success,
        message: result.success ? 'Relance envoyée avec succès' : `Erreur d'envoi : ${result.error}`,
      });
    } catch (error: any) {
      console.error('[envoyerRelance] Erreur:', error);
      res.status(500).json({ success: false, message: 'Erreur lors de l\'envoi de la relance' });
    }
  }
}

export default new CommunicationController();