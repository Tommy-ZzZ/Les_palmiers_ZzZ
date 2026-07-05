// backend/src/services/notification.service.ts
import { Op } from 'sequelize';
import Notification, { TypeNotification, GraviteNotification } from '../models/Notification';
import Reservation from '../models/Reservation';
import Payment from '../models/Payment';
import Client from '../models/Client';
import Room from '../models/Room';

const HEURES_ALERTE_ACOMPTE = 48; // RG3 : acompte perçu sous 48h
const HEURES_ALERTE_CONFIRMATION = 24;

// ✅ Cache pour les notifications déjà affichées (auto-disparition)
const NOTIFICATION_CACHE = new Map<string, { read: boolean; timestamp: number }>();
const CACHE_TTL = 30000; // 30 secondes
const NOTIFICATION_DISPLAY_MS = 50; // 0.05s avant auto-disparition

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

// ✅ Générer une clé unique pour une notification
function genererCleUnique(type: TypeNotification, reservationId?: number): string {
  return `${type}-${reservationId ?? 'global'}-${new Date().toISOString().slice(0, 10)}`;
}

// ✅ Vérifier si une notification a déjà été affichée
function isNotificationAffichee(cleUnique: string): boolean {
  const cached = NOTIFICATION_CACHE.get(cleUnique);
  if (cached) {
    // Si la notification a été lue ou affichée, ne pas la réafficher
    return cached.read;
  }
  return false;
}

// ✅ Marquer une notification comme affichée
export function marquerNotificationAffichee(cleUnique: string): void {
  NOTIFICATION_CACHE.set(cleUnique, { read: true, timestamp: Date.now() });
  
  // ✅ Auto-disparition après 0.05s (50ms)
  setTimeout(() => {
    NOTIFICATION_CACHE.delete(cleUnique);
  }, NOTIFICATION_DISPLAY_MS);
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
    const cleUnique = genererCleUnique(candidat.type, candidat.reservationId);
    
    // ✅ Vérifier si la notification a déjà été affichée
    if (isNotificationAffichee(cleUnique)) {
      continue;
    }
    
    if (!uniqueCandidats.has(cleUnique)) {
      uniqueCandidats.set(cleUnique, candidat);
    }
  }

  // Créer ou mettre à jour les notifications
  for (const [cleUnique, candidat] of uniqueCandidats) {
    try {
      const [notification, created] = await Notification.findOrCreate({
        where: { cleUnique },
        defaults: { 
          ...candidat, 
          cleUnique, 
          lu: false 
        },
      });
      
      // ✅ Si la notification vient d'être créée, la marquer comme affichée
      if (created) {
        marquerNotificationAffichee(cleUnique);
      }
    } catch (error) {
      console.error('[notification.service] Erreur création notification:', error);
    }
  }

  // ✅ Supprimer les notifications trop anciennes (plus de 7 jours)
  const septJours = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  await Notification.destroy({
    where: {
      createdAt: { [Op.lt]: septJours },
      lu: true
    }
  });

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
  
  // ✅ Ajouter au cache pour éviter de la réafficher
  const cacheKey = notification.cleUnique || genererCleUnique(notification.type, notification.reservationId || undefined);
  NOTIFICATION_CACHE.set(cacheKey, { read: true, timestamp: Date.now() });
  
  return notification;
}

/**
 * Marquer toutes les notifications comme lues
 */
export async function marquerToutesCommeLues(): Promise<void> {
  await Notification.update({ lu: true }, { where: { lu: false } });
  
  // ✅ Vider le cache
  NOTIFICATION_CACHE.clear();
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

// ✅ Nettoyer le cache périodiquement (toutes les 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of NOTIFICATION_CACHE) {
    if (now - value.timestamp > CACHE_TTL) {
      NOTIFICATION_CACHE.delete(key);
    }
  }
}, 5 * 60 * 1000);