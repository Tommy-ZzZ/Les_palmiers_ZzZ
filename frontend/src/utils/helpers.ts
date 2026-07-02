// E:\Projets\les-palmiers\frontend\src\utils\helpers.ts

import { format, parseISO, differenceInDays, isWeekend, addDays, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';

// ─── Formatage dates ───────────────────────────────────────────────────────────

export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return '—';
  
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(d)) return '—';
    return format(d, 'dd/MM/yyyy', { locale: fr });
  } catch {
    return '—';
  }
};

export const formatDateLong = (date: string | Date | null | undefined): string => {
  if (!date) return '—';
  
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(d)) return '—';
    return format(d, "EEEE d MMMM yyyy", { locale: fr });
  } catch {
    return '—';
  }
};

export const formatDateTime = (date: string | Date | null | undefined): string => {
  if (!date) return '—';
  
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(d)) return '—';
    return format(d, 'dd/MM/yyyy HH:mm', { locale: fr });
  } catch {
    return '—';
  }
};

export const toInputDate = (date: string | Date | null | undefined): string => {
  if (!date) return '';
  
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(d)) return '';
    return format(d, 'yyyy-MM-dd');
  } catch {
    return '';
  }
};

// ─── Calculs séjour ────────────────────────────────────────────────────────────

export const nombreNuits = (dateArrivee: string, dateDepart: string): number => {
  try {
    return differenceInDays(parseISO(dateDepart), parseISO(dateArrivee));
  } catch {
    return 0;
  }
};

export const hasWeekendNight = (dateArrivee: string, dateDepart: string): boolean => {
  try {
    const start = parseISO(dateArrivee);
    const end = parseISO(dateDepart);
    let current = start;
    while (current < end) {
      if (isWeekend(current)) return true;
      current = addDays(current, 1);
    }
    return false;
  } catch {
    return false;
  }
};

// ─── Formatage monétaire ────────────────────────────────────────────────────────

export const formatEuro = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return '—';
  
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return '—';
  }
};

export const formatEuroShort = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return '—';
  
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return '—';
  }
};

// ─── Statuts ────────────────────────────────────────────────────────────────────

export const statutReservationLabel: Record<string, string> = {
  DEMANDE: 'Demande',
  CONFIRMEE: 'Confirmée',
  ANNULEE: 'Annulée',
  TERMINEE: 'Terminée',
  NO_SHOW: 'No-show',
};

export const statutReservationColor: Record<string, string> = {
  DEMANDE: 'warning',
  CONFIRMEE: 'success',
  ANNULEE: 'danger',
  TERMINEE: 'default',
  NO_SHOW: 'danger',
};

export const statutPaiementLabel: Record<string, string> = {
  EN_ATTENTE: 'En attente',
  PARTIEL: 'Partiel',
  COMPLET: 'Complet',
  REMBOURSE: 'Remboursé',
};

export const statutPaiementColor: Record<string, string> = {
  EN_ATTENTE: 'warning',
  PARTIEL: 'warning',
  COMPLET: 'success',
  REMBOURSE: 'default',
};

export const typePaiementLabel: Record<string, string> = {
  ESPECES: 'Espèces',
  CB: 'Carte bancaire',
  VIREMENT: 'Virement',
  CHEQUE: 'Chèque',
  ARRHES: 'Arrhes',
};

export const canalAcquisitionLabel: Record<string, string> = {
  DIRECT: 'Direct',
  BOOKING: 'Booking.com',
  AIRBNB: 'Airbnb',
  TELEPHONE: 'Téléphone',
  EMAIL: 'Email',
  AUTRE: 'Autre',
};

// ─── Divers ─────────────────────────────────────────────────────────────────────

export const capitalize = (str: string): string => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const truncate = (str: string, maxLen = 50): string => {
  if (!str) return '';
  return str.length <= maxLen ? str : str.slice(0, maxLen) + '…';
};

export const initiales = (prenom: string, nom: string): string => {
  if (!prenom && !nom) return '?';
  return `${(prenom?.[0] || '').toUpperCase()}${(nom?.[0] || '').toUpperCase()}`;
};

export const getInitials = (prenom: string, nom: string): string => {
  return initiales(prenom, nom);
};

export const getOccupationColor = (taux: number): string => {
  if (taux >= 80) return 'text-success-600';
  if (taux >= 50) return 'text-warning-600';
  return 'text-gray-500';
};

// ─── Offline detection ──────────────────────────────────────────────────────────

export const isOffline = (): boolean => !navigator.onLine;

// localStorage fallback pour données critiques hors ligne
export const saveToLocal = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(`palmiers_${key}`, JSON.stringify(data));
  } catch {
    console.warn('localStorage indisponible');
  }
};

export const loadFromLocal = <T>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(`palmiers_${key}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};