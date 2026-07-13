// backend/src/services/email.service.ts
import { Reservation, Client, Room, EmailTemplate, SentEmail, MessageEmail } from '../models';
import nodemailer from 'nodemailer';
import { Op } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

export class EmailService {
  private transporter: nodemailer.Transporter;
  private isConfigured: boolean = false;

  constructor() {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    // ✅ Vérification des credentials (corrigée : condition simplifiée et
    // comparaison insensible à la casse pour détecter les placeholders)
    if (host && user && pass) {
      const hasValidCreds = 
                           !user.toLowerCase().includes('votre_email') && 
                           !pass.toLowerCase().includes('votre_mot_de_passe');
      
      if (hasValidCreds) {
        this.transporter = nodemailer.createTransport({
          host: host,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true' || false,
          auth: {
            user: user,
            pass: pass
          },
          tls: {
            rejectUnauthorized: false
          }
        });
        this.isConfigured = true;
        console.log('📧 Service email configuré avec OVH');
      } else {
        console.log('⚠️ Service email: credentials par défaut non configurés');
        this.isConfigured = false;
      }
    } else {
      console.log('⚠️ Service email: variables d\'environnement SMTP manquantes');
      this.isConfigured = false;
    }

    // ✅ Fallback pour le développement : Ethereal (faux SMTP de test)
    if (!this.isConfigured && process.env.NODE_ENV === 'development') {
      console.log('📧 Service email: utilisation d\'Ethereal (mode test)');
      // Créer un transporteur factice qui log seulement
      this.transporter = {
        sendMail: async (mailOptions: any) => {
          console.log('📧 [DEV] Email simulé:');
          console.log(`  To: ${mailOptions.to}`);
          console.log(`  Subject: ${mailOptions.subject}`);
          console.log(`  Body: ${mailOptions.html?.substring(0, 200)}...`);
          return { messageId: `dev-${Date.now()}` };
        }
      } as any;
      this.isConfigured = true;
    }
  }

  // ─── METHODE D'ENVOI PRINCIPALE ─────────────────────────────────────────────

  async envoyerViaOVH(to: string, subject: string, html: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured) {
      console.warn('📧 [Email] Service non configuré, simulation d\'envoi');
      console.log(`  To: ${to}`);
      console.log(`  Subject: ${subject}`);
      return { success: true, error: 'SIMULATION: service non configuré' };
    }

    try {
      const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'contact@lespalmiers-reunion.re';
      
      const info = await this.transporter.sendMail({
        from: from,
        to: to,
        subject: subject,
        html: html,
        // Headers pour améliorer la délivrabilité
        headers: {
          'X-Mailer': 'Les Palmiers - Gîte de charme',
          'X-Priority': '3',
          'List-Unsubscribe': `<mailto:${from}?subject=unsubscribe>`
        }
      });

      console.log(`📧 [Email] Envoyé à ${to} - ID: ${info.messageId}`);
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

      // ✅ Récupérer le template depuis la table Message (qui stocke les modèles)
      const template = await Message.findOne({
        where: { type: 'CONFIRMATION', valide: true }
      });

      let sujet = `Confirmation de réservation - ${reservation.numero || ''}`;
      let corps = `
        <h1>Confirmation de réservation</h1>
        <p>Bonjour ${reservation.client.prenom} ${reservation.client.nom},</p>
        <p>Nous confirmons votre réservation du ${new Date(reservation.dateArrivee).toLocaleDateString('fr-FR')} au ${new Date(reservation.dateDepart).toLocaleDateString('fr-FR')}.</p>
        <p>Chambre : ${reservation.chambre?.nom || ''}</p>
        <p>Montant total : ${reservation.montantTotal || 0} €</p>
        <p>Acompte versé : ${reservation.montantAcompte || 0} €</p>
        <p>Solde restant : ${(reservation.montantTotal || 0) - (reservation.montantAcompte || 0)} €</p>
        <br>
        <p>Cordialement,</p>
        <p>L'équipe des Palmiers de l'Entre-Deux</p>
      `;

      if (template) {
        const variables = this.prepareVariables(reservation);
        sujet = this.remplacerVariables(template.sujet, variables);
        corps = this.remplacerVariables(template.corps, variables);
      }

      await this.envoyerEmailAvecHistorique(
        reservation.client.email,
        sujet,
        corps,
        'CONFIRMATION',
        reservation.client.id,
        reservation.id,
        template?.id
      );

      await SentEmail.create({
        reservationId,
        modeleId: template?.id,
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

      const template = await Message.findOne({
        where: { type: 'RAPPEL_J7', valide: true }
      });

      let sujet = `Rappel : Votre séjour aux Palmiers commence dans 7 jours`;
      let corps = `
        <h1>Rappel de séjour</h1>
        <p>Bonjour ${reservation.client.prenom} ${reservation.client.nom},</p>
        <p>Votre séjour aux Palmiers de l'Entre-Deux commence dans 7 jours !</p>
        <p>Dates : du ${new Date(reservation.dateArrivee).toLocaleDateString('fr-FR')} au ${new Date(reservation.dateDepart).toLocaleDateString('fr-FR')}</p>
        <p>Chambre : ${reservation.chambre?.nom || ''}</p>
        <br>
        <p>Informations pratiques :</p>
        <ul>
          <li>Arrivée à partir de 15h</li>
          <li>Départ avant 11h</li>
          <li>Petit-déjeuner servi de 7h à 10h</li>
        </ul>
        <br>
        <p>Au plaisir de vous accueillir,</p>
        <p>L'équipe des Palmiers de l'Entre-Deux</p>
      `;

      if (template) {
        const variables = this.prepareVariables(reservation);
        sujet = this.remplacerVariables(template.sujet, variables);
        corps = this.remplacerVariables(template.corps, variables);
      }

      await this.envoyerEmailAvecHistorique(
        reservation.client.email,
        sujet,
        corps,
        'RAPPEL_J7',
        reservation.client.id,
        reservation.id,
        template?.id
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

      const template = await Message.findOne({
        where: { type: 'REMERCIEMENT_J2', valide: true }
      });

      let sujet = `Merci pour votre séjour aux Palmiers !`;
      let corps = `
        <h1>Merci pour votre séjour !</h1>
        <p>Bonjour ${reservation.client.prenom} ${reservation.client.nom},</p>
        <p>Nous espérons que votre séjour aux Palmiers de l'Entre-Deux s'est bien passé.</p>
        <p>N'hésitez pas à nous laisser un avis, nous serions ravis de vous accueillir à nouveau.</p>
        <br>
        <p>À bientôt,</p>
        <p>L'équipe des Palmiers de l'Entre-Deux</p>
      `;

      if (template) {
        const variables = this.prepareVariables(reservation);
        sujet = this.remplacerVariables(template.sujet, variables);
        corps = this.remplacerVariables(template.corps, variables);
      }

      await this.envoyerEmailAvecHistorique(
        reservation.client.email,
        sujet,
        corps,
        'REMERCIEMENT_J2',
        reservation.client.id,
        reservation.id,
        template?.id
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

      const template = await Message.findOne({
        where: { type: 'ANNULATION', valide: true }
      });

      let sujet = `Annulation de réservation - ${reservation.numero || ''}`;
      let corps = `
        <h1>Annulation de réservation</h1>
        <p>Bonjour ${reservation.client.prenom} ${reservation.client.nom},</p>
        <p>Nous accusons réception de votre annulation pour la réservation ${reservation.numero || ''}.</p>
        <p>Pénalité appliquée : ${penalite} €</p>
        <p>Conditions : Annulation gratuite jusqu'à 7 jours avant, 50% entre 7 et 2 jours, 100% moins de 2 jours</p>
        <br>
        <p>Cordialement,</p>
        <p>L'équipe des Palmiers de l'Entre-Deux</p>
      `;

      if (template) {
        const variables = { ...this.prepareVariables(reservation), penalite };
        sujet = this.remplacerVariables(template.sujet, variables);
        corps = this.remplacerVariables(template.corps, variables);
      }

      await this.envoyerEmailAvecHistorique(
        reservation.client.email,
        sujet,
        corps,
        'ANNULATION',
        reservation.client.id,
        reservation.id,
        template?.id
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

      const template = await Message.findOne({
        where: { type: 'RELANCE_PAIEMENT', valide: true }
      });

      const solde = (reservation.montantTotal || 0) - (reservation.montantAcompte || 0);

      let sujet = `Rappel de paiement - Réservation ${reservation.numero || ''}`;
      let corps = `
        <h1>Rappel de paiement</h1>
        <p>Bonjour ${reservation.client.prenom} ${reservation.client.nom},</p>
        <p>Nous vous rappelons qu'un paiement est en attente pour votre réservation.</p>
        <p>Solde restant : ${solde} €</p>
        <p>Date limite : ${new Date(reservation.dateArrivee).toLocaleDateString('fr-FR')}</p>
        <br>
        <p>Merci de régulariser votre situation.</p>
        <p>Cordialement,</p>
        <p>L'équipe des Palmiers de l'Entre-Deux</p>
      `;

      if (template) {
        const variables = { ...this.prepareVariables(reservation), solde };
        sujet = this.remplacerVariables(template.sujet, variables);
        corps = this.remplacerVariables(template.corps, variables);
      }

      await this.envoyerEmailAvecHistorique(
        reservation.client.email,
        sujet,
        corps,
        'RELANCE_PAIEMENT',
        reservation.client.id,
        reservation.id,
        template?.id
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
        dateArrivee: {
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
        dateDepart: {
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

    const impayes = reservations.filter(r => (r.montantTotal || 0) - (r.montantAcompte || 0) > 0);

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

  // ─── SUBSTITUTION AVEC OBJET COMPLET (utilisée par le contrôleur Communication) ──

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
      const arrivee = new Date((reservation as any).dateArrivee);
      const depart = new Date((reservation as any).dateDepart);
      const nbNuits = Math.ceil((depart.getTime() - arrivee.getTime()) / (1000 * 60 * 60 * 24));

      result = result.replace(/{{date_arrivee}}/g, arrivee.toLocaleDateString('fr-FR'));
      result = result.replace(/{{date_depart}}/g, depart.toLocaleDateString('fr-FR'));
      result = result.replace(/{{numero_reservation}}/g, (reservation as any).numero || '');
      result = result.replace(/{{montant_total}}/g, String((reservation as any).montantTotal || 0));
      result = result.replace(/{{acompte}}/g, String((reservation as any).montantAcompte || 0));
      result = result.replace(/{{solde}}/g, String(((reservation as any).montantTotal || 0) - ((reservation as any).montantAcompte || 0)));
      result = result.replace(/{{nb_adultes}}/g, String((reservation as any).nbAdultes || 0));
      result = result.replace(/{{nb_enfants}}/g, String((reservation as any).nbEnfants || 0));
      result = result.replace(/{{nb_nuits}}/g, String(nbNuits));

      const chambre = (reservation as any).chambre;
      if (chambre) {
        result = result.replace(/{{chambre_nom}}/g, chambre.nom || '');
        result = result.replace(/{{chambre_numero}}/g, chambre.numero || '');
      }

      const dateLimite = new Date((reservation as any).dateArrivee);
      dateLimite.setDate(dateLimite.getDate() - 7);
      result = result.replace(/{{date_limite_paiement}}/g, dateLimite.toLocaleDateString('fr-FR'));
    }

    result = result.replace(/{{conditions_annulation}}/g, "Annulation gratuite jusqu'à 7 jours avant l'arrivée, 50% entre 7 et 2 jours, 100% moins de 2 jours");

    return result;
  }

  async envoyerViaOVHSimple(params: { to: string; subject: string; html: string }) {
    return this.envoyerViaOVH(params.to, params.subject, params.html);
  }

  // ✅ AJOUT : méthode pour tester la configuration email
  async testerConfigEmail(): Promise<{ success: boolean; message: string }> {
    if (!this.isConfigured) {
      return { success: false, message: 'Service email non configuré' };
    }

    try {
      // Tester l'envoi à soi-même
      const testEmail = process.env.SMTP_FROM || process.env.SMTP_USER;
      if (!testEmail) {
        return { success: false, message: 'Aucun email de test configuré' };
      }

      const result = await this.envoyerViaOVH(
        testEmail,
        'Test - Configuration email Les Palmiers',
        '<h1>Test réussi !</h1><p>Votre configuration email fonctionne correctement.</p>'
      );

      if (result.success) {
        return { success: true, message: `Email de test envoyé à ${testEmail}` };
      } else {
        return { success: false, message: result.error || 'Erreur inconnue' };
      }
    } catch (error: any) {
      return { success: false, message: error.message };
    }
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
export const testerConfigEmail = () => emailService.testerConfigEmail();

export default emailService;