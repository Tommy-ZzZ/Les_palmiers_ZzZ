// frontend/src/pages/DashboardPage.tsx
// Version avec API complète connectée + WebSocket temps réel

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  BedDouble, CalendarCheck, TrendingUp, Users,
  Clock, Euro, Eye, Bike, Plane, MapPin, Building, Calendar,
  BarChart3, PieChart, Activity, Star, TrendingDown, Sparkles,
  RefreshCw, Award, Gift, Zap,
  AlertCircle, UserCheck, UserX, Mail, Phone, X, Loader2,
  CreditCard, Wallet, Receipt, DollarSign,
  CheckCircle2, AlertTriangle, Clock as ClockIcon,
  Wifi as WifiIcon, WifiOff,
  CheckCircle, Ban, Lock, Settings
} from 'lucide-react';
import {
  BarChart, Bar, PieChart as RePieChart, Pie,
  Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area
} from 'recharts';
import api from '../services/api';
import { formatDate, formatEuro, initiales } from '../utils/helpers';
import { useWebSocketContext } from '../context/WebSocketContext';

// ============================================
// TYPES
// ============================================

type StatutChambre = 'DISPONIBLE' | 'OCCUPEE' | 'EN_MAINTENANCE' | 'HORS_SERVICE' | 'BLOQUEE';
type StatutAffichage = StatutChambre | 'OCCUPEE';
type StatutReservation = 'EN_ATTENTE_ACOMPTE' | 'CONFIRMEE' | 'ANNULEE' | 'TERMINEE' | 'NO_SHOW';
type StatutClient = 'NOUVEAU' | 'REGULIER' | 'VIP';
type CanalAcquisition = 'DIRECT' | 'SITE_WEB' | 'BOOKING' | 'AGENCE_LOCALE' | 'BOUCHE_A_OREILLE';
type TypeService = 'LOCATION_VELO' | 'TRANSFERT_AEROPORT' | 'ACTIVITE_GUIDE';
type StatutPaiement = 'COMPLET' | 'PARTIEL' | 'EN_ATTENTE' | 'IMPREVU';
type ModePaiement = 'ESPECES' | 'CARTE' | 'VIREMENT' | 'CHEQUE';
type TypeVersement = 'ACOMPTE' | 'SOLDE' | 'ARRHES';
type VueChambre = 'JARDIN' | 'PISCINE' | 'MONTAGNE';

interface ReservationLight {
  id: number;
  chambreId: number;
  dateArrivee: string;
  dateDepart: string;
  statut: 'CONFIRMEE' | 'EN_ATTENTE_ACOMPTE' | 'TERMINEE' | 'ANNULEE' | 'NO_SHOW';
  client_nom?: string;
  client_prenom?: string;
  paiementComplet?: boolean;
  codePromo?: string;
  reduction?: number;
}

interface Chambre {
  id: number;
  numero: string;
  nom: string;
  capaciteAdultes: number;
  nbLitsSimples: number;
  nbLitsDoubles: number;
  nbLitsBebe: number;
  surfaceM2: number;
  vue: VueChambre;
  accessiblePMR: boolean;
  statut: StatutAffichage;
  equipements: string[];
  estOccupeeActuellement?: boolean;
  reservationsActuelles?: ReservationLight[];
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
  segment: string;
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
  id: number;
  montant: number;
  mode: ModePaiement;
  typeVersement: TypeVersement;
  dateHeure: Date;
  reference: string;
  reservationId?: number;
  statut?: StatutPaiement;
}

interface ServiceAnnexe {
  id: number;
  type: TypeService;
  dateHeureDebut: Date;
  dateHeureFin: Date;
  montant: number;
  statut: string;
  notes?: string;
  details?: any;
}

interface Reservation {
  id: number;
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

// ============================================
// FONCTIONS DE NORMALISATION
// ============================================

const toDate = (value: any): Date => (value ? new Date(value) : new Date());

const normalizeChambre = (c: any): Chambre => ({
  id: c?.id ?? c?.idChambre ?? 0,
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
  equipements: c?.equipements ?? [],
  estOccupeeActuellement: c?.estOccupeeActuellement ?? false,
  reservationsActuelles: c?.reservationsActuelles ?? []
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
  id: p?.id ?? p?.idPaiement ?? 0,
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

  return {
    id: r?.id ?? r?.idReservation ?? 0,
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
    heureArriveePrevisionnelle: r?.heureArriveePrevisionnelle ?? r?.horaireArriveeTardive,
    litBebe: r?.litBebe ?? r?.lit_bebe ?? false,
    arriveeTardive: r?.arriveeTardive ?? !!(r?.horaireArriveeTardive),
    dateCreation: toDate(r?.dateCreation ?? r?.createdAt ?? r?.date_creation),
    motifAnnulation: r?.motifAnnulation ?? r?.motif_annulation,
    chambre: normalizeChambre(r?.chambre ?? {}),
    client: normalizeClient(r?.client ?? {}),
    servicesAnnexes: (r?.servicesAnnexes ?? r?.services_annexes ?? []).map((s: any) => ({
      id: s?.id ?? 0,
      type: s?.type ?? 'ACTIVITE_GUIDE',
      dateHeureDebut: toDate(s?.dateHeureDebut ?? s?.dateDebut),
      dateHeureFin: toDate(s?.dateHeureFin ?? s?.dateFin),
      montant: Number(s?.montant ?? 0),
      statut: s?.statut ?? 'CONFIRME',
      notes: s?.notes ?? '',
      details: s?.details ?? {}
    })),
    paiements: (r?.paiements ?? []).map(normalizePaiement)
  };
};

// ============================================
// DONNÉES POUR LES GRAPHIQUES (statiques)
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
// ANIMATIONS
// ============================================

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
};

const fadeInScale = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
};

const pulseAnimation = {
  scale: [1, 1.05, 1],
  transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
};

// ============================================
// CONFIGURATION DES STATUTS
// ============================================

const STATUT_CONFIG: Record<StatutAffichage, {
  label: string;
  dot: string;
  badge: string;
  text: string;
  icon: React.ReactNode;
  bgGradient: string;
}> = {
  DISPONIBLE: {
    label: 'Disponible',
    dot: 'bg-emerald-400',
    badge: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    text: 'text-emerald-700',
    icon: <CheckCircle size={12} />,
    bgGradient: 'from-emerald-50 to-emerald-100/30',
  },
  OCCUPEE: {
    label: 'Occupée',
    dot: 'bg-blue-400',
    badge: 'bg-blue-50 border-blue-200 text-blue-700',
    text: 'text-blue-700',
    icon: <Users size={12} />,
    bgGradient: 'from-blue-50 to-blue-100/30',
  },
  EN_MAINTENANCE: {
    label: 'Maintenance',
    dot: 'bg-amber-400',
    badge: 'bg-amber-50 border-amber-200 text-amber-700',
    text: 'text-amber-700',
    icon: <Settings size={12} />,
    bgGradient: 'from-amber-50 to-amber-100/30',
  },
  HORS_SERVICE: {
    label: 'Hors service',
    dot: 'bg-red-400',
    badge: 'bg-red-50 border-red-200 text-red-700',
    text: 'text-red-700',
    icon: <Ban size={12} />,
    bgGradient: 'from-red-50 to-red-100/30',
  },
  BLOQUEE: {
    label: 'Bloquée',
    dot: 'bg-violet-400',
    badge: 'bg-violet-50 border-violet-200 text-violet-700',
    text: 'text-violet-700',
    icon: <Lock size={12} />,
    bgGradient: 'from-violet-50 to-violet-100/30',
  },
};

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

// -- ChambreStatusBadge --
const ChambreStatusBadge = ({ statut, animated = false }: { statut: StatutAffichage; animated?: boolean }) => {
  const cfg = STATUT_CONFIG[statut];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${cfg.badge} ${animated ? 'animate-pulse' : ''}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${animated ? 'animate-ping' : ''}`} />
      {cfg.icon}
      {cfg.label}
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

  const paiementsMois = paiements.filter(p => {
    const d = new Date(p.dateHeure);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const totalEncaissements = paiementsMois.reduce((sum, p) => sum + p.montant, 0);
  const totalAcomptes = paiementsMois.filter(p => p.typeVersement === 'ACOMPTE').reduce((sum, p) => sum + p.montant, 0);
  const totalSoldes = paiementsMois.filter(p => p.typeVersement === 'SOLDE').reduce((sum, p) => sum + p.montant, 0);
  const totalArrhs = paiementsMois.filter(p => p.typeVersement === 'ARRHES').reduce((sum, p) => sum + p.montant, 0);

  const paiementsParMode = paiementsMois.reduce((acc, p) => {
    acc[p.mode] = (acc[p.mode] || 0) + p.montant;
    return acc;
  }, {} as Record<ModePaiement, number>);

  const impayes = reservations.filter(r => 
    r.montantRestantDu > 0 && 
    r.statut !== 'ANNULEE' && 
    r.statut !== 'NO_SHOW' &&
    r.statut !== 'TERMINEE'
  );

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

      {impayes.length > 0 && (
        <div className="mb-3 p-3 bg-red-50 rounded-xl border border-red-200">
          <div className="flex items-center gap-2 text-sm text-red-700 font-medium mb-1">
            <AlertCircle size={16} />
            {impayes.length} impayé{impayes.length > 1 ? 's' : ''}
          </div>
          <div className="space-y-1">
            {impayes.slice(0, 3).map(r => (
              <div key={r.id} className="flex justify-between text-xs">
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

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Derniers paiements</p>
        {paiementsRecents.length === 0 ? (
          <p className="text-sm text-gray-400 italic text-center py-3">Aucun paiement récent</p>
        ) : (
          <div className="space-y-1.5">
            {paiementsRecents.map((p, i) => {
              const reservation = reservations.find(r => r.id === p.reservationId);
              return (
                <motion.div
                  key={p.id}
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
                  key={r.id}
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
                  key={r.id}
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
// SECTION: Occupation des chambres
// ============================================

const RoomOccupancySection = ({ chambres, loading }: { chambres: Chambre[], loading?: boolean }) => {
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

  const availableCount = chambres.filter(c => !c.estOccupeeActuellement).length;

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
          const estOccupee = chambre.estOccupeeActuellement || false;
          const statut: StatutAffichage = estOccupee ? 'OCCUPEE' : (chambre.statut || 'DISPONIBLE');
          
          return (
            <motion.div
              key={chambre.id}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.06 }}
              whileHover={{ scale: 1.04, y: -2 }}
              className={`p-3 rounded-xl border transition-all duration-200 cursor-default ${
                estOccupee 
                  ? 'bg-blue-50 border-blue-200' 
                  : chambre.statut === 'EN_MAINTENANCE'
                    ? 'bg-amber-50 border-amber-200'
                    : chambre.statut === 'HORS_SERVICE'
                      ? 'bg-red-50 border-red-200'
                      : chambre.statut === 'BLOQUEE'
                        ? 'bg-purple-50 border-purple-200'
                        : 'bg-green-50 border-green-200'
              }`}
            >
              <p className="font-bold text-sm text-gray-800">{chambre.nom}</p>
              <p className="text-xs text-gray-400">{chambre.numero}</p>
              <div className="mt-1">
                <ChambreStatusBadge statut={statut} animated={estOccupee} />
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
              key={s.id}
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
                key={r.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ backgroundColor: '#f9fafb' }}
                className="cursor-pointer transition-colors"
                onClick={() => onView(r.id)}
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
                    onClick={(e) => { e.stopPropagation(); onView(r.id); }}
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
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{client.statut}</span>
                <span className="text-xs text-gray-400">{client.email}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
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
          )}
        </div>
      </motion.div>
    </div>
  );
};

// ============================================
// PAGE PRINCIPALE
// ============================================

export default function DashboardPage() {
  const navigate = useNavigate();
  
  // ✅ Récupération du contexte WebSocket
  const { 
    isConnected, 
    subscribe, 
    refreshDashboard,
    connectionError 
  } = useWebSocketContext();
  
  const [loading, setLoading] = useState(true);
  const [loadingChambres, setLoadingChambres] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [chambres, setChambres] = useState<Chambre[]>([]);
  const [paiements, setPaiements] = useState<Paiement[]>([]);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showClientDetail, setShowClientDetail] = useState(false);
  
  const isFetching = useRef(false);

  // ─── CHARGEMENT DES DONNÉES ────────────────────────────────────────────────────

  const fetchDashboardData = useCallback(async () => {
    if (isFetching.current) return;
    isFetching.current = true;
    setLoading(true);

    try {
      console.log('📊 [Dashboard] Chargement des données...');

      // 1. Récupérer les clients
      const clientsRes = await api.get('/clients', { params: { limit: 100 } });
      const clientsData = clientsRes.data?.data ?? clientsRes.data ?? [];
      setClients(clientsData.map(normalizeClient));
      console.log(`📊 [Dashboard] ${clientsData.length} clients chargés`);

      // 2. Récupérer les chambres avec occupation
      setLoadingChambres(true);
      let chambresData: any[] = [];
      let statsData: any = {};
      
      try {
        // ✅ Utiliser l'API unifiée comme dans ChambresPage
        const chambresRes = await api.get('/chambres/avec-occupation');
        const data = chambresRes.data?.data ?? chambresRes.data ?? {};
        
        chambresData = data.chambres || [];
        statsData = data.statistiques || {};
        
        console.log(`📊 [Dashboard] ${chambresData.length} chambres chargées avec occupation`);
        console.log('📊 [Dashboard] Stats:', statsData);
      } catch (e) {
        console.warn('[Dashboard] Erreur chambres/avec-occupation, fallback:', e);
        // Fallback sur /chambres simple
        const fallbackRes = await api.get('/chambres');
        chambresData = fallbackRes.data?.data ?? fallbackRes.data ?? [];
        console.log(`📊 [Dashboard] ${chambresData.length} chambres chargées (fallback)`);
      }
      
      // Normaliser les chambres
      const normalizedChambres = chambresData.map((c: any) => normalizeChambre(c));
      setChambres(normalizedChambres);
      setLoadingChambres(false);

      // 3. Récupérer les réservations
      let reservationsData: any[] = [];
      try {
        const reservationsRes = await api.get('/reservations', { params: { limit: 100 } });
        reservationsData = reservationsRes.data?.data ?? reservationsRes.data ?? [];
        console.log(`📊 [Dashboard] ${reservationsData.length} réservations chargées`);
      } catch (e) {
        console.warn('[Dashboard] Erreur réservations:', e);
        reservationsData = [];
      }

      // 4. Récupérer les paiements
      let paiementsData: any[] = [];
      try {
        const paiementsRes = await api.get('/paiements');
        paiementsData = paiementsRes.data?.data ?? paiementsRes.data ?? [];
        console.log(`📊 [Dashboard] ${paiementsData.length} paiements chargés`);
      } catch (e) {
        console.warn('[Dashboard] Erreur paiements:', e);
        paiementsData = [];
      }
      setPaiements(paiementsData.map(normalizePaiement));

      // 5. Normaliser les réservations avec clients et chambres associés
      const normalizedReservations = reservationsData.map((r: any) => {
        const clientId = r?.clientId ?? r?.client_id ?? r?.client?.id;
        const client = clientsData.find((c: any) => c.id === clientId) || 
                       normalizeClient(r?.client || {});

        const chambreId = r?.chambreId ?? r?.chambre_id ?? r?.chambre?.id;
        const chambre = normalizedChambres.find((c: Chambre) => c.id === chambreId) || 
                        normalizeChambre(r?.chambre || {});

        return normalizeReservation({
          ...r,
          client,
          chambre
        });
      });

      setReservations(normalizedReservations);
      setLastRefresh(new Date());
      console.log('✅ [Dashboard] Toutes les données chargées avec succès');

    } catch (error) {
      console.error('[Dashboard] Erreur chargement:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, []);

  // ─── WEBSOCKET ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    // ✅ S'abonner aux canaux via la fonction subscribe
    if (isConnected && subscribe) {
      subscribe('dashboard');
      subscribe('reservations');
      subscribe('chambres');
      subscribe('paiements');
    }

    // ✅ Écouter les événements DOM (fallback)
    const handleRefresh = () => {
      console.log('🔄 [Dashboard] Refresh event received');
      fetchDashboardData();
    };

    window.addEventListener('refresh-dashboard', handleRefresh);
    window.addEventListener('chambre-updated', handleRefresh);
    window.addEventListener('reservation-created', handleRefresh);
    window.addEventListener('reservation-updated', handleRefresh);
    window.addEventListener('reservation-cancelled', handleRefresh);

    return () => {
      window.removeEventListener('refresh-dashboard', handleRefresh);
      window.removeEventListener('chambre-updated', handleRefresh);
      window.removeEventListener('reservation-created', handleRefresh);
      window.removeEventListener('reservation-updated', handleRefresh);
      window.removeEventListener('reservation-cancelled', handleRefresh);
    };
  }, [subscribe, isConnected, fetchDashboardData]);

  // ─── CHARGEMENT INITIAL ──────────────────────────────────────────────────────

  useEffect(() => {
    // Chargement initial
    fetchDashboardData();

    // Polling de secours toutes les 30 secondes
    const interval = setInterval(() => {
      if (!isConnected) {
        fetchDashboardData();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchDashboardData, isConnected]);

  // ─── CALCULS ──────────────────────────────────────────────────────────────────

  const totalReservations = reservations.filter(r => r.statut !== 'ANNULEE').length;
  const totalRevenue = reservations.filter(r => r.statut !== 'ANNULEE').reduce((sum, r) => sum + (r.montantTotal || 0), 0);
  const occupiedCount = chambres.filter(c => c.estOccupeeActuellement).length;
  const occupancyRate = chambres.length > 0 ? ((occupiedCount / chambres.length) * 100).toFixed(1) : '0';
  const avgNights = totalReservations > 0 ? 
    reservations.filter(r => r.statut !== 'ANNULEE').reduce((sum, r) => sum + (r.nbNuits || 0), 0) / totalReservations : 0;

  // ─── HANDLERS ─────────────────────────────────────────────────────────────────

  const handleViewReservation = (id: number) => {
    navigate(`/reservations/${id}`);
  };

  const handleEditClient = (client: Client) => {
    navigate(`/clients?edit=${client.id}`);
  };

  const handleRefresh = () => {
    fetchDashboardData();
    if (isConnected && refreshDashboard) {
      refreshDashboard();
    }
    toast.success('Données rafraîchies');
  };

  // ─── RENDU ────────────────────────────────────────────────────────────────────

  // Afficher un loader pendant le chargement initial
  if (loading && chambres.length === 0 && reservations.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          <p className="text-gray-900 font-medium">Chargement du tableau de bord...</p>
          <p className="text-gray-400 text-sm">Les Palmiers de l'Entre-Deux</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
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
              <div className="flex items-center gap-3 text-sm text-gray-500 mt-0.5 flex-wrap">
                <span>Les Palmiers de l'Entre-Deux</span>
                <span className="w-1 h-1 rounded-full bg-gray-300" />
                <span className="text-xs">{lastRefresh.toLocaleTimeString('fr-FR')}</span>
                {isConnected ? (
                  <span className="flex items-center gap-1 text-emerald-500 text-xs">
                    <WifiIcon size={11} className="animate-pulse" /> Temps réel
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-gray-400 text-xs">
                    <WifiOff size={11} /> Hors ligne
                  </span>
                )}
                {connectionError && (
                  <span className="text-red-500 text-xs">⚠️ {connectionError}</span>
                )}
              </div>
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
            subtitle={`${chambres.filter(c => !c.estOccupeeActuellement).length} chambres disponibles`} 
          />
          <StatCard 
            label="Chiffre d'affaires" 
            value={`${totalRevenue.toFixed(0)}€`} 
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
          <div><RoomOccupancySection chambres={chambres} loading={loadingChambres} /></div>
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