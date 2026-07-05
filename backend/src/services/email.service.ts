// backend/src/services/email.service.ts
import { Reservation, Client, Room, EmailTemplate, SentEmail, Message, MessageEmail } from '../models';
import nodemailer from 'nodemailer';
import { Op } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'ssl0.ovh.net',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || 'contact@les-palmiers.re',
        pass: process.env.SMTP_PASS || ''
      }
    });
  }

  // ─── METHODES PRINCIPALES D'ENVOI ──────────────────────────────────────────

  async envoyerViaOVH(to: string, subject: string, html: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'contact@les-palmiers.re',
        to,
        subject,
        html
      });
      return { success: true };
    } catch (error: any) {
      console.error('[OVH] Erreur d\'envoi:', error.message);
      return { success: false, error: error.message };
    }
  }

  async envoyerEmailAvecHistorique(
    to: string,
    subject: string,
    html: string,
    type: string,
    clientId: number,
    reservationId?: number,
    messageId?: number
  ): Promise<{ success: boolean; error?: string }> {
    const result = await this.envoyerViaOVH(to, subject, html);

    try {
      await MessageEmail.create({
        type: type as any,
        destinataire: to,
        clientId,
        reservationId: reservationId || null,
        sujet: subject,
        corps: html,
        dateEnvoi: new Date(),
        statut: result.success ? 'ENVOYE' : 'ECHEC',
        erreurMessage: result.error,
        messageId: messageId || null,
      });
    } catch (err) {
      console.error('[Email] Erreur sauvegarde historique:', err);
    }

    return result;
  }

  // ─── CDC §3.6.1 : EMAILS AUTOMATIQUES ──────────────────────────────────────

  async envoyerConfirmation(reservationId: number) {
    try {
      const reservation = await Reservation.findByPk(reservationId, {
        include: [
          { model: Client, as: 'client' },
          { model: Room, as: 'chambre' }
        ]
      });

      if (!reservation || !reservation.client) {
        console.log(`[Email] Réservation ${reservationId} ou client non trouvé`);
        return;
      }

      const template = await EmailTemplate.findOne({
        where: { typeEmail: 'CONFIRMATION', actif: true }
      });

      if (!template) {
        console.log('[Email] Template CONFIRMATION non trouvé');
        return;
      }

      const variables = this.prepareVariables(reservation);
      const sujet = this.remplacerVariables(template.sujet, variables);
      const corps = this.remplacerVariables(template.corps, variables);

      await this.envoyerEmailAvecHistorique(
        reservation.client.email,
        sujet,
        corps,
        'CONFIRMATION',
        reservation.client.id,
        reservation.id
      );

      await SentEmail.create({
        reservationId,
        modeleId: template.id,
        destinataire: reservation.client.email,
        sujet,
        contenu: corps,
        statut: 'ENVOYE'
      });

      console.log(`[Email] Confirmation envoyée à ${reservation.client.email}`);
    } catch (error) {
      console.error('[Email] Erreur envoi confirmation:', error);
    }
  }

  async envoyerRappel(reservationId: number) {
    try {
      const reservation = await Reservation.findByPk(reservationId, {
        include: [
          { model: Client, as: 'client' },
          { model: Room, as: 'chambre' }
        ]
      });

      if (!reservation || !reservation.client) return;

      const template = await EmailTemplate.findOne({
        where: { typeEmail: 'RAPPEL_J_MOINS_7', actif: true }
      });

      if (!template) {
        console.log('[Email] Template RAPPEL_J_MOINS_7 non trouvé');
        return;
      }

      const variables = this.prepareVariables(reservation);
      const sujet = this.remplacerVariables(template.sujet, variables);
      const corps = this.remplacerVariables(template.corps, variables);

      await this.envoyerEmailAvecHistorique(
        reservation.client.email,
        sujet,
        corps,
        'RAPPEL_J7',
        reservation.client.id,
        reservation.id
      );

      console.log(`[Email] Rappel J-7 envoyé à ${reservation.client.email}`);
    } catch (error) {
      console.error('[Email] Erreur envoi rappel:', error);
    }
  }

  async envoyerRemerciement(reservationId: number) {
    try {
      const reservation = await Reservation.findByPk(reservationId, {
        include: [
          { model: Client, as: 'client' },
          { model: Room, as: 'chambre' }
        ]
      });

      if (!reservation || !reservation.client) return;

      const template = await EmailTemplate.findOne({
        where: { typeEmail: 'REMERCIEMENT_J_PLUS_2', actif: true }
      });

      if (!template) {
        console.log('[Email] Template REMERCIEMENT_J_PLUS_2 non trouvé');
        return;
      }

      const variables = this.prepareVariables(reservation);
      const sujet = this.remplacerVariables(template.sujet, variables);
      const corps = this.remplacerVariables(template.corps, variables);

      await this.envoyerEmailAvecHistorique(
        reservation.client.email,
        sujet,
        corps,
        'REMERCIEMENT_J2',
        reservation.client.id,
        reservation.id
      );

      console.log(`[Email] Remerciement J+2 envoyé à ${reservation.client.email}`);
    } catch (error) {
      console.error('[Email] Erreur envoi remerciement:', error);
    }
  }

  async envoyerAnnulation(reservationId: number, penalite: number = 0) {
    try {
      const reservation = await Reservation.findByPk(reservationId, {
        include: [
          { model: Client, as: 'client' },
          { model: Room, as: 'chambre' }
        ]
      });

      if (!reservation || !reservation.client) return;

      const template = await EmailTemplate.findOne({
        where: { typeEmail: 'ANNULATION', actif: true }
      });

      if (!template) {
        console.log('[Email] Template ANNULATION non trouvé');
        return;
      }

      const variables = {
        ...this.prepareVariables(reservation),
        penalite: penalite,
        conditions_annulation: "Annulation gratuite jusqu'à 7 jours avant, 50% entre 7 et 2 jours, 100% moins de 2 jours"
      };

      const sujet = this.remplacerVariables(template.sujet, variables);
      const corps = this.remplacerVariables(template.corps, variables);

      await this.envoyerEmailAvecHistorique(
        reservation.client.email,
        sujet,
        corps,
        'ANNULATION',
        reservation.client.id,
        reservation.id
      );

      console.log(`[Email] Annulation envoyée à ${reservation.client.email}`);
    } catch (error) {
      console.error('[Email] Erreur envoi annulation:', error);
    }
  }

  async envoyerRelancePaiement(reservationId: number) {
    try {
      const reservation = await Reservation.findByPk(reservationId, {
        include: [
          { model: Client, as: 'client' },
          { model: Room, as: 'chambre' }
        ]
      });

      if (!reservation || !reservation.client) return;

      const template = await EmailTemplate.findOne({
        where: { typeEmail: 'RELANCE_IMPAYE', actif: true }
      });

      if (!template) {
        console.log('[Email] Template RELANCE_IMPAYE non trouvé');
        return;
      }

      const variables = {
        ...this.prepareVariables(reservation),
        solde: reservation.montantTotal - reservation.montantAcompte,
        date_limite_paiement: new Date(reservation.dateArrivee).toLocaleDateString('fr-FR')
      };

      const sujet = this.remplacerVariables(template.sujet, variables);
      const corps = this.remplacerVariables(template.corps, variables);

      await this.envoyerEmailAvecHistorique(
        reservation.client.email,
        sujet,
        corps,
        'RELANCE_PAIEMENT',
        reservation.client.id,
        reservation.id
      );

      console.log(`[Email] Relance paiement envoyée à ${reservation.client.email}`);
    } catch (error) {
      console.error('[Email] Erreur envoi relance paiement:', error);
    }
  }

  // ─── SUBSTITUTION DES VARIABLES ─────────────────────────────────────────────

  private prepareVariables(reservation: any): Record<string, any> {
    const arrivee = new Date(reservation.dateArrivee);
    const depart = new Date(reservation.dateDepart);
    const nbNuits = Math.ceil((depart.getTime() - arrivee.getTime()) / (1000 * 60 * 60 * 24));

    return {
      client_prenom: reservation.client?.prenom || '',
      client_nom: reservation.client?.nom || '',
      client_email: reservation.client?.email || '',
      client_telephone: reservation.client?.telephone || '',
      prenom: reservation.client?.prenom || '',
      nom: reservation.client?.nom || '',

      nom_gite: "Les Palmiers de l'Entre-Deux",
      adresse_gite: "12 Rue des Palmiers, 97440 L'Entre-Deux",
      telephone_gite: "0262 12 34 56",
      email_gite: "contact@lespalmiers-reunion.re",

      date_arrivee: arrivee.toLocaleDateString('fr-FR'),
      date_depart: depart.toLocaleDateString('fr-FR'),
      numero_reservation: reservation.numero || '',
      montant_total: reservation.montantTotal || 0,
      montant_acompte: reservation.montantAcompte || 0,
      solde: (reservation.montantTotal || 0) - (reservation.montantAcompte || 0),
      nb_adultes: reservation.nbAdultes || 0,
      nb_enfants: reservation.nbEnfants || 0,
      nb_nuits: nbNuits,
      numero: reservation.numero || '',

      chambre_nom: reservation.chambre?.nom || '',
      chambre_numero: reservation.chambre?.numero || '',
      chambre: reservation.chambre?.nom || '',
    };
  }

  private remplacerVariables(text: string, variables: Record<string, any>): string {
    let result = text;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value || ''));
    }
    return result;
  }

  // ─── CRON JOBS ───────────────────────────────────────────────────────────────

  async envoyerRappelsJMoins7() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateCible = new Date(today);
    dateCible.setDate(dateCible.getDate() + 7);

    const reservations = await Reservation.findAll({
      where: {
        date_arrivee: {
          [Op.between]: [dateCible, new Date(dateCible.getTime() + 24 * 60 * 60 * 1000)]
        },
        statut: 'CONFIRMEE'
      },
      include: [
        { model: Client, as: 'client' },
        { model: Room, as: 'chambre' }
      ]
    });

    console.log(`[CRON] ${reservations.length} rappels J-7 à envoyer`);

    for (const reservation of reservations) {
      await this.envoyerRappel(reservation.id);
    }
  }

  async envoyerRemerciementsJPlus2() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateCible = new Date(today);
    dateCible.setDate(dateCible.getDate() - 2);

    const reservations = await Reservation.findAll({
      where: {
        date_depart: {
          [Op.between]: [dateCible, new Date(dateCible.getTime() + 24 * 60 * 60 * 1000)]
        },
        statut: 'TERMINEE'
      },
      include: [
        { model: Client, as: 'client' },
        { model: Room, as: 'chambre' }
      ]
    });

    console.log(`[CRON] ${reservations.length} remerciements J+2 à envoyer`);

    for (const reservation of reservations) {
      await this.envoyerRemerciement(reservation.id);
    }
  }

  async marquerImpayes() {
    const reservations = await Reservation.findAll({
      where: {
        statut: ['CONFIRMEE', 'EN_ATTENTE_ACOMPTE']
      },
      include: [{ model: Client, as: 'client' }]
    });

    const impayes = reservations.filter(r => r.montantRestantDu > 0);

    console.log(`[CRON] ${impayes.length} réservations avec impayés`);

    for (const reservation of impayes) {
      const arrivee = new Date(reservation.dateArrivee);
      const today = new Date();
      const daysBeforeArrival = Math.ceil((arrivee.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (daysBeforeArrival <= 7 && daysBeforeArrival > 0) {
        await this.envoyerRelancePaiement(reservation.id);
      }
    }
  }

  // ─── SUBSTITUTION AVEC OBJET COMPLET ──────────────────────────────────────

  substituerVariables(template: string, data: { client: Client; reservationId?: number; reservation?: Reservation }): string {
    const client = data.client;
    const reservation = data.reservation || null;

    let result = template;

    result = result.replace(/{{client_prenom}}/g, client?.prenom || '');
    result = result.replace(/{{client_nom}}/g, client?.nom || '');
    result = result.replace(/{{client_email}}/g, client?.email || '');
    result = result.replace(/{{client_telephone}}/g, client?.telephone || '');

    result = result.replace(/{{nom_gite}}/g, "Les Palmiers de l'Entre-Deux");
    result = result.replace(/{{adresse_gite}}/g, "12 Rue des Palmiers, 97440 L'Entre-Deux");
    result = result.replace(/{{telephone_gite}}/g, "0262 12 34 56");
    result = result.replace(/{{email_gite}}/g, "contact@lespalmiers-reunion.re");

    if (reservation) {
      const arrivee = new Date(reservation.date_arrivee);
      const depart = new Date(reservation.date_depart);
      const nbNuits = Math.ceil((depart.getTime() - arrivee.getTime()) / (1000 * 60 * 60 * 24));

      result = result.replace(/{{date_arrivee}}/g, arrivee.toLocaleDateString('fr-FR'));
      result = result.replace(/{{date_depart}}/g, depart.toLocaleDateString('fr-FR'));
      result = result.replace(/{{numero_reservation}}/g, reservation.numero || '');
      result = result.replace(/{{montant_total}}/g, String(reservation.montantTotal || 0));
      result = result.replace(/{{acompte}}/g, String(reservation.montantAcompte || 0));
      result = result.replace(/{{solde}}/g, String((reservation.montantTotal || 0) - (reservation.montantAcompte || 0)));
      result = result.replace(/{{nb_adultes}}/g, String(reservation.nbAdultes || 0));
      result = result.replace(/{{nb_enfants}}/g, String(reservation.nbEnfants || 0));
      result = result.replace(/{{nb_nuits}}/g, String(nbNuits));

      if (reservation.chambre) {
        const chambre = reservation.chambre as any;
        result = result.replace(/{{chambre_nom}}/g, chambre.nom || '');
        result = result.replace(/{{chambre_numero}}/g, chambre.numero || '');
      }
    }

    result = result.replace(/{{conditions_annulation}}/g, "Annulation gratuite jusqu'à 7 jours avant l'arrivée, 50% entre 7 et 2 jours, 100% moins de 2 jours");

    if (reservation) {
      const dateLimite = new Date(reservation.date_arrivee);
      dateLimite.setDate(dateLimite.getDate() - 7);
      result = result.replace(/{{date_limite_paiement}}/g, dateLimite.toLocaleDateString('fr-FR'));
    }

    return result;
  }

  async envoyerViaOVHSimple(params: { to: string; subject: string; html: string }) {
    return this.envoyerViaOVH(params.to, params.subject, params.html);
  }
}

// ─── EXPORT INSTANCE ──────────────────────────────────────────────────────────

const emailService = new EmailService();

export const envoyerRappelsJMoins7 = () => emailService.envoyerRappelsJMoins7();
export const envoyerRemerciementsJPlus2 = () => emailService.envoyerRemerciementsJPlus2();
export const marquerImpayes = () => emailService.marquerImpayes();
export const envoyerViaOVH = (params: { to: string; subject: string; html: string }) => emailService.envoyerViaOVHSimple(params);
export const substituerVariables = (template: string, data: { client: Client; reservationId?: number; reservation?: Reservation }) => 
  emailService.substituerVariables(template, data);

export default emailService;