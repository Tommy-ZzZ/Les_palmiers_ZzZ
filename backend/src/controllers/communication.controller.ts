// backend/src/controllers/communication.controller.ts
import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Message, MessageEmail, Client, Reservation, Room, HistoriqueModification, User } from '../models';
import { envoyerViaOVH, substituerVariables } from '../services/email.service';

// ─── CONTROLLER ───
export class CommunicationController {
  // ============================================
  // MODÈLES — §3.6.2
  // ============================================

  async getModeles(req: Request, res: Response) {
    try {
      console.log('📋 [Communication] Récupération des modèles...');
      const modeles = await Message.findAll({
        order: [['dateModification', 'DESC']],
      });

      console.log(`📋 [Communication] ${modeles.length} modèles récupérés`);
      res.json({ success: true, data: modeles });
    } catch (error: any) {
      console.error('❌ [Communication] Erreur getModeles:', error);
      res.status(500).json({ success: false, message: 'Erreur lors de la récupération des modèles' });
    }
  }

  async getModele(req: Request, res: Response) {
    try {
      const { id } = req.params;
      console.log(`📋 [Communication] Récupération du modèle ${id}...`);

      const modele = await Message.findByPk(id);

      if (!modele) {
        console.warn(`⚠️ [Communication] Modèle ${id} non trouvé`);
        return res.status(404).json({ success: false, message: 'Modèle non trouvé' });
      }

      console.log(`📋 [Communication] Modèle ${id} récupéré: ${modele.nom}`);
      res.json({ success: true, data: modele });
    } catch (error: any) {
      console.error('❌ [Communication] Erreur getModele:', error);
      res.status(500).json({ success: false, message: 'Erreur lors de la récupération du modèle' });
    }
  }

  async createModele(req: Request, res: Response) {
    try {
      const { nom, type, sujet, corps, variables } = req.body;
      const userId = (req as any).user?.id;

      console.log(`📝 [Communication] Création d'un nouveau modèle "${nom}" par l'utilisateur ${userId}`);

      if (!nom || !type || !sujet || !corps) {
        console.warn('⚠️ [Communication] Champs manquants pour la création du modèle');
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
        creePar: userId,
        dateCreation: new Date(),
      });

      console.log(`✅ [Communication] Modèle "${nom}" créé avec succès (ID: ${modele.id})`);
      res.status(201).json({ success: true, data: modele, message: 'Modèle créé avec succès' });
    } catch (error: any) {
      console.error('❌ [Communication] Erreur createModele:', error);
      res.status(500).json({ success: false, message: 'Erreur lors de la création du modèle' });
    }
  }

  async updateModele(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { nom, type, sujet, corps, variables } = req.body;
      const userId = (req as any).user?.id;

      console.log(`📝 [Communication] Mise à jour du modèle ${id} par l'utilisateur ${userId}`);

      const modele = await Message.findByPk(id);
      if (!modele) {
        console.warn(`⚠️ [Communication] Modèle ${id} non trouvé pour la mise à jour`);
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
        valide: false, // ✅ Toute modification invalide le modèle (RG7)
      });

      await HistoriqueModification.create({
        entite: 'Message',
        idEntite: parseInt(id),
        action: 'UPDATE',
        ancienneValeur,
        nouvelleValeur: JSON.stringify(modele.toJSON()),
        modifiePar: userId || 0,
        dateHeure: new Date(),
      });

      console.log(`✅ [Communication] Modèle ${id} mis à jour avec succès (invalidé pour re-validation)`);
      res.json({ success: true, data: modele, message: 'Modèle mis à jour avec succès' });
    } catch (error: any) {
      console.error('❌ [Communication] Erreur updateModele:', error);
      res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour du modèle' });
    }
  }

  async validerModele(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      console.log(`✅ [Communication] Validation du modèle ${id} par l'utilisateur ${userId} (rôle: ${userRole})`);

      const modele = await Message.findByPk(id);
      if (!modele) {
        console.warn(`⚠️ [Communication] Modèle ${id} non trouvé pour la validation`);
        return res.status(404).json({ success: false, message: 'Modèle non trouvé' });
      }

      // ✅ RG6 : Seule la gérante peut valider un modèle
      if (userRole !== 'GERANTE') {
        console.warn(`⚠️ [Communication] Tentative de validation par un utilisateur non autorisé (${userRole})`);
        return res.status(403).json({ 
          success: false, 
          message: 'Seule la gérante peut valider un modèle (RG6)' 
        });
      }

      await modele.update({
        valide: true,
        validePar: userId,
        dateModification: new Date(),
      });

      console.log(`✅ [Communication] Modèle ${id} validé avec succès par la gérante`);
      res.json({ success: true, message: 'Modèle validé avec succès' });
    } catch (error: any) {
      console.error('❌ [Communication] Erreur validerModele:', error);
      res.status(500).json({ success: false, message: 'Erreur lors de la validation du modèle' });
    }
  }

  async deleteModele(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      console.log(`🗑️ [Communication] Suppression du modèle ${id} par l'utilisateur ${userId}`);

      const modele = await Message.findByPk(id);
      if (!modele) {
        console.warn(`⚠️ [Communication] Modèle ${id} non trouvé pour la suppression`);
        return res.status(404).json({ success: false, message: 'Modèle non trouvé' });
      }

      await HistoriqueModification.create({
        entite: 'Message',
        idEntite: parseInt(id),
        action: 'DELETE',
        ancienneValeur: JSON.stringify(modele.toJSON()),
        nouvelleValeur: null,
        modifiePar: userId || 0,
        dateHeure: new Date(),
      });

      await modele.destroy();
      console.log(`✅ [Communication] Modèle ${id} supprimé avec succès`);
      res.json({ success: true, message: 'Modèle supprimé avec succès' });
    } catch (error: any) {
      console.error('❌ [Communication] Erreur deleteModele:', error);
      res.status(500).json({ success: false, message: 'Erreur lors de la suppression du modèle' });
    }
  }

  // ============================================
  // ENVOIS — §3.6.1
  // ============================================

  async envoyerEmail(req: Request, res: Response) {
    try {
      const { clientId, reservationId, messageId, type, sujet, corps } = req.body;
      const userId = (req as any).user?.id;

      console.log(`📧 [Communication] Envoi d'email par l'utilisateur ${userId}`);
      console.log(`📧 [Communication] - clientId: ${clientId}`);
      console.log(`📧 [Communication] - reservationId: ${reservationId || 'non fourni'}`);
      console.log(`📧 [Communication] - messageId: ${messageId || 'non fourni'}`);
      console.log(`📧 [Communication] - type: ${type || 'MANUEL'}`);

      if (!clientId) {
        console.warn('⚠️ [Communication] clientId manquant pour l\'envoi');
        return res.status(400).json({ success: false, message: 'Le clientId est requis' });
      }

      const client = await Client.findByPk(clientId);
      if (!client) {
        console.warn(`⚠️ [Communication] Client ${clientId} non trouvé`);
        return res.status(404).json({ success: false, message: 'Client non trouvé' });
      }

      if (!client.email) {
        console.warn(`⚠️ [Communication] Client ${clientId} (${client.prenom} ${client.nom}) n'a pas d'email`);
        return res.status(400).json({ success: false, message: 'Ce client n\'a pas d\'adresse email' });
      }

      console.log(`📧 [Communication] Destinataire: ${client.email} (${client.prenom} ${client.nom})`);

      // Récupération de la réservation si fournie
      let reservation: Reservation | null = null;
      if (reservationId) {
        reservation = await Reservation.findByPk(reservationId, {
          include: [{ model: Room, as: 'chambre' }],
        });
        if (reservation) {
          console.log(`📧 [Communication] Réservation associée: ${reservation.numero || reservationId}`);
        } else {
          console.warn(`⚠️ [Communication] Réservation ${reservationId} non trouvée`);
        }
      }

      // Préparation du sujet et du corps
      let messageSujet = sujet;
      let messageCorps = corps;

      if (messageId) {
        const modele = await Message.findByPk(messageId);
        if (modele) {
          console.log(`📧 [Communication] Modèle appliqué: "${modele.nom}" (ID: ${messageId})`);
          messageSujet = messageSujet || modele.sujet;
          messageCorps = messageCorps || modele.corps;
        } else {
          console.warn(`⚠️ [Communication] Modèle ${messageId} non trouvé`);
        }
      }

      // Substitution des variables
      try {
        messageSujet = substituerVariables(messageSujet || '', { client, reservationId, reservation: reservation || undefined });
        messageCorps = substituerVariables(messageCorps || '', { client, reservationId, reservation: reservation || undefined });
        console.log(`📧 [Communication] Variables substituées avec succès`);
      } catch (error: any) {
        console.error('❌ [Communication] Erreur lors de la substitution des variables:', error.message);
      }

      // Envoi via OVH
      console.log(`📧 [Communication] Envoi de l'email à ${client.email}...`);
      const resultat = await envoyerViaOVH({
        to: client.email,
        subject: messageSujet || 'Message des Palmiers',
        html: messageCorps || '',
      });

      console.log(`📧 [Communication] Résultat de l'envoi: ${resultat.success ? '✅ SUCCÈS' : '❌ ÉCHEC'}`);
      if (!resultat.success) {
        console.error(`📧 [Communication] Erreur d'envoi: ${resultat.error}`);
      }

      // Sauvegarde dans l'historique
      const messageEmail = await MessageEmail.create({
        type: type || 'MANUEL',
        destinataire: client.email,
        clientId: client.id,
        reservationId: reservationId || null,
        sujet: messageSujet || '',
        corps: messageCorps || '',
        dateEnvoi: new Date(),
        statut: resultat.success ? 'ENVOYE' : 'ECHEC',
        erreurMessage: resultat.error || null,
        messageId: messageId || null,
      });

      console.log(`📧 [Communication] Message sauvegardé dans l'historique (ID: ${messageEmail.id})`);

      res.json({
        success: resultat.success,
        data: messageEmail,
        message: resultat.success ? 'Email envoyé avec succès' : `Erreur d'envoi : ${resultat.error}`,
      });
    } catch (error: any) {
      console.error('❌ [Communication] Erreur envoyerEmail:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de l\'envoi de l\'email',
        error: error.message 
      });
    }
  }

  async getHistorique(req: Request, res: Response) {
    try {
      const { clientId, type, statut, dateDebut, dateFin, limit = 50, offset = 0 } = req.query;

      console.log(`📋 [Communication] Récupération de l'historique des emails...`);

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

      console.log(`📋 [Communication] ${count} messages trouvés dans l'historique`);
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
      console.error('❌ [Communication] Erreur getHistorique:', error);
      res.status(500).json({ success: false, message: 'Erreur lors de la récupération de l\'historique' });
    }
  }

  async getMessage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      console.log(`📋 [Communication] Récupération du message ${id}...`);

      const message = await MessageEmail.findByPk(id);
      if (!message) {
        console.warn(`⚠️ [Communication] Message ${id} non trouvé`);
        return res.status(404).json({ success: false, message: 'Message non trouvé' });
      }

      console.log(`📋 [Communication] Message ${id} récupéré (statut: ${message.statut})`);
      res.json({ success: true, data: message });
    } catch (error: any) {
      console.error('❌ [Communication] Erreur getMessage:', error);
      res.status(500).json({ success: false, message: 'Erreur lors de la récupération du message' });
    }
  }

  async deleteMessage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      console.log(`🗑️ [Communication] Suppression du message ${id} par l'utilisateur ${userId}`);

      const message = await MessageEmail.findByPk(id);
      if (!message) {
        console.warn(`⚠️ [Communication] Message ${id} non trouvé pour la suppression`);
        return res.status(404).json({ success: false, message: 'Message non trouvé' });
      }

      await message.destroy();
      console.log(`✅ [Communication] Message ${id} supprimé avec succès`);
      res.json({ success: true, message: 'Message supprimé avec succès' });
    } catch (error: any) {
      console.error('❌ [Communication] Erreur deleteMessage:', error);
      res.status(500).json({ success: false, message: 'Erreur lors de la suppression du message' });
    }
  }

  async reessayerEnvoi(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      console.log(`🔄 [Communication] Réessai d'envoi du message ${id} par l'utilisateur ${userId}`);

      const message = await MessageEmail.findByPk(id);
      if (!message) {
        console.warn(`⚠️ [Communication] Message ${id} non trouvé pour le réessai`);
        return res.status(404).json({ success: false, message: 'Message non trouvé' });
      }

      if (message.statut !== 'ECHEC') {
        console.warn(`⚠️ [Communication] Message ${id} n'est pas en échec (statut: ${message.statut})`);
        return res.status(400).json({ success: false, message: 'Seuls les messages en échec peuvent être réessayés' });
      }

      console.log(`📧 [Communication] Réessai d'envoi à ${message.destinataire}...`);

      const resultat = await envoyerViaOVH({
        to: message.destinataire,
        subject: message.sujet,
        html: message.corps,
      });

      console.log(`📧 [Communication] Résultat du réessai: ${resultat.success ? '✅ SUCCÈS' : '❌ ÉCHEC'}`);
      if (!resultat.success) {
        console.error(`📧 [Communication] Erreur lors du réessai: ${resultat.error}`);
      }

      await message.update({
        statut: resultat.success ? 'ENVOYE' : 'ECHEC',
        erreurMessage: resultat.error || null,
        dateEnvoi: new Date(),
      });

      console.log(`✅ [Communication] Message ${id} mis à jour après réessai (statut: ${message.statut})`);

      res.json({
        success: resultat.success,
        data: message,
        message: resultat.success ? 'Réessai réussi' : `Réessai échoué : ${resultat.error}`,
      });
    } catch (error: any) {
      console.error('❌ [Communication] Erreur reessayerEnvoi:', error);
      res.status(500).json({ success: false, message: 'Erreur lors du réessai' });
    }
  }

  // ============================================
  // STATISTIQUES
  // ============================================

  async getStats(req: Request, res: Response) {
    try {
      console.log('📊 [Communication] Calcul des statistiques de communication...');

      const totalEnvoyes = await MessageEmail.count({ where: { statut: 'ENVOYE' } });
      const enAttente = await MessageEmail.count({ where: { statut: 'EN_ATTENTE' } });
      const echecs = await MessageEmail.count({ where: { statut: 'ECHEC' } });
      const ouverts = await MessageEmail.count({ where: { statut: 'OUVERT' } });

      const sequelize = MessageEmail.sequelize;
      let parType: Record<string, number> = {};

      if (sequelize) {
        const parTypeResult = await MessageEmail.findAll({
          attributes: ['type', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
          group: ['type'],
          raw: true,
        });

        parTypeResult.forEach((item: any) => {
          parType[item.type] = parseInt(item.count);
        });
      }

      const tauxOuverture = totalEnvoyes > 0 ? Math.round((ouverts / totalEnvoyes) * 100) : 0;

      console.log(`📊 [Communication] Stats: ${totalEnvoyes} envoyés, ${enAttente} en attente, ${echecs} échecs, ${ouverts} ouverts, ${tauxOuverture}% d'ouverture`);

      res.json({
        success: true,
        data: { totalEnvoyes, enAttente, echecs, ouverts, tauxOuverture, parType },
      });
    } catch (error: any) {
      console.error('❌ [Communication] Erreur getStats:', error);
      res.status(500).json({ success: false, message: 'Erreur lors de la récupération des statistiques' });
    }
  }

  // ============================================
  // RELANCES — §3.4.2
  // ============================================

  async envoyerRelanceGroupe(req: Request, res: Response) {
    try {
      const { clientIds } = req.body;
      const userId = (req as any).user?.id;

      console.log(`📧 [Communication] Envoi de relances groupées par l'utilisateur ${userId}`);
      console.log(`📧 [Communication] ${clientIds?.length || 0} client(s) à relancer`);

      if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
        console.warn('⚠️ [Communication] Liste de clients vide pour les relances groupées');
        return res.status(400).json({ success: false, message: 'La liste des clientIds est requise' });
      }

      let count = 0;
      const errors: string[] = [];

      for (const clientId of clientIds) {
        try {
          const client = await Client.findByPk(clientId);
          if (client && client.email) {
            console.log(`📧 [Communication] Envoi de relance à ${client.email} (${client.prenom} ${client.nom})`);
            
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
              console.log(`✅ [Communication] Relance envoyée à ${client.email}`);
            } else {
              console.error(`❌ [Communication] Échec de l'envoi à ${client.email}: ${result.error}`);
              errors.push(`Client ${clientId}: ${result.error}`);
            }
          } else {
            const msg = client ? 'Pas d\'email' : 'Client non trouvé';
            console.warn(`⚠️ [Communication] Client ${clientId}: ${msg}`);
            errors.push(`Client ${clientId}: ${msg}`);
          }
        } catch (err: any) {
          console.error(`❌ [Communication] Erreur pour le client ${clientId}:`, err.message);
          errors.push(`Client ${clientId}: ${err.message}`);
        }
      }

      console.log(`✅ [Communication] Relances groupées terminées: ${count}/${clientIds.length} réussies, ${errors.length} échecs`);

      res.json({
        success: true,
        count,
        total: clientIds.length,
        errors: errors.length > 0 ? errors : undefined,
        message: `${count}/${clientIds.length} relances envoyées avec succès`,
      });
    } catch (error: any) {
      console.error('❌ [Communication] Erreur envoyerRelanceGroupe:', error);
      res.status(500).json({ success: false, message: 'Erreur lors de l\'envoi des relances' });
    }
  }

  async envoyerRelance(req: Request, res: Response) {
    try {
      const { clientId } = req.params;
      const { reservationId } = req.body;
      const userId = (req as any).user?.id;

      console.log(`📧 [Communication] Envoi d'une relance individuelle par l'utilisateur ${userId}`);
      console.log(`📧 [Communication] - clientId: ${clientId}`);
      console.log(`📧 [Communication] - reservationId: ${reservationId || 'non fourni'}`);

      const client = await Client.findByPk(parseInt(clientId));
      if (!client) {
        console.warn(`⚠️ [Communication] Client ${clientId} non trouvé pour la relance`);
        return res.status(404).json({ success: false, message: 'Client non trouvé' });
      }

      if (!client.email) {
        console.warn(`⚠️ [Communication] Client ${clientId} (${client.prenom} ${client.nom}) n'a pas d'email`);
        return res.status(400).json({ success: false, message: 'Ce client n\'a pas d\'adresse email' });
      }

      console.log(`📧 [Communication] Envoi de relance à ${client.email} (${client.prenom} ${client.nom})`);

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
        console.log(`✅ [Communication] Relance envoyée avec succès à ${client.email}`);
      } else {
        console.error(`❌ [Communication] Échec de l'envoi de la relance à ${client.email}: ${result.error}`);
      }

      res.json({
        success: result.success,
        message: result.success ? 'Relance envoyée avec succès' : `Erreur d'envoi : ${result.error}`,
      });
    } catch (error: any) {
      console.error('❌ [Communication] Erreur envoyerRelance:', error);
      res.status(500).json({ success: false, message: 'Erreur lors de l\'envoi de la relance' });
    }
  }
}

export default new CommunicationController();