// E:\Projets\les-palmiers\frontend\src\pages\DashboardPage.tsx
// Version avec API complète connectée

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BedDouble, CalendarCheck, TrendingUp, Users,
  Clock, Euro, Eye, Bike, Plane, MapPin, Building, Calendar,
  BarChart3, PieChart, Activity, Star, TrendingDown, Sparkles,
  RefreshCw, ChevronRight, ChevronLeft, Award, Gift, Zap,
  AlertCircle, UserCheck, UserX, Mail, Phone, X, Loader2,
  CreditCard, Wallet, Receipt, DollarSign, CircleDollarSign,
  CheckCircle2, AlertTriangle, Clock as ClockIcon
} from 'lucide-react';
import {
  BarChart, Bar, PieChart as RePieChart, Pie,
  Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area
} from 'recharts';
import api from '../services/api';
import { formatDate, formatEuro, initiales } from '../utils/helpers';
import toast from 'react-hot-toast';

// ============================================
// TYPES
// ============================================

type StatutChambre = 'DISPONIBLE' | 'EN_MAINTENANCE' | 'HORS_SERVICE' | 'BLOQUEE' | 'OCCUPEE';
type StatutReservation = 'EN_ATTENTE_ACOMPTE' | 'CONFIRMEE' | 'ANNULEE' | 'TERMINEE' | 'NO_SHOW';
type StatutClient = 'NOUVEAU' | 'REGULIER' | 'VIP';
type SegmentClient = 'TOURISTE_INDIVIDUEL' | 'COUPLE' | 'FAMILLE' | 'GROUPE' | 'VOYAGEUR_AFFAIRES';
type CanalAcquisition = 'DIRECT' | 'SITE_WEB' | 'BOOKING' | 'AGENCE_LOCALE' | 'BOUCHE_A_OREILLE';
type TypeService = 'LOCATION_VELO' | 'TRANSFERT_AEROPORT' | 'ACTIVITE_GUIDE';
type StatutPaiement = 'COMPLET' | 'PARTIEL' | 'EN_ATTENTE' | 'IMPREVU';
type ModePaiement = 'ESPECES' | 'CARTE' | 'VIREMENT' | 'CHEQUE';
type TypeVersement = 'ACOMPTE' | 'SOLDE' | 'ARRHES';

interface Chambre {
  idChambre: number;
  numero: string;
  nom: string;
  capaciteAdultes: number;
  nbLitsSimples: number;
  nbLitsDoubles: number;
  nbLitsBebe: number;
  surfaceM2: number;
  vue: 'JARDIN' | 'PISCINE' | 'MONTAGNE';
  accessiblePMR: boolean;
  statut: StatutChambre;
  equipements: string[];
}

interface Client {
  id: number;
  civilite: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  adresse: string;
  code_postal: string;
  ville: string;
  pays: string;
  statut: StatutClient;
  segment: SegmentClient;
  origine_geographique: string;
  canal_acquisition: CanalAcquisition;
  allergies?: string;
  regime_alimentaire?: string;
  chambre_preferee?: string;
  nb_sejours: number;
  montant_total_depense: number;
  date_creation: string;
  vip: boolean;
}

interface Paiement {
  idPaiement: number;
  montant: number;
  mode: ModePaiement;
  typeVersement: TypeVersement;
  dateHeure: Date;
  reference: string;
  reservationId?: number;
  statut?: StatutPaiement;
}

interface ServiceAnnexe {
  idService: number;
  type: TypeService;
  dateHeureDebut: Date;
  dateHeureFin: Date;
  montant: number;
  statut: string;
  notes?: string;
  details?: any;
}

interface Reservation {
  idReservation: number;
  numeroReservation: string;
  dateArrivee: Date;
  dateDepart: Date;
  nbAdultes: number;
  nbEnfants: number;
  nbNuits: number;
  statut: StatutReservation;
  petitDejeunerInclus: boolean;
  montantTotal: number;
  montantAcompte: number;
  montantSolde: number;
  montantRestantDu: number;
  demandeSpeciale?: string;
  heureArriveePrevisionnelle?: string;
  litBebe: boolean;
  arriveeTardive: boolean;
  dateCreation: Date;
  motifAnnulation?: string;
  chambre: Chambre;
  client: Client;
  servicesAnnexes: ServiceAnnexe[];
  paiements: Paiement[];
}

interface PaiementStats {
  totalEncaissements: number;
  totalAcomptes: number;
  totalSoldes: number;
  totalArrhs: number;
  totalImpayes: number;
  paiementsRecents: Paiement[];
  statutPaiements: {
    COMPLET: number;
    PARTIEL: number;
    EN_ATTENTE: number;
    IMPREVU: number;
  };
  paiementsParMode: {
    ESPECES: number;
    CARTE: number;
    VIREMENT: number;
    CHEQUE: number;
  };
}

// ============================================
// DONNÉES STATIQUES (fallback)
// ============================================

const CHAMBRES_STATIC: Chambre[] = [
  { idChambre: 1, numero: '101', nom: 'Chambre Vanille', capaciteAdultes: 2, nbLitsSimples: 0, nbLitsDoubles: 1, nbLitsBebe: 1, surfaceM2: 18, vue: 'JARDIN', accessiblePMR: false, statut: 'DISPONIBLE', equipements: ['climatisation', 'ventilateur', 'sèche-cheveux', 'bouilloire', 'mini-réfrigérateur'] },
  { idChambre: 2, numero: '102', nom: 'Chambre Coco', capaciteAdultes: 2, nbLitsSimples: 1, nbLitsDoubles: 0, nbLitsBebe: 0, surfaceM2: 16, vue: 'PISCINE', accessiblePMR: false, statut: 'DISPONIBLE', equipements: ['ventilateur', 'sèche-cheveux', 'bouilloire'] },
  { idChambre: 3, numero: '103', nom: 'Chambre Ylang', capaciteAdultes: 2, nbLitsSimples: 0, nbLitsDoubles: 1, nbLitsBebe: 1, surfaceM2: 20, vue: 'MONTAGNE', accessiblePMR: false, statut: 'DISPONIBLE', equipements: ['climatisation', 'ventilateur', 'sèche-cheveux', 'bouilloire', 'mini-réfrigérateur'] },
  { idChambre: 4, numero: '104', nom: 'Chambre Vétiver', capaciteAdultes: 2, nbLitsSimples: 0, nbLitsDoubles: 1, nbLitsBebe: 0, surfaceM2: 17, vue: 'JARDIN', accessiblePMR: true, statut: 'DISPONIBLE', equipements: ['climatisation', 'sèche-cheveux', 'bouilloire', 'mini-réfrigérateur'] },
  { idChambre: 5, numero: '201', nom: 'Suite Bougainvillée', capaciteAdultes: 4, nbLitsSimples: 2, nbLitsDoubles: 1, nbLitsBebe: 1, surfaceM2: 35, vue: 'PISCINE', accessiblePMR: false, statut: 'OCCUPEE', equipements: ['climatisation', 'ventilateur', 'sèche-cheveux', 'bouilloire', 'mini-réfrigérateur'] },
  { idChambre: 6, numero: '202', nom: 'Chambre Géranium', capaciteAdultes: 2, nbLitsSimples: 0, nbLitsDoubles: 1, nbLitsBebe: 0, surfaceM2: 19, vue: 'MONTAGNE', accessiblePMR: false, statut: 'EN_MAINTENANCE', equipements: ['ventilateur', 'sèche-cheveux', 'bouilloire'] }
];

const CLIENTS_STATIC: Client[] = [
  { id: 1, civilite: 'Mme', nom: 'DUPONT', prenom: 'Marie', email: 'marie.dupont@email.fr', telephone: '0612345678', adresse: '15 Rue des Lilas', code_postal: '75001', ville: 'Paris', pays: 'France', statut: 'REGULIER', segment: 'COUPLE', origine_geographique: 'METROPOLE', canal_acquisition: 'BOUCHE_A_OREILLE', allergies: 'Aucune', regime_alimentaire: 'Végétarien', chambre_preferee: 'Chambre Vanille', nb_sejours: 4, montant_total_depense: 1850, date_creation: '2024-01-15', vip: false },
  { id: 2, civilite: 'M.', nom: 'MARTIN', prenom: 'Jean', email: 'jean.martin@email.fr', telephone: '0687654321', adresse: '8 Avenue des Palmiers', code_postal: '13001', ville: 'Marseille', pays: 'France', statut: 'VIP', segment: 'VOYAGEUR_AFFAIRES', origine_geographique: 'METROPOLE', canal_acquisition: 'DIRECT', allergies: 'Arachides', regime_alimentaire: 'Sans gluten', chambre_preferee: 'Suite Bougainvillée', nb_sejours: 5, montant_total_depense: 3420, date_creation: '2023-08-10', vip: true },
  { id: 3, civilite: 'Mme', nom: 'BERNARD', prenom: 'Sophie', email: 'sophie.bernard@email.fr', telephone: '0678945612', adresse: '3 Rue des Orchidées', code_postal: '69001', ville: 'Lyon', pays: 'France', statut: 'NOUVEAU', segment: 'FAMILLE', origine_geographique: 'METROPOLE', canal_acquisition: 'SITE_WEB', allergies: 'Lactose', nb_sejours: 1, montant_total_depense: 890, date_creation: '2026-05-20', vip: false },
  { id: 4, civilite: 'M.', nom: 'ROBERT', prenom: 'Thomas', email: 'thomas.robert@email.fr', telephone: '0645123678', adresse: '12 Rue de la Mer', code_postal: '97440', ville: 'L\'Entre-Deux', pays: 'France', statut: 'REGULIER', segment: 'TOURISTE_INDIVIDUEL', origine_geographique: 'AUTRES_DOM_TOM', canal_acquisition: 'AGENCE_LOCALE', allergies: 'Aucune', nb_sejours: 3, montant_total_depense: 720, date_creation: '2025-02-01', vip: false },
  { id: 5, civilite: 'Mme', nom: 'RICHARD', prenom: 'Julie', email: 'julie.richard@email.fr', telephone: '0632147856', adresse: '25 Rue des Vacances', code_postal: '97400', ville: 'Saint-Denis', pays: 'France', statut: 'NOUVEAU', segment: 'GROUPE', origine_geographique: 'AUTRES_DOM_TOM', canal_acquisition: 'BOOKING', allergies: 'Fruits de mer', nb_sejours: 1, montant_total_depense: 450, date_creation: '2026-06-01', vip: false }
];

const PAIEMENTS_STATIC: Paiement[] = [
  { idPaiement: 1, montant: 135, mode: 'CARTE', typeVersement: 'ACOMPTE', dateHeure: new Date(2026, 5, 25), reference: 'PAY-2026-0001', reservationId: 1 },
  { idPaiement: 2, montant: 84, mode: 'VIREMENT', typeVersement: 'ACOMPTE', dateHeure: new Date(2026, 5, 26), reference: 'PAY-2026-0002', reservationId: 3 },
  { idPaiement: 3, montant: 216, mode: 'CARTE', typeVersement: 'ACOMPTE', dateHeure: new Date(2026, 5, 22), reference: 'PAY-2026-0003', reservationId: 4 },
  { idPaiement: 4, montant: 117, mode: 'CARTE', typeVersement: 'ACOMPTE', dateHeure: new Date(2026, 5, 20), reference: 'PAY-2026-0004', reservationId: 5 },
  { idPaiement: 5, montant: 273, mode: 'ESPECES', typeVersement: 'SOLDE', dateHeure: new Date(2026, 5, 28), reference: 'PAY-2026-0005', reservationId: 5 },
  { idPaiement: 6, montant: 168, mode: 'CARTE', typeVersement: 'ACOMPTE', dateHeure: new Date(2026, 5, 15), reference: 'PAY-2026-0006', reservationId: 6 }
];

const generateReservationsStatic = (): Reservation[] => {
  const today = new Date();
  return [
    {
      idReservation: 1, numeroReservation: 'RES-2026-0001',
      dateArrivee: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
      dateDepart: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3),
      nbAdultes: 2, nbEnfants: 0, nbNuits: 3, statut: 'CONFIRMEE',
      petitDejeunerInclus: true, montantTotal: 450, montantAcompte: 135, montantSolde: 315, montantRestantDu: 0,
      heureArriveePrevisionnelle: '15:00', litBebe: false, arriveeTardive: false,
      dateCreation: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7),
      chambre: CHAMBRES_STATIC[0], client: CLIENTS_STATIC[0], servicesAnnexes: [],
      paiements: [PAIEMENTS_STATIC[0]]
    },
    {
      idReservation: 2, numeroReservation: 'RES-2026-0002',
      dateArrivee: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
      dateDepart: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5),
      nbAdultes: 2, nbEnfants: 2, nbNuits: 5, statut: 'EN_ATTENTE_ACOMPTE',
      petitDejeunerInclus: false, montantTotal: 890, montantAcompte: 267, montantSolde: 623, montantRestantDu: 890,
      demandeSpeciale: 'Lit bébé requis', heureArriveePrevisionnelle: '18:00', litBebe: true, arriveeTardive: true,
      dateCreation: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1),
      chambre: CHAMBRES_STATIC[4], client: CLIENTS_STATIC[2], servicesAnnexes: [], paiements: []
    },
    {
      idReservation: 3, numeroReservation: 'RES-2026-0003',
      dateArrivee: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2),
      dateDepart: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 4),
      nbAdultes: 1, nbEnfants: 0, nbNuits: 2, statut: 'CONFIRMEE',
      petitDejeunerInclus: true, montantTotal: 280, montantAcompte: 84, montantSolde: 196, montantRestantDu: 196,
      heureArriveePrevisionnelle: '14:00', litBebe: false, arriveeTardive: false,
      dateCreation: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3),
      chambre: CHAMBRES_STATIC[3], client: CLIENTS_STATIC[3],
      servicesAnnexes: [{ idService: 1, type: 'LOCATION_VELO', dateHeureDebut: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 9, 0), dateHeureFin: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 17, 0), montant: 25, statut: 'CONFIRME', details: { typeVelo: 'VTT', taille: 'M' } }],
      paiements: [PAIEMENTS_STATIC[1]]
    },
    {
      idReservation: 4, numeroReservation: 'RES-2026-0004',
      dateArrivee: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5),
      dateDepart: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10),
      nbAdultes: 2, nbEnfants: 0, nbNuits: 5, statut: 'CONFIRMEE',
      petitDejeunerInclus: true, montantTotal: 720, montantAcompte: 216, montantSolde: 504, montantRestantDu: 504,
      heureArriveePrevisionnelle: '16:00', litBebe: false, arriveeTardive: false,
      dateCreation: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 10),
      chambre: CHAMBRES_STATIC[4], client: CLIENTS_STATIC[1],
      servicesAnnexes: [{ idService: 2, type: 'TRANSFERT_AEROPORT', dateHeureDebut: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5, 10, 0), dateHeureFin: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5, 11, 0), montant: 45, statut: 'CONFIRME', details: { sens: 'ALLER', numeroVol: 'AF 123', nbPersonnes: 2 } }],
      paiements: [PAIEMENTS_STATIC[2]]
    },
    {
      idReservation: 5, numeroReservation: 'RES-2026-0005',
      dateArrivee: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2),
      dateDepart: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
      nbAdultes: 2, nbEnfants: 0, nbNuits: 2, statut: 'TERMINEE',
      petitDejeunerInclus: true, montantTotal: 390, montantAcompte: 117, montantSolde: 273, montantRestantDu: 0,
      heureArriveePrevisionnelle: '14:30', litBebe: false, arriveeTardive: false,
      dateCreation: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 15),
      chambre: CHAMBRES_STATIC[0], client: CLIENTS_STATIC[4], servicesAnnexes: [],
      paiements: [PAIEMENTS_STATIC[3], PAIEMENTS_STATIC[4]]
    },
    {
      idReservation: 6, numeroReservation: 'RES-2026-0006',
      dateArrivee: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
      dateDepart: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3),
      nbAdultes: 3, nbEnfants: 1, nbNuits: 2, statut: 'ANNULEE',
      petitDejeunerInclus: false, montantTotal: 560, montantAcompte: 168, montantSolde: 392, montantRestantDu: 0,
      motifAnnulation: 'Problème de santé', demandeSpeciale: 'Allergie aux acariens',
      heureArriveePrevisionnelle: '20:00', litBebe: true, arriveeTardive: true,
      dateCreation: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 20),
      chambre: CHAMBRES_STATIC[2], client: CLIENTS_STATIC[0], servicesAnnexes: [],
      paiements: [PAIEMENTS_STATIC[5]]
    }
  ];
};

const RESERVATIONS_STATIC = generateReservationsStatic();

// ============================================
// DONNÉES POUR LES GRAPHIQUES
// ============================================

const OCCUPANCY_DATA = [
  { date: 'Lun', occupées: 3, disponibles: 3 },
  { date: 'Mar', occupées: 4, disponibles: 2 },
  { date: 'Mer', occupées: 4, disponibles: 2 },
  { date: 'Jeu', occupées: 5, disponibles: 1 },
  { date: 'Ven', occupées: 4, disponibles: 2 },
  { date: 'Sam', occupées: 3, disponibles: 3 },
  { date: 'Dim', occupées: 2, disponibles: 4 }
];

const REVENUE_DATA = [
  { mois: 'Jan', revenus: 8200 },
  { mois: 'Fév', revenus: 7500 },
  { mois: 'Mar', revenus: 9100 },
  { mois: 'Avr', revenus: 8800 },
  { mois: 'Mai', revenus: 10200 },
  { mois: 'Juin', revenus: 12450 }
];

const ACQUISITION_DATA = [
  { name: 'Direct', value: 12, color: '#10b981' },
  { name: 'Site Web', value: 8, color: '#3b82f6' },
  { name: 'Booking', value: 5, color: '#ef4444' },
  { name: 'Agence', value: 4, color: '#f59e0b' },
  { name: 'Bouche-à-oreille', value: 6, color: '#8b5cf6' }
];

// ============================================
// NORMALISATION API
// ============================================

const toDate = (value: any) => (value ? new Date(value) : new Date());

const normalizeChambre = (c: any): Chambre => ({
  idChambre: c?.idChambre ?? c?.id ?? 0,
  numero: c?.numero ?? '',
  nom: c?.nom ?? '',
  capaciteAdultes: c?.capaciteAdultes ?? c?.capacite_adultes ?? c?.capacite ?? 2,
  nbLitsSimples: c?.nbLitsSimples ?? c?.nb_lits_simples ?? 0,
  nbLitsDoubles: c?.nbLitsDoubles ?? c?.nb_lits_doubles ?? 0,
  nbLitsBebe: c?.nbLitsBebe ?? c?.nb_lits_bebe ?? 0,
  surfaceM2: c?.surfaceM2 ?? c?.surface_m2 ?? c?.surface ?? 0,
  vue: c?.vue ?? 'JARDIN',
  accessiblePMR: c?.accessiblePMR ?? c?.accessible_pmr ?? false,
  statut: c?.statut ?? 'DISPONIBLE',
  equipements: c?.equipements ?? []
});

const normalizeClient = (c: any): Client => ({
  id: c?.id ?? 0,
  civilite: c?.civilite ?? '',
  nom: c?.nom ?? '',
  prenom: c?.prenom ?? '',
  email: c?.email ?? '',
  telephone: c?.telephone ?? '',
  adresse: c?.adresse ?? '',
  code_postal: c?.code_postal ?? c?.codePostal ?? '',
  ville: c?.ville ?? '',
  pays: c?.pays ?? 'France',
  statut: c?.statut ?? 'NOUVEAU',
  segment: c?.segment ?? 'TOURISTE_INDIVIDUEL',
  origine_geographique: c?.origine_geographique ?? c?.origineGeo ?? '',
  canal_acquisition: c?.canal_acquisition ?? c?.canalAcquisition ?? 'DIRECT',
  allergies: c?.allergies,
  regime_alimentaire: c?.regime_alimentaire ?? c?.regimeAlimentaire,
  chambre_preferee: c?.chambre_preferee ?? c?.chambrePreferee,
  nb_sejours: c?.nb_sejours ?? c?.nbSejours ?? 0,
  montant_total_depense: c?.montant_total_depense ?? c?.montantTotalDepense ?? 0,
  date_creation: c?.date_creation ?? c?.dateCreation ?? new Date().toISOString(),
  vip: c?.vip ?? false
});

const normalizePaiement = (p: any): Paiement => ({
  idPaiement: p?.idPaiement ?? p?.id ?? 0,
  montant: Number(p?.montant ?? 0),
  mode: p?.mode ?? 'CARTE',
  typeVersement: p?.typeVersement ?? p?.type ?? 'ACOMPTE',
  dateHeure: toDate(p?.dateHeure ?? p?.date),
  reference: p?.reference ?? '',
  reservationId: p?.reservationId ?? p?.reservation_id,
  statut: p?.statut ?? 'COMPLET'
});

const normalizeReservation = (r: any): Reservation => {
  const dateArrivee = toDate(r?.dateArrivee ?? r?.date_arrivee);
  const dateDepart = toDate(r?.dateDepart ?? r?.date_depart);
  const nbNuits = r?.nbNuits ?? r?.nb_nuits ?? Math.max(1, Math.ceil((dateDepart.getTime() - dateArrivee.getTime()) / 86400000) || 1);

  // Normaliser le client avec fallback
  const clientData = r?.client ?? {};
  const client = normalizeClient(clientData);

  // Normaliser la chambre avec fallback
  const chambreData = r?.chambre ?? {};
  const chambre = normalizeChambre(chambreData);

  return {
    idReservation: r?.idReservation ?? r?.id ?? 0,
    numeroReservation: r?.numeroReservation ?? r?.numero ?? '',
    dateArrivee,
    dateDepart,
    nbAdultes: r?.nbAdultes ?? r?.nb_adultes ?? 1,
    nbEnfants: r?.nbEnfants ?? r?.nb_enfants ?? 0,
    nbNuits,
    statut: r?.statut ?? 'CONFIRMEE',
    petitDejeunerInclus: r?.petitDejeunerInclus ?? r?.petit_dejeuner_inclus ?? false,
    montantTotal: Number(r?.montantTotal ?? r?.montant_total ?? 0),
    montantAcompte: Number(r?.montantAcompte ?? r?.montant_acompte ?? 0),
    montantSolde: Number(r?.montantSolde ?? r?.montant_solde ?? 0),
    montantRestantDu: Number(r?.montantRestantDu ?? r?.montant_restant_du ?? 0),
    demandeSpeciale: r?.demandeSpeciale ?? r?.demandesSpeciales ?? r?.demande_speciale,
    heureArriveePrevisionnelle: r?.heureArriveePrevisionnelle ?? r?.horaireArriveeTardive ?? r?.horaire_arrivee_tardive,
    litBebe: r?.litBebe ?? r?.lit_bebe ?? false,
    arriveeTardive: r?.arriveeTardive ?? !!(r?.horaireArriveeTardive ?? r?.horaire_arrivee_tardive),
    dateCreation: toDate(r?.dateCreation ?? r?.createdAt ?? r?.date_creation),
    motifAnnulation: r?.motifAnnulation ?? r?.motif_annulation,
    chambre,
    client,
    servicesAnnexes: r?.servicesAnnexes ?? r?.services_annexes ?? [],
    paiements: (r?.paiements ?? []).map(normalizePaiement)
  };
};

const normalizeBikeService = (item: any): ServiceAnnexe => ({
  idService: item?.id ?? item?.idService ?? 0,
  type: 'LOCATION_VELO',
  dateHeureDebut: toDate(item?.dateDebut ?? item?.dateHeureDebut),
  dateHeureFin: toDate(item?.dateFin ?? item?.dateHeureFin),
  montant: Number(item?.montant ?? 0),
  statut: item?.statut ?? 'EN_COURS',
  notes: item?.typeTarification,
  details: item?.velo ? {
    typeVelo: item.velo.type,
    taille: item.velo.taille
  } : item?.details
});

const normalizeTransferService = (item: any): ServiceAnnexe => ({
  idService: item?.id ?? item?.idService ?? 0,
  type: 'TRANSFERT_AEROPORT',
  dateHeureDebut: toDate(item?.dateHeure ?? item?.dateHeureDebut),
  dateHeureFin: toDate(item?.dateHeure ?? item?.dateHeureFin),
  montant: Number(item?.montant ?? 0),
  statut: item?.statut ?? 'PLANIFIE',
  notes: item?.numeroVol,
  details: item
});

const normalizeActivityService = (item: any): ServiceAnnexe => ({
  idService: item?.id ?? item?.idService ?? 0,
  type: 'ACTIVITE_GUIDE',
  dateHeureDebut: toDate(item?.dateActivite ?? item?.dateHeureDebut),
  dateHeureFin: toDate(item?.dateActivite ?? item?.dateHeureFin),
  montant: Number(item?.montantPaye ?? item?.montant ?? 0),
  statut: item?.statut ?? 'CONFIRMEE',
  details: item
});

// ============================================
// API HELPERS
// ============================================

const fetchAllClients = async (): Promise<Client[]> => {
  try {
    const limit = 100;
    const allClients: Client[] = [];
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      const res = await api.get('/clients', { params: { page, limit } });
      const data = res.data?.data ?? res.data ?? [];
      const pagination = res.data?.pagination ?? {};
      totalPages = pagination.totalPages ?? pagination.pages ?? totalPages;
      
      if (Array.isArray(data)) {
        allClients.push(...data.map(normalizeClient));
      }

      if (!pagination.totalPages && data.length < limit) {
        break;
      }

      page += 1;
    }

    return allClients.length > 0 ? allClients : CLIENTS_STATIC;
  } catch (error) {
    console.error('[fetchAllClients] Erreur:', error);
    return CLIENTS_STATIC;
  }
};

// ============================================
// ANIMATIONS
// ============================================

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
} as const;

const fadeInScale = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } }
} as const;

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
} as const;

const pulseAnimation = {
  scale: [1, 1.05, 1],
  transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
} as any;

// ============================================
// COMPOSANTS
// ============================================

// -- StatCard --
const StatCard = ({ label, value, icon, color = 'emerald', subtitle, trend, delay = 0 }: any) => {
  const colors: Record<string, { bg: string; border: string; text: string; iconBg: string; iconText: string }> = {
    emerald: { bg: 'bg-emerald-50/90', border: 'border-emerald-200/80', text: 'text-emerald-700', iconBg: 'bg-white/70 ring-1 ring-emerald-100', iconText: 'text-emerald-600' },
    amber: { bg: 'bg-amber-50/90', border: 'border-amber-200/80', text: 'text-amber-700', iconBg: 'bg-white/70 ring-1 ring-amber-100', iconText: 'text-amber-600' },
    blue: { bg: 'bg-blue-50/90', border: 'border-blue-200/80', text: 'text-blue-700', iconBg: 'bg-white/70 ring-1 ring-blue-100', iconText: 'text-blue-600' },
    purple: { bg: 'bg-purple-50/90', border: 'border-purple-200/80', text: 'text-purple-700', iconBg: 'bg-white/70 ring-1 ring-purple-100', iconText: 'text-purple-600' },
    red: { bg: 'bg-red-50/90', border: 'border-red-200/80', text: 'text-red-700', iconBg: 'bg-white/70 ring-1 ring-red-100', iconText: 'text-red-600' },
    green: { bg: 'bg-green-50/90', border: 'border-green-200/80', text: 'text-green-700', iconBg: 'bg-white/70 ring-1 ring-green-100', iconText: 'text-green-600' }
  };

  const c = colors[color] || colors.emerald;

  return (
    <motion.div
      variants={fadeInScale}
      custom={delay}
      whileHover={{ y: -4, scale: 1.02, boxShadow: '0 12px 24px -8px rgba(0,0,0,0.1)' }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`p-5 rounded-2xl border ${c.border} ${c.bg} shadow-sm hover:shadow-md transition-all duration-300 cursor-default`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold mt-1 text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5 truncate">{subtitle}</p>}
          {trend !== undefined && (
            <motion.div
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex items-center gap-1 mt-1 text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {Math.abs(trend)}% vs mois dernier
            </motion.div>
          )}
        </div>
        <motion.div
          whileHover={{ rotate: 15, scale: 1.1 }}
          className={`p-2.5 ${c.iconBg} ${c.iconText} rounded-xl shadow-sm`}
        >
          {icon}
        </motion.div>
      </div>
    </motion.div>
  );
};

// -- Badge de statut --
const StatusBadge = ({ statut }: { statut: StatutReservation }) => {
  const styles: Record<StatutReservation, { bg: string; text: string; border: string }> = {
    'EN_ATTENTE_ACOMPTE': { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
    'CONFIRMEE': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    'ANNULEE': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    'TERMINEE': { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
    'NO_SHOW': { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' }
  };
  const s = styles[statut] || styles['TERMINEE'];
  const labels: Record<StatutReservation, string> = {
    'EN_ATTENTE_ACOMPTE': 'En attente',
    'CONFIRMEE': 'Confirmée',
    'ANNULEE': 'Annulée',
    'TERMINEE': 'Terminée',
    'NO_SHOW': 'No Show'
  };
  return (
    <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${s.bg} ${s.text} ${s.border}`}>
      {labels[statut]}
    </span>
  );
};

// -- ClientStatusBadge --
const ClientStatusBadge = ({ statut }: { statut: StatutClient }) => {
  const styles: Record<StatutClient, { bg: string; text: string; icon: JSX.Element }> = {
    'NOUVEAU': { bg: 'bg-blue-50', text: 'text-blue-700', icon: <UserX size={12} /> },
    'REGULIER': { bg: 'bg-green-50', text: 'text-green-700', icon: <UserCheck size={12} /> },
    'VIP': { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: <Star size={12} className="fill-yellow-500" /> }
  };
  const s = styles[statut] || styles['NOUVEAU'];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      {s.icon} {statut}
    </span>
  );
};

// -- PaiementStatusBadge --
const PaiementStatusBadge = ({ statut }: { statut: StatutPaiement }) => {
  const styles: Record<StatutPaiement, { bg: string; text: string; icon: JSX.Element }> = {
    'COMPLET': { bg: 'bg-green-50', text: 'text-green-700', icon: <CheckCircle2 size={12} /> },
    'PARTIEL': { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: <AlertTriangle size={12} /> },
    'EN_ATTENTE': { bg: 'bg-blue-50', text: 'text-blue-700', icon: <ClockIcon size={12} /> },
    'IMPREVU': { bg: 'bg-red-50', text: 'text-red-700', icon: <AlertCircle size={12} /> }
  };
  const s = styles[statut] || styles['EN_ATTENTE'];
  const labels: Record<StatutPaiement, string> = {
    'COMPLET': 'Complet',
    'PARTIEL': 'Partiel',
    'EN_ATTENTE': 'En attente',
    'IMPREVU': 'Imprévu'
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      {s.icon} {labels[statut]}
    </span>
  );
};

// ============================================
// SECTION: Paiements
// ============================================

const PaiementsSection = ({ paiements, reservations }: { paiements: Paiement[], reservations: Reservation[] }) => {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // Statistiques paiements
  const paiementsMois = paiements.filter(p => {
    const d = new Date(p.dateHeure);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const totalEncaissements = paiementsMois.reduce((sum, p) => sum + p.montant, 0);
  const totalAcomptes = paiementsMois.filter(p => p.typeVersement === 'ACOMPTE').reduce((sum, p) => sum + p.montant, 0);
  const totalSoldes = paiementsMois.filter(p => p.typeVersement === 'SOLDE').reduce((sum, p) => sum + p.montant, 0);
  const totalArrhs = paiementsMois.filter(p => p.typeVersement === 'ARRHES').reduce((sum, p) => sum + p.montant, 0);

  // Paiements par mode
  const paiementsParMode = paiementsMois.reduce((acc, p) => {
    acc[p.mode] = (acc[p.mode] || 0) + p.montant;
    return acc;
  }, {} as Record<ModePaiement, number>);

  // Impayés (réservations avec montant restant > 0)
  const impayes = reservations.filter(r => 
    r.montantRestantDu > 0 && 
    r.statut !== 'ANNULEE' && 
    r.statut !== 'NO_SHOW' &&
    r.statut !== 'TERMINEE'
  );

  // Derniers paiements
  const paiementsRecents = [...paiements]
    .sort((a, b) => new Date(b.dateHeure).getTime() - new Date(a.dateHeure).getTime())
    .slice(0, 5);

  const modeLabels: Record<ModePaiement, string> = {
    'ESPECES': 'Espèces',
    'CARTE': 'Carte',
    'VIREMENT': 'Virement',
    'CHEQUE': 'Chèque'
  };

  const modeIcons: Record<ModePaiement, JSX.Element> = {
    'ESPECES': <Wallet size={14} />,
    'CARTE': <CreditCard size={14} />,
    'VIREMENT': <Receipt size={14} />,
    'CHEQUE': <DollarSign size={14} />
  };

  const modeColors: Record<ModePaiement, string> = {
    'ESPECES': 'bg-green-100 text-green-700 border-green-200',
    'CARTE': 'bg-blue-100 text-blue-700 border-blue-200',
    'VIREMENT': 'bg-purple-100 text-purple-700 border-purple-200',
    'CHEQUE': 'bg-amber-100 text-amber-700 border-amber-200'
  };

  const typeLabels: Record<TypeVersement, string> = {
    'ACOMPTE': 'Acompte',
    'SOLDE': 'Solde',
    'ARRHES': 'Arrhes'
  };

  return (
    <motion.div variants={fadeInUp} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
        <CreditCard size={18} className="text-emerald-600" />
        Paiements du mois
        <span className="ml-auto text-xs text-gray-400">
          {new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(today)}
        </span>
      </h3>

      {/* Stats paiements */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        <div className="text-center p-2 bg-emerald-50 rounded-xl border border-emerald-100/50">
          <p className="text-lg font-bold text-emerald-700">{totalEncaissements.toFixed(0)}€</p>
          <p className="text-xs text-gray-500">Total encaissé</p>
        </div>
        <div className="text-center p-2 bg-blue-50 rounded-xl border border-blue-100/50">
          <p className="text-lg font-bold text-blue-700">{totalAcomptes.toFixed(0)}€</p>
          <p className="text-xs text-gray-500">Acomptes</p>
        </div>
        <div className="text-center p-2 bg-purple-50 rounded-xl border border-purple-100/50">
          <p className="text-lg font-bold text-purple-700">{totalSoldes.toFixed(0)}€</p>
          <p className="text-xs text-gray-500">Soldes</p>
        </div>
        <div className="text-center p-2 bg-amber-50 rounded-xl border border-amber-100/50">
          <p className="text-lg font-bold text-amber-700">{totalArrhs.toFixed(0)}€</p>
          <p className="text-xs text-gray-500">Arrhes</p>
        </div>
      </div>

      {/* Paiements par mode */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {Object.entries(paiementsParMode).map(([mode, montant]) => (
          <div
            key={mode}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${modeColors[mode as ModePaiement]}`}
          >
            {modeIcons[mode as ModePaiement]}
            {modeLabels[mode as ModePaiement]}
            <span className="font-bold ml-0.5">{montant.toFixed(0)}€</span>
          </div>
        ))}
        {Object.keys(paiementsParMode).length === 0 && (
          <span className="text-xs text-gray-400 italic">Aucun paiement ce mois</span>
        )}
      </div>

      {/* Impayés */}
      {impayes.length > 0 && (
        <div className="mb-3 p-3 bg-red-50 rounded-xl border border-red-200">
          <div className="flex items-center gap-2 text-sm text-red-700 font-medium mb-1">
            <AlertCircle size={16} />
            {impayes.length} impayé{impayes.length > 1 ? 's' : ''}
          </div>
          <div className="space-y-1">
            {impayes.slice(0, 3).map(r => (
              <div key={r.idReservation} className="flex justify-between text-xs">
                <span className="text-red-600">{r.client.prenom} {r.client.nom}</span>
                <span className="font-bold text-red-700">{r.montantRestantDu.toFixed(0)}€</span>
              </div>
            ))}
            {impayes.length > 3 && (
              <p className="text-xs text-red-400">+ {impayes.length - 3} autre{impayes.length - 3 > 1 ? 's' : ''}</p>
            )}
          </div>
        </div>
      )}

      {/* Derniers paiements */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Derniers paiements</p>
        {paiementsRecents.length === 0 ? (
          <p className="text-sm text-gray-400 italic text-center py-3">Aucun paiement récent</p>
        ) : (
          <div className="space-y-1.5">
            {paiementsRecents.map((p, i) => {
              const reservation = reservations.find(r => r.idReservation === p.reservationId);
              return (
                <motion.div
                  key={p.idPaiement}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-xl border border-gray-100/50"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={modeColors[p.mode]?.split(' ')[0] + ' p-1 rounded-full'}>
                      {modeIcons[p.mode]}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {reservation?.client?.prenom} {reservation?.client?.nom}
                      </p>
                      <p className="text-xs text-gray-500">
                        {typeLabels[p.typeVersement]} · {modeLabels[p.mode]}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-emerald-700">{p.montant.toFixed(0)}€</p>
                    <p className="text-xs text-gray-400">{new Date(p.dateHeure).toLocaleDateString('fr-FR')}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ============================================
// SECTION: Arrivées/Départs
// ============================================

const ArrivalsDeparturesSection = ({ reservations }: { reservations: Reservation[] }) => {
  const today = new Date();
  const todayStr = today.toDateString();
  
  const arrivals = reservations.filter(r => {
    const d = new Date(r.dateArrivee);
    return d.toDateString() === todayStr && r.statut !== 'ANNULEE' && r.statut !== 'NO_SHOW';
  });
  const departures = reservations.filter(r => {
    const d = new Date(r.dateDepart);
    return d.toDateString() === todayStr && r.statut !== 'ANNULEE' && r.statut !== 'NO_SHOW';
  });

  return (
    <motion.div variants={fadeInUp} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="border-b border-gray-100 px-5 py-4 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Clock size={18} className="text-emerald-600" />
          Arrivées & Départs du jour
          <span className="text-xs text-gray-400 font-normal ml-2">
            {new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: '2-digit', month: '2-digit' }).format(today)}
          </span>
        </h3>
        <span className="text-xs font-medium text-gray-500">
          {arrivals.length} arrivée{arrivals.length > 1 ? 's' : ''} · {departures.length} départ{departures.length > 1 ? 's' : ''}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <motion.div animate={pulseAnimation} className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span className="text-sm font-medium text-gray-700">Arrivées</span>
          </div>
          {arrivals.length === 0 ? (
            <p className="text-sm text-gray-400 italic text-center py-6">Aucune arrivée prévue</p>
          ) : (
            <div className="space-y-2">
              {arrivals.map((r, i) => (
                <motion.div
                  key={r.idReservation}
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-white rounded-xl border border-green-100/50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{r.client.prenom} {r.client.nom}</p>
                    <p className="text-xs text-gray-500 truncate">{r.chambre.nom} · {r.nbNuits} nuit{r.nbNuits > 1 ? 's' : ''}</p>
                  </div>
                  <StatusBadge statut={r.statut} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <motion.div animate={pulseAnimation} className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-sm font-medium text-gray-700">Départs</span>
          </div>
          {departures.length === 0 ? (
            <p className="text-sm text-gray-400 italic text-center py-6">Aucun départ prévu</p>
          ) : (
            <div className="space-y-2">
              {departures.map((r, i) => (
                <motion.div
                  key={r.idReservation}
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-center justify-between p-3 bg-gradient-to-r from-amber-50 to-white rounded-xl border border-amber-100/50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{r.client.prenom} {r.client.nom}</p>
                    <p className="text-xs text-gray-500 truncate">{r.chambre.nom} · {r.nbNuits} nuit{r.nbNuits > 1 ? 's' : ''}</p>
                  </div>
                  <StatusBadge statut={r.statut} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// SECTION: Occupation des chambres (avec API)
// ============================================

const RoomOccupancySection = ({ reservations, chambres, loading }: { reservations: Reservation[], chambres: Chambre[], loading?: boolean }) => {
  const today = new Date();
  const todayStr = today.toDateString();

  const getRoomStatus = (chambre: Chambre) => {
    const isOccupied = reservations.some(r => {
      const arrivee = new Date(r.dateArrivee);
      const depart = new Date(r.dateDepart);
      return r.chambre?.idChambre === chambre.idChambre &&
        arrivee.toDateString() <= todayStr &&
        depart.toDateString() >= todayStr &&
        r.statut !== 'ANNULEE' && r.statut !== 'NO_SHOW';
    });
    if (isOccupied) return 'OCCUPEE';
    if (chambre.statut === 'EN_MAINTENANCE') return 'EN_MAINTENANCE';
    if (chambre.statut === 'HORS_SERVICE') return 'HORS_SERVICE';
    return 'DISPONIBLE';
  };

  const statusConfig: Record<string, { color: string; bg: string; border: string; label: string; dot: string }> = {
    'DISPONIBLE': { color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', label: 'Disponible', dot: 'bg-green-500' },
    'OCCUPEE': { color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Occupée', dot: 'bg-blue-500' },
    'EN_MAINTENANCE': { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Maintenance', dot: 'bg-amber-500' },
    'HORS_SERVICE': { color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', label: 'Hors service', dot: 'bg-red-500' }
  };

  const availableCount = chambres.filter(c => getRoomStatus(c) === 'DISPONIBLE').length;

  if (loading) {
    return (
      <motion.div variants={fadeInUp} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="animate-spin text-emerald-600" />
          <span className="ml-2 text-gray-500">Chargement...</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div variants={fadeInUp} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Building size={18} className="text-emerald-600" />
          Chambres
        </h3>
        <motion.span
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full"
        >
          {availableCount} libre{availableCount > 1 ? 's' : ''}
        </motion.span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {chambres.map((chambre, i) => {
          const status = getRoomStatus(chambre);
          const config = statusConfig[status] || statusConfig.DISPONIBLE;
          return (
            <motion.div
              key={chambre.idChambre}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.06 }}
              whileHover={{ scale: 1.04, y: -2 }}
              className={`p-3 rounded-xl border ${config.bg} ${config.border} transition-all duration-200 cursor-default`}
            >
              <p className="font-bold text-sm text-gray-800">{chambre.nom}</p>
              <p className="text-xs text-gray-400">{chambre.numero}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <div className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                <p className={`text-xs font-medium ${config.color}`}>{config.label}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

// ============================================
// SECTION: Graphiques
// ============================================

const OccupancyChart = () => (
  <motion.div variants={fadeInUp} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
    <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
      <BarChart3 size={18} className="text-emerald-600" />
      Occupation 7 jours
    </h3>
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={OCCUPANCY_DATA} layout="vertical" barSize={18}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
          <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#4b5563' }} />
          <YAxis type="category" dataKey="date" width={55} axisLine={false} tickLine={false} tick={{ fill: '#4b5563' }} />
          <Tooltip
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', color: '#1f2937' }}
          />
          <Bar dataKey="occupées" stackId="a" fill="#10b981" radius={[0, 6, 6, 0]} />
          <Bar dataKey="disponibles" stackId="a" fill="#e5e7eb" radius={[6, 0, 0, 6]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </motion.div>
);

const RevenueChart = () => (
  <motion.div variants={fadeInUp} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
    <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
      <TrendingUp size={18} className="text-emerald-600" />
      Évolution des revenus
    </h3>
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={REVENUE_DATA}>
          <defs>
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="mois" axisLine={false} tickLine={false} tick={{ fill: '#4b5563' }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#4b5563' }} />
          <Tooltip
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', color: '#1f2937' }}
            formatter={(value) => [`${value}€`, 'Revenus']}
          />
          <Area type="monotone" dataKey="revenus" stroke="#10b981" strokeWidth={3} fill="url(#revenueGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </motion.div>
);

const AcquisitionChart = () => (
  <motion.div variants={fadeInUp} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 overflow-hidden min-w-0">
    <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
      <PieChart size={18} className="text-emerald-600" />
      Canaux d'acquisition
    </h3>
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <RePieChart>
          <Pie
            data={ACQUISITION_DATA}
            cx="50%"
            cy="50%"
            innerRadius={34}
            outerRadius={58}
            paddingAngle={3}
            dataKey="value"
          >
            {ACQUISITION_DATA.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', color: '#1f2937' }}
            formatter={(value) => [`${value} réservation(s)`, '']}
          />
        </RePieChart>
      </ResponsiveContainer>
    </div>
    <div className="mt-3 flex flex-wrap gap-2">
      {ACQUISITION_DATA.map((entry) => (
        <div
          key={entry.name}
          className="flex items-center gap-1.5 min-w-0 rounded-full bg-gray-50 px-2.5 py-1 text-xs text-gray-700 border border-gray-100"
        >
          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="truncate text-gray-700">{entry.name}</span>
          <span className="font-semibold text-gray-900">{entry.value}</span>
        </div>
      ))}
    </div>
  </motion.div>
);

// ============================================
// SECTION: Statistiques clients
// ============================================

const ClientStatsSection = ({ clients }: { clients: Client[] }) => {
  const total = clients.length;
  const vip = clients.filter(c => c.vip || c.statut === 'VIP').length;
  const regulier = clients.filter(c => c.statut === 'REGULIER').length;
  const nouveau = clients.filter(c => c.statut === 'NOUVEAU').length;
  const totalRevenue = clients.reduce((sum, c) => sum + (c.montant_total_depense || 0), 0);

  return (
    <motion.div variants={fadeInUp} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
        <Users size={18} className="text-emerald-600" />
        Clients
      </h3>
      <div className="grid grid-cols-2 gap-2.5 mb-3">
        <div className="text-center p-3 bg-gradient-to-br from-emerald-50 to-white rounded-xl border border-emerald-100/50">
          <p className="text-2xl font-bold text-emerald-700">{total}</p>
          <p className="text-xs text-gray-500">Total</p>
        </div>
        <div className="text-center p-3 bg-gradient-to-br from-amber-50 to-white rounded-xl border border-amber-100/50">
          <p className="text-2xl font-bold text-amber-700">{totalRevenue.toFixed(0)}€</p>
          <p className="text-xs text-gray-500">Dépenses</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <div className="text-center p-2 bg-gradient-to-br from-yellow-50 to-white rounded-xl border border-yellow-100/50">
          <p className="text-sm font-bold text-yellow-700">{vip}</p>
          <p className="text-xs text-gray-500 flex items-center justify-center gap-0.5"><Star size={10} className="text-yellow-500 fill-yellow-500" /> VIP</p>
        </div>
        <div className="text-center p-2 bg-gradient-to-br from-blue-50 to-white rounded-xl border border-blue-100/50">
          <p className="text-sm font-bold text-blue-700">{regulier}</p>
          <p className="text-xs text-gray-500">Réguliers</p>
        </div>
        <div className="text-center p-2 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100/50">
          <p className="text-sm font-bold text-gray-700">{nouveau}</p>
          <p className="text-xs text-gray-500">Nouveaux</p>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// SECTION: Services annexes
// ============================================

const ActiveServicesSection = ({ reservations }: { reservations: Reservation[] }) => {
  const active = reservations
    .flatMap(r => (r.servicesAnnexes || []).map(s => ({ ...s, reservation: r })))
    .filter(s => s.statut === 'CONFIRME' || s.statut === 'EN_COURS');

  const icons: Record<string, JSX.Element> = {
    'LOCATION_VELO': <Bike size={16} />,
    'TRANSFERT_AEROPORT': <Plane size={16} />,
    'ACTIVITE_GUIDE': <MapPin size={16} />
  };
  const labels: Record<string, string> = {
    'LOCATION_VELO': 'Vélo',
    'TRANSFERT_AEROPORT': 'Transfert',
    'ACTIVITE_GUIDE': 'Activité'
  };

  return (
    <motion.div variants={fadeInUp} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
        <Activity size={18} className="text-emerald-600" />
        Services actifs
        {active.length > 0 && (
          <span className="ml-auto px-2.5 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
            {active.length}
          </span>
        )}
      </h3>
      {active.length === 0 ? (
        <p className="text-sm text-gray-400 italic text-center py-6">Aucun service actif</p>
      ) : (
        <div className="space-y-2">
          {active.map((s, i) => (
            <motion.div
              key={s.idService}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-100/50"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-emerald-600 shrink-0">{icons[s.type] || <Activity size={16} />}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{labels[s.type] || s.type}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {s.reservation?.client?.prenom} {s.reservation?.client?.nom}
                  </p>
                </div>
              </div>
              <span className="text-sm font-semibold text-gray-900 shrink-0">{s.montant}€</span>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

// ============================================
// SECTION: Répartition des revenus
// ============================================

const RevenueDistributionSection = ({ reservations }: { reservations: Reservation[] }) => {
  const totalHebergement = reservations
    .filter(r => r.statut !== 'ANNULEE')
    .reduce((s, r) => s + (r.montantTotal || 0), 0);
  
  const totalAnnexes = reservations
    .flatMap(r => r.servicesAnnexes || [])
    .reduce((s, svc) => s + (svc.montant || 0), 0);

  const total = totalHebergement + totalAnnexes;
  
  const items = [
    { label: 'Hébergement', value: totalHebergement, color: 'bg-emerald-500' },
    { label: 'Annexes', value: totalAnnexes, color: 'bg-blue-500' },
    { label: 'Restauration', value: 0, color: 'bg-amber-500' }
  ];

  if (total === 0) {
    return (
      <motion.div variants={fadeInUp} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
          <PieChart size={18} className="text-emerald-600" />
          Répartition
        </h3>
        <p className="text-sm text-gray-400 italic text-center py-6">Aucune donnée</p>
      </motion.div>
    );
  }

  return (
    <motion.div variants={fadeInUp} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
        <PieChart size={18} className="text-emerald-600" />
        Répartition des revenus
      </h3>
      <div className="space-y-2.5">
        {items.map((item, i) => {
          const pct = total > 0 ? (item.value / total) * 100 : 0;
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.08 }}
            >
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{item.label}</span>
                <span className="font-medium text-gray-900">{item.value.toFixed(0)}€ ({pct.toFixed(0)}%)</span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden mt-1">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 1, delay: 0.2 + i * 0.08 }}
                  className={`h-full rounded-full ${item.color}`}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-sm font-bold"
      >
        <span className="text-gray-600">Total</span>
        <span className="text-emerald-700">{total.toFixed(0)}€</span>
      </motion.div>
    </motion.div>
  );
};

// ============================================
// SECTION: Réservations récentes
// ============================================

const RecentReservationsSection = ({ reservations, onView }: { reservations: Reservation[], onView: (id: number) => void }) => {
  const sorted = [...reservations]
    .sort((a, b) => new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime())
    .slice(0, 7);

  if (sorted.length === 0) {
    return (
      <motion.div variants={fadeInUp} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
        <p className="text-gray-400">Aucune réservation récente</p>
      </motion.div>
    );
  }

  return (
    <motion.div variants={fadeInUp} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="border-b border-gray-100 px-5 py-4 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <CalendarCheck size={18} className="text-emerald-600" />
          Dernières réservations
        </h3>
        <span className="text-xs text-gray-400">{sorted.length} récentes</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">N°</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Chambre</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Arrivée</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Départ</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Montant</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sorted.map((r, i) => (
              <motion.tr
                key={r.idReservation}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ backgroundColor: '#f9fafb' }}
                className="cursor-pointer transition-colors"
                onClick={() => onView(r.idReservation)}
              >
                <td className="px-4 py-3 text-xs font-mono text-gray-500">{r.numeroReservation}</td>
                <td className="px-4 py-3 font-medium text-gray-900">
                  {r.client?.prenom || '—'} {r.client?.nom || '—'}
                </td>
                <td className="px-4 py-3 text-gray-600">{r.chambre?.nom || '—'}</td>
                <td className="px-4 py-3 text-gray-600">{formatDate(r.dateArrivee)}</td>
                <td className="px-4 py-3 text-gray-600">{formatDate(r.dateDepart)}</td>
                <td className="px-4 py-3 font-semibold text-gray-900">{r.montantTotal || 0}€</td>
                <td className="px-4 py-3"><StatusBadge statut={r.statut} /></td>
                <td className="px-4 py-3 text-center">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => { e.stopPropagation(); onView(r.idReservation); }}
                    className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors"
                  >
                    <Eye size={16} />
                  </motion.button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

// ============================================
// OVERLAY DÉTAIL CLIENT
// ============================================

interface ClientDetail {
  client: Client;
  reservations: any[];
  enfants: any[];
}

const ClientDetailOverlay = ({ 
  client, 
  onClose, 
  onEdit 
}: { 
  client: Client; 
  onClose: () => void; 
  onEdit: (client: Client) => void;
}) => {
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<ClientDetail | null>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/clients/${client.id}/detail`);
        setDetail(res.data.data);
      } catch (error) {
        console.error('Erreur chargement détail client:', error);
        toast.error('Erreur lors du chargement des détails');
        setDetail({
          client: client,
          reservations: RESERVATIONS_STATIC
            .filter(r => r.client.id === client.id)
            .map(r => ({
              id: r.idReservation,
              numero_reservation: r.numeroReservation,
              date_arrivee: r.dateArrivee,
              date_depart: r.dateDepart,
              chambre_nom: r.chambre.nom,
              montant_total: r.montantTotal,
              statut: r.statut
            })),
          enfants: []
        });
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [client.id]);

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* En-tête */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              {initiales(client.prenom, client.nom)}
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                {client.prenom} {client.nom}
                {(client.vip || client.nb_sejours >= 3) && (
                  <Star size={14} className="text-yellow-500 fill-yellow-500" />
                )}
              </h2>
              <div className="flex items-center gap-2">
                <ClientStatusBadge statut={client.statut} />
                <span className="text-xs text-gray-400">{client.email}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Contenu */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
            </div>
          ) : detail ? (
            <div className="space-y-4">
              {/* Infos générales */}
              <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded-xl p-4">
                <div>
                  <p className="text-xs text-gray-500">Téléphone</p>
                  <p className="font-medium text-sm text-gray-900">{client.telephone || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Adresse</p>
                  <p className="font-medium text-sm text-gray-900">{client.adresse || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Ville</p>
                  <p className="font-medium text-sm text-gray-900">{client.ville || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Pays</p>
                  <p className="font-medium text-sm text-gray-900">{client.pays || 'France'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Segment</p>
                  <p className="font-medium text-sm text-gray-900">{client.segment || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Canal</p>
                  <p className="font-medium text-sm text-gray-900">{client.canal_acquisition || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Séjours</p>
                  <p className="font-medium text-sm font-bold text-emerald-700">{client.nb_sejours || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Dépenses totales</p>
                  <p className="font-medium text-sm font-bold text-emerald-700">{formatEuro(client.montant_total_depense || 0)}</p>
                </div>
              </div>

              {/* Préférences */}
              {(client.allergies || client.regime_alimentaire || client.chambre_preferee) && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Préférences</h4>
                  <div className="grid grid-cols-2 gap-2 bg-gray-50 rounded-xl p-3">
                    {client.allergies && (
                      <div>
                        <p className="text-xs text-gray-500">Allergies</p>
                        <p className="text-sm text-gray-900">{client.allergies}</p>
                      </div>
                    )}
                    {client.regime_alimentaire && (
                      <div>
                        <p className="text-xs text-gray-500">Régime</p>
                        <p className="text-sm text-gray-900">{client.regime_alimentaire}</p>
                      </div>
                    )}
                    {client.chambre_preferee && (
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500">Chambre préférée</p>
                        <p className="text-sm text-gray-900">{client.chambre_preferee}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Réservations récentes */}
              {detail.reservations && detail.reservations.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Réservations ({detail.reservations.length})
                  </h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {detail.reservations.slice(0, 5).map((r: any) => (
                      <div key={r.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{r.chambre_nom || '—'}</p>
                          <p className="text-xs text-gray-400">{formatDate(r.date_arrivee)} → {formatDate(r.date_depart)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-emerald-700">{r.montant_total || 0}€</span>
                          <StatusBadge statut={r.statut} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={() => { onClose(); onEdit(client); }}
                  className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors"
                >
                  Modifier
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(client.email);
                    toast.success('Email copié');
                  }}
                  className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Copier email
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
};

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function DashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadingChambres, setLoadingChambres] = useState(true);
  const [clients, setClients] = useState<Client[]>(CLIENTS_STATIC);
  const [reservations, setReservations] = useState<Reservation[]>(RESERVATIONS_STATIC);
  const [chambres, setChambres] = useState<Chambre[]>(CHAMBRES_STATIC);
  const [paiements, setPaiements] = useState<Paiement[]>(PAIEMENTS_STATIC);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showClientDetail, setShowClientDetail] = useState(false);

  // ─── Chargement des données ────────────────────────────────────────────────────

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setLoadingChambres(true);
    try {
      // Récupération des clients en premier (avec fallback)
      const clientsData = await fetchAllClients();
      setClients(clientsData.length > 0 ? clientsData : CLIENTS_STATIC);

      // Récupération des chambres
      let chambresData: any[] = [];
      try {
        const chambresRes = await api.get('/chambres');
        chambresData = chambresRes.data?.data ?? chambresRes.data ?? [];
      } catch (e) {
        console.warn('[Dashboard] Erreur chambres, fallback static', e);
        chambresData = CHAMBRES_STATIC;
      }
      setChambres((chambresData.length > 0 ? chambresData : CHAMBRES_STATIC).map(normalizeChambre));

      // Récupération des réservations
      let reservationsData: any[] = [];
      try {
        const reservationsRes = await api.get('/reservations');
        reservationsData = reservationsRes.data?.data ?? reservationsRes.data ?? [];
      } catch (e) {
        console.warn('[Dashboard] Erreur réservations, fallback static', e);
        reservationsData = RESERVATIONS_STATIC;
      }

      // Récupération des paiements
      let paiementsData: any[] = [];
      try {
        const paiementsRes = await api.get('/paiements');
        paiementsData = paiementsRes.data?.data ?? paiementsRes.data ?? [];
      } catch (e) {
        console.warn('[Dashboard] Erreur paiements, fallback static', e);
        paiementsData = PAIEMENTS_STATIC;
      }
      setPaiements((paiementsData.length > 0 ? paiementsData : PAIEMENTS_STATIC).map(normalizePaiement));

      // Normalisation des réservations avec les clients et chambres associés
      const normalizedReservations = (reservationsData.length > 0 ? reservationsData : RESERVATIONS_STATIC)
        .map((r: any) => {
          // Associer le client depuis la liste des clients récupérés
          const clientId = r?.clientId ?? r?.client_id ?? r?.client?.id;
          const client = clientsData.find((c: Client) => c.id === clientId) || 
                        normalizeClient(r?.client || {});

          // Associer la chambre depuis la liste des chambres
          const chambreId = r?.chambreId ?? r?.chambre_id ?? r?.chambre?.idChambre;
          const chambre = chambresData.find((c: any) => (c.idChambre || c.id) === chambreId) || 
                          normalizeChambre(r?.chambre || {});

          return normalizeReservation({
            ...r,
            client,
            chambre
          });
        });

      // Récupération des services annexes
      const servicesByReservation = new Map<number, ServiceAnnexe[]>();
      const addServiceToReservation = (reservationId: number | undefined, service: ServiceAnnexe) => {
        if (!reservationId) return;
        const list = servicesByReservation.get(reservationId) ?? [];
        list.push(service);
        servicesByReservation.set(reservationId, list);
      };

      try {
        const locationsRes = await api.get('/services-annexes/velos/locations-en-cours');
        const locations = locationsRes.data?.data ?? locationsRes.data ?? [];
        locations.forEach((item: any) => {
          addServiceToReservation(
            item?.reservationId ?? item?.reservation_id ?? item?.reservation?.id,
            normalizeBikeService(item)
          );
        });
      } catch (e) { /* ignore */ }

      try {
        const transfertsRes = await api.get('/services-annexes/transferts');
        const transferts = transfertsRes.data?.data ?? transfertsRes.data ?? [];
        transferts.forEach((item: any) => {
          addServiceToReservation(
            item?.reservationId ?? item?.reservation_id ?? item?.reservation?.id,
            normalizeTransferService(item)
          );
        });
      } catch (e) { /* ignore */ }

      try {
        const activitesRes = await api.get('/services-annexes/activites/reservations-externes');
        const activites = activitesRes.data?.data ?? activitesRes.data ?? [];
        activites.forEach((item: any) => {
          addServiceToReservation(
            item?.reservationId ?? item?.reservation_id ?? item?.reservation?.id,
            normalizeActivityService(item)
          );
        });
      } catch (e) { /* ignore */ }

      // Appliquer les services aux réservations
      setReservations(normalizedReservations.map((reservation: Reservation) => ({
        ...reservation,
        servicesAnnexes: servicesByReservation.get(reservation.idReservation) ?? reservation.servicesAnnexes ?? []
      })));

    } catch (error) {
      console.error('Erreur chargement dashboard:', error);
      toast.error('Erreur lors du chargement des données, utilisation des données statiques');
      setClients(CLIENTS_STATIC);
      setReservations(RESERVATIONS_STATIC);
      setChambres(CHAMBRES_STATIC);
      setPaiements(PAIEMENTS_STATIC);
    } finally {
      setLoading(false);
      setLoadingChambres(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // ─── Calculs ──────────────────────────────────────────────────────────────────

  const totalReservations = reservations.filter(r => r.statut !== 'ANNULEE').length;
  const totalRevenue = reservations.filter(r => r.statut !== 'ANNULEE').reduce((sum, r) => sum + (r.montantTotal || 0), 0);
  const occupancyRate = chambres.length > 0 ? 
    ((reservations.filter(r => r.statut === 'CONFIRMEE').length / chambres.length) * 100).toFixed(1) : '0';
  const avgNights = totalReservations > 0 ? 
    reservations.filter(r => r.statut !== 'ANNULEE').reduce((sum, r) => sum + (r.nbNuits || 0), 0) / totalReservations : 0;

  // ─── Handlers ─────────────────────────────────────────────────────────────────

  const handleViewReservation = (id: number) => {
    navigate(`/reservations/${id}`);
  };

  const handleClientClick = (client: Client) => {
    setSelectedClient(client);
    setShowClientDetail(true);
  };

  const handleEditClient = (client: Client) => {
    navigate(`/clients?edit=${client.id}`);
  };

  const handleRefresh = () => {
    fetchDashboardData();
    setLastRefresh(new Date());
    toast.success('Données rafraîchies');
  };

  // ─── Rendu ────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          <p className="text-gray-900">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
      {/* STYLE: Force toutes les couleurs de texte en noir */}
      <style>{`
        .dashboard-force-black * {
          color: #000000 !important;
        }
        .dashboard-force-black .text-gray-400,
        .dashboard-force-black .text-gray-500,
        .dashboard-force-black .text-gray-600,
        .dashboard-force-black .text-gray-700 {
          color: #000000 !important;
        }
        .dashboard-force-black .text-emerald-600,
        .dashboard-force-black .text-emerald-700,
        .dashboard-force-black .text-amber-600,
        .dashboard-force-black .text-amber-700,
        .dashboard-force-black .text-blue-600,
        .dashboard-force-black .text-blue-700,
        .dashboard-force-black .text-purple-600,
        .dashboard-force-black .text-purple-700,
        .dashboard-force-black .text-green-600,
        .dashboard-force-black .text-green-700 {
          color: #000000 !important;
        }
        .dashboard-force-black .text-white {
          color: #ffffff !important;
        }
        .dashboard-force-black .text-yellow-700,
        .dashboard-force-black .text-yellow-500 {
          color: #000000 !important;
        }
        .dashboard-force-black .text-red-600,
        .dashboard-force-black .text-red-700 {
          color: #000000 !important;
        }
        .dashboard-force-black .fill-yellow-500 {
          fill: #000000 !important;
        }
        .dashboard-force-black .bg-emerald-50,
        .dashboard-force-black .bg-amber-50,
        .dashboard-force-black .bg-blue-50,
        .dashboard-force-black .bg-purple-50,
        .dashboard-force-black .bg-green-50,
        .dashboard-force-black .bg-yellow-50,
        .dashboard-force-black .bg-red-50,
        .dashboard-force-black .bg-gray-50 {
          background-color: #f3f4f6 !important;
        }
        .dashboard-force-black .bg-emerald-100,
        .dashboard-force-black .bg-amber-100,
        .dashboard-force-black .bg-blue-100,
        .dashboard-force-black .bg-purple-100,
        .dashboard-force-black .bg-green-100,
        .dashboard-force-black .bg-yellow-100,
        .dashboard-force-black .bg-red-100,
        .dashboard-force-black .bg-gray-100 {
          background-color: #e5e7eb !important;
        }
        .dashboard-force-black .bg-emerald-500,
        .dashboard-force-black .bg-blue-500,
        .dashboard-force-black .bg-amber-500 {
          background-color: #6b7280 !important;
        }
        .dashboard-force-black .border-emerald-200,
        .dashboard-force-black .border-amber-200,
        .dashboard-force-black .border-blue-200,
        .dashboard-force-black .border-purple-200,
        .dashboard-force-black .border-green-200,
        .dashboard-force-black .border-yellow-200,
        .dashboard-force-black .border-red-200,
        .dashboard-force-black .border-gray-200 {
          border-color: #d1d5db !important;
        }
        .dashboard-force-black button:not(.text-white),
        .dashboard-force-black .btn:not(.text-white) {
          color: #000000 !important;
        }
        .dashboard-force-black input,
        .dashboard-force-black select,
        .dashboard-force-black textarea {
          color: #000000 !important;
        }
        .dashboard-force-black input::placeholder,
        .dashboard-force-black textarea::placeholder {
          color: #6b7280 !important;
        }
      `}</style>

      <div className="dashboard-force-black">
        {/* En-tête */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 gap-4"
        >
          <div className="flex items-center gap-3">
            <motion.span
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              className="text-3xl"
            >
              🌴
            </motion.span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Les Palmiers de l'Entre-Deux · <span className="text-xs">{lastRefresh.toLocaleTimeString('fr-FR')}</span>
              </p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Rafraîchir
          </motion.button>
        </motion.div>

        {/* Cartes KPI */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
        >
          <StatCard 
            label="Taux d'occupation" 
            value={`${occupancyRate}%`} 
            icon={<TrendingUp size={20} />} 
            color="emerald" 
            subtitle={`${chambres.filter(c => c.statut === 'DISPONIBLE').length} chambres disponibles`} 
          />
          <StatCard 
            label="Chiffre d'affaires" 
            value={`${totalRevenue}€`} 
            icon={<Euro size={20} />} 
            color="amber" 
            trend={12.5} 
          />
          <StatCard 
            label="Durée moyenne" 
            value={`${avgNights.toFixed(1)} nuits`} 
            icon={<CalendarCheck size={20} />} 
            color="blue" 
          />
          <StatCard 
            label="Réservations" 
            value={totalReservations} 
            icon={<Calendar size={20} />} 
            color="purple" 
            subtitle="Hors annulations" 
          />
        </motion.div>

        {/* Arrivées/Départs + Chambres */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2"><ArrivalsDeparturesSection reservations={reservations} /></div>
          <div><RoomOccupancySection reservations={reservations} chambres={chambres} loading={loadingChambres} /></div>
        </div>

        {/* Graphiques */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <OccupancyChart />
          <RevenueChart />
        </div>

        {/* Statistiques avec Paiements */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <ClientStatsSection clients={clients} />
          <AcquisitionChart />
          <PaiementsSection paiements={paiements} reservations={reservations} />
        </div>

        {/* Deuxième ligne */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <RevenueDistributionSection reservations={reservations} />
          <ActiveServicesSection reservations={reservations} />
        </div>

        {/* Réservations récentes */}
        <RecentReservationsSection reservations={reservations} onView={handleViewReservation} />

        {/* Pied de page */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 text-center text-xs text-gray-400 border-t border-gray-200 pt-6"
        >
          <p>© 2026 Les Palmiers de l'Entre-Deux.</p>
        </motion.div>

        {/* Overlay Détail Client */}
        {showClientDetail && selectedClient && (
          <ClientDetailOverlay 
            client={selectedClient} 
            onClose={() => setShowClientDetail(false)}
            onEdit={handleEditClient}
          />
        )}
      </div>
    </div>
  );
}