// backend/src/services/notification.service.ts
import { Op } from 'sequelize';
import Notification, { TypeNotification, GraviteNotification } from '../models/Notification';
import Reservation from '../models/Reservation';
import Payment from '../models/Payment';
import Client from '../models/Client';
import Room from '../models/Room';

const HEURES_ALERTE_ACOMPTE = 48; // RG3 : acompte perçu sous 48h
const HEURES_ALERTE_CONFIRMATION = 24;

interface CandidatNotification {
  type: TypeNotification;
  titre: string;
  message: string;
  gravite: GraviteNotification;
  reservationId?: number;
  clientId?: number;
}

function dansLesProchainesHeures(date: Date, heures: number): boolean {
  const maintenant = new Date();
  const limite = new Date(maintenant.getTime() + heures * 60 * 60 * 1000);
  return date >= maintenant && date <= limite;
}

function depuisPlusDe(date: Date, heures: number): boolean {
  const seuil = new Date(Date.now() - heures * 60 * 60 * 1000);
  return date <= seuil;
}

/**
 * Règle 1 — Acompte manquant à moins de 48h de l'arrivée (RG3, §3.4.2)
 */
async function detecterAcomptesManquants(): Promise<CandidatNotification[]> {
  const reservations = await Reservation.findAll({
    where: {
      statut: { [Op.in]: ['EN_ATTENTE_ACOMPTE', 'CONFIRMEE'] },
    },
    include: [
      {
        model: Payment,
        as: 'paiements',
        required: false,
      },
      {
        model: Client,
        as: 'client',
        attributes: ['prenom', 'nom'],
      },
    ],
  });

  return reservations
    .filter((r: any) => {
      const totalPaye = (r.paiements ?? []).reduce((sum: number, p: any) => sum + Number(p.montant), 0);
      const acompteRequis = Number(r.montantTotal) * 0.3;
      const acompteRecu = totalPaye >= acompteRequis;
      
      return !acompteRecu && dansLesProchainesHeures(new Date(r.dateArrivee), HEURES_ALERTE_ACOMPTE);
    })
    .map((r: any) => ({
      type: 'ACOMPTE_MANQUANT' as TypeNotification,
      titre: '⚠️ Acompte non reçu',
      message: `Acompte non reçu pour ${r.client?.prenom || ''} ${r.client?.nom || ''} - arrivée dans moins de 48h`,
      gravite: 'error' as GraviteNotification,
      reservationId: r.id,
      clientId: r.clientId,
    }));
}

/**
 * Règle 2 — Réservation en attente de confirmation depuis +24h (§3.4.2)
 */
async function detecterConfirmationsEnAttente(): Promise<CandidatNotification[]> {
  const reservations = await Reservation.findAll({
    where: { 
      statut: 'EN_ATTENTE_ACOMPTE',
    },
    include: [
      {
        model: Client,
        as: 'client',
        attributes: ['prenom', 'nom'],
      },
    ],
  });

  return reservations
    .filter((r: any) => depuisPlusDe(new Date(r.dateCreation || r.createdAt), HEURES_ALERTE_CONFIRMATION))
    .map((r: any) => ({
      type: 'CONFIRMATION_ATTENTE' as TypeNotification,
      titre: '⏳ Confirmation en attente',
      message: `Réservation #${r.numero || `RES-${String(r.id).padStart(4, '0')}`} en attente depuis plus de 24h (${r.client?.prenom || ''} ${r.client?.nom || ''})`,
      gravite: 'warning' as GraviteNotification,
      reservationId: r.id,
      clientId: r.clientId,
    }));
}

/**
 * Règle 3 — Impayés à relancer (§3.4.2)
 */
async function detecterImpayes(): Promise<CandidatNotification[]> {
  const reservations = await Reservation.findAll({
    where: { 
      statut: { [Op.in]: ['CONFIRMEE', 'EN_ATTENTE_ACOMPTE'] },
    },
    include: [
      {
        model: Payment,
        as: 'paiements',
        required: false,
      },
      {
        model: Client,
        as: 'client',
        attributes: ['prenom', 'nom'],
      },
    ],
  });

  const impayes = reservations.filter((r: any) => {
    const totalPaye = (r.paiements ?? []).reduce((sum: number, p: any) => sum + Number(p.montant), 0);
    const montantTotal = Number(r.montantTotal);
    return totalPaye < montantTotal && totalPaye > 0;
  });

  return impayes.map((r: any) => {
    const totalPaye = (r.paiements ?? []).reduce((sum: number, p: any) => sum + Number(p.montant), 0);
    const restant = Number(r.montantTotal) - totalPaye;
    
    return {
      type: 'IMPAYE' as TypeNotification,
      titre: '💳 Solde impayé',
      message: `Paiement restant dû pour ${r.client?.prenom || ''} ${r.client?.nom || ''}: ${restant.toFixed(2)}€`,
      gravite: 'warning' as GraviteNotification,
      reservationId: r.id,
      clientId: r.clientId,
    };
  });
}

/**
 * Règle 4 — Arrivées du jour (information positive, §3.2.3 vue d'ensemble)
 */
async function detecterArriveesJour(): Promise<CandidatNotification[]> {
  const debut = new Date();
  debut.setHours(0, 0, 0, 0);
  const fin = new Date();
  fin.setHours(23, 59, 59, 999);

  const reservations = await Reservation.findAll({
    where: {
      dateArrivee: { [Op.between]: [debut, fin] },
      statut: { [Op.in]: ['CONFIRMEE', 'EN_ATTENTE_ACOMPTE'] },
    },
    include: [
      {
        model: Client,
        as: 'client',
        attributes: ['prenom', 'nom'],
      },
      {
        model: Payment,
        as: 'paiements',
        required: false,
      },
      {
        model: Room,
        as: 'chambre',
        attributes: ['nom', 'numero'],
      },
    ],
  });

  return reservations.map((r: any) => {
    const totalPaye = (r.paiements ?? []).reduce((sum: number, p: any) => sum + Number(p.montant), 0);
    const acompteRequis = Number(r.montantTotal) * 0.3;
    const acompteOk = totalPaye >= acompteRequis;
    
    const statutTexte = r.statut === 'EN_ATTENTE_ACOMPTE' 
      ? ' (en attente d\'acompte)' 
      : acompteOk ? '' : ' (acompte non reçu)';

    return {
      type: 'ARRIVEE_JOUR' as TypeNotification,
      titre: '🏠 Arrivée aujourd\'hui',
      message: `${r.client?.prenom || ''} ${r.client?.nom || ''} - ${r.chambre?.nom || 'Chambre'}${statutTexte}`,
      gravite: r.statut === 'EN_ATTENTE_ACOMPTE' ? 'warning' as GraviteNotification : 'success' as GraviteNotification,
      reservationId: r.id,
      clientId: r.clientId,
    };
  });
}

/**
 * Règle 5 — Check-in retardé (§3.2.1 arrivée tardive)
 * ✅ CORRIGÉ : Utilise horaire_arrivee_tardive (TIME) au lieu de arriveeTardive (boolean)
 */
async function detecterCheckinRetarde(): Promise<CandidatNotification[]> {
  const aujourdHui = new Date();
  const debut = new Date(aujourdHui);
  debut.setHours(0, 0, 0, 0);
  const fin = new Date(aujourdHui);
  fin.setHours(23, 59, 59, 999);

  const reservations = await Reservation.findAll({
    where: {
      dateArrivee: { [Op.between]: [debut, fin] },
      statut: { [Op.in]: ['CONFIRMEE', 'EN_ATTENTE_ACOMPTE'] },
      // ✅ CORRECTION : vérifier que horaire_arrivee_tardive n'est pas null
      horaireArriveeTardive: { [Op.not]: null },
    },
    include: [
      {
        model: Client,
        as: 'client',
        attributes: ['prenom', 'nom'],
      },
    ],
  });

  return reservations.map((r: any) => {
    // ✅ Formater l'heure (horaire_arrivee_tardive est de type TIME)
    const heureArrivee = r.horaireArriveeTardive 
      ? typeof r.horaireArriveeTardive === 'string' 
        ? r.horaireArriveeTardive.slice(0, 5) 
        : r.horaireArriveeTardive
      : null;

    return {
      type: 'CHECKIN_RETARDE' as TypeNotification,
      titre: '🕐 Arrivée tardive',
      message: `${r.client?.prenom || ''} ${r.client?.nom || ''} - arrivée prévue après 20h${heureArrivee ? ` (${heureArrivee})` : ''}`,
      gravite: 'info' as GraviteNotification,
      reservationId: r.id,
      clientId: r.clientId,
    };
  });
}

/**
 * Point d'entrée : scanne les règles métier, déduplique via cleUnique,
 * insère les nouvelles alertes, puis retourne les notifications actives
 * (les plus récentes en premier).
 */
export async function genererEtRecupererNotifications(limite = 50) {
  const candidats: CandidatNotification[] = [
    ...(await detecterAcomptesManquants()),
    ...(await detecterConfirmationsEnAttente()),
    ...(await detecterImpayes()),
    ...(await detecterArriveesJour()),
    ...(await detecterCheckinRetarde()),
  ];

  // Dédupliquer par cleUnique
  const uniqueCandidats = new Map<string, CandidatNotification>();
  for (const candidat of candidats) {
    const cleUnique = `${candidat.type}-${candidat.reservationId ?? 'global'}`;
    if (!uniqueCandidats.has(cleUnique)) {
      uniqueCandidats.set(cleUnique, candidat);
    }
  }

  // Créer ou mettre à jour les notifications
  for (const [cleUnique, candidat] of uniqueCandidats) {
    await Notification.findOrCreate({
      where: { cleUnique },
      defaults: { 
        ...candidat, 
        cleUnique, 
        lu: false 
      },
    });
  }

  // Retourner les notifications les plus récentes
  return Notification.findAll({
    order: [['createdAt', 'DESC']],
    limit: limite,
  });
}

/**
 * Marquer une notification comme lue
 */
export async function marquerCommeLue(id: number): Promise<Notification | null> {
  const notification = await Notification.findByPk(id);
  if (!notification) return null;
  notification.lu = true;
  await notification.save();
  return notification;
}

/**
 * Marquer toutes les notifications comme lues
 */
export async function marquerToutesCommeLues(): Promise<void> {
  await Notification.update({ lu: true }, { where: { lu: false } });
}

/**
 * Compter les notifications non lues
 */
export async function compterNonLues(): Promise<number> {
  return Notification.count({ where: { lu: false } });
}

/**
 * Récupérer toutes les notifications non lues
 */
export async function getNotificationsNonLues(): Promise<Notification[]> {
  return Notification.findAll({
    where: { lu: false },
    order: [['createdAt', 'DESC']],
  });
}

/**
 * Supprimer les notifications lues (nettoyage)
 */
export async function nettoyerNotificationsLues(): Promise<number> {
  const deleted = await Notification.destroy({
    where: { lu: true },
  });
  return deleted;
}

/**
 * Récupérer les notifications par type
 */
export async function getNotificationsByType(type: TypeNotification): Promise<Notification[]> {
  return Notification.findAll({
    where: { type },
    order: [['createdAt', 'DESC']],
  });
}

/**
 * Récupérer les notifications par réservation
 */
export async function getNotificationsByReservation(reservationId: number): Promise<Notification[]> {
  return Notification.findAll({
    where: { reservationId },
    order: [['createdAt', 'DESC']],
  });
}