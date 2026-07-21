// frontend/src/pages/DashboardPage.tsx
// Tableau de bord — Les Palmiers de l'Entre-Deux
// Version refactorisée : API complète, animations fluides, UI/UX moderne et pro.
// Tous les styles nécessaires sont embarqués dans ce fichier (voir <DashboardStyles /> en bas).

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  BedDouble, CalendarCheck, TrendingUp, Users,
  Clock, Euro, Eye, Bike, Plane, MapPin, Building, Calendar,
  BarChart3, PieChart, Activity, Star, TrendingDown, Sparkles,
  RefreshCw, AlertCircle, Mail, X, ArrowRight,
  CreditCard, Wallet, Receipt, DollarSign,
  Bell, MailCheck, MailWarning,
  CheckCircle, Ban, Lock, Settings, ChevronRight
} from 'lucide-react';
import {
  BarChart, Bar, PieChart as RePieChart, Pie,
  Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area
} from 'recharts';
import api, {
  clientService, chambreService, reservationService, paiementService,
  notificationService, communicationService,
  type NotificationApi, type CommunicationStats
} from '../services/api';
import { formatDate, formatEuro, initiales } from '../utils/helpers';
import { useWebSocketContext } from '../context/WebSocketContext';

// ============================================================================
// TYPES
// ============================================================================

type StatutChambre = 'DISPONIBLE' | 'OCCUPEE' | 'EN_MAINTENANCE' | 'HORS_SERVICE' | 'BLOQUEE';
type StatutAffichage = StatutChambre;
type StatutReservation = 'EN_ATTENTE_ACOMPTE' | 'CONFIRMEE' | 'ANNULEE' | 'TERMINEE' | 'NO_SHOW';
type StatutClient = 'NOUVEAU' | 'REGULIER' | 'VIP';
type CanalAcquisition = 'DIRECT' | 'SITE_WEB' | 'BOOKING' | 'AGENCE_LOCALE' | 'BOUCHE_A_OREILLE';
type TypeService = 'LOCATION_VELO' | 'TRANSFERT_AEROPORT' | 'ACTIVITE_GUIDE';
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

interface SectionLoading {
  clients: boolean;
  chambres: boolean;
  reservations: boolean;
  paiements: boolean;
  notifications: boolean;
  communication: boolean;
}

// ============================================================================
// NORMALISATION — convertit les payloads API (snake_case / camelCase) en
// structures fiables et prévisibles pour l'UI.
// ============================================================================

const toDate = (value: any): Date => (value ? new Date(value) : new Date());

const emptyClient = (overrides: Partial<Client> = {}): Client => ({
  id: 0, civilite: '', nom: '', prenom: '', email: '', telephone: '', adresse: '',
  code_postal: '', ville: '', pays: 'France', statut: 'NOUVEAU', segment: '',
  origine_geographique: '', canal_acquisition: 'DIRECT', allergies: '', regime_alimentaire: '',
  chambre_preferee: '', nb_sejours: 0, montant_total_depense: 0,
  date_creation: new Date().toISOString(), vip: false, ...overrides
});

const emptyChambre = (overrides: Partial<Chambre> = {}): Chambre => ({
  id: 0, numero: '', nom: 'Chambre', capaciteAdultes: 2, nbLitsSimples: 0, nbLitsDoubles: 0,
  nbLitsBebe: 0, surfaceM2: 0, vue: 'JARDIN', accessiblePMR: false, statut: 'DISPONIBLE',
  equipements: [], estOccupeeActuellement: false, reservationsActuelles: [], ...overrides
});

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
  equipements: Array.isArray(c?.equipements) ? c.equipements : [],
  estOccupeeActuellement: c?.estOccupeeActuellement ?? c?.estOccupee ?? false,
  reservationsActuelles: c?.reservationsActuelles ?? c?.reservations ?? []
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
  allergies: c?.allergies ?? '',
  regime_alimentaire: c?.regime_alimentaire ?? c?.regimeAlimentaire ?? '',
  chambre_preferee: c?.chambre_preferee ?? c?.chambrePreferee ?? '',
  nb_sejours: c?.nb_sejours ?? c?.nbSejoursRealises ?? 0,
  montant_total_depense: c?.montant_total_depense ?? c?.montantTotalPaye ?? 0,
  date_creation: c?.date_creation ?? c?.dateCreation ?? new Date().toISOString(),
  vip: c?.vip ?? c?.estGroupe ?? false
});

const normalizePaiement = (p: any): Paiement => ({
  id: p?.id ?? p?.idPaiement ?? 0,
  montant: Number(p?.montant ?? 0),
  mode: p?.modePaiement ?? p?.mode ?? 'CARTE',
  typeVersement: p?.typePaiement ?? p?.typeVersement ?? p?.type ?? 'ACOMPTE',
  dateHeure: toDate(p?.datePaiement ?? p?.dateHeure ?? p?.date),
  reference: p?.reference ?? '',
  reservationId: p?.reservationId ?? p?.reservation_id
});

const normalizeReservation = (r: any, client: Client, chambre: Chambre): Reservation => {
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
    demandeSpeciale: r?.demandeSpeciale ?? r?.demandesSpeciales ?? r?.demande_speciale ?? '',
    heureArriveePrevisionnelle: r?.heureArriveePrevisionnelle ?? r?.horaireArriveeTardive ?? '',
    litBebe: r?.litBebe ?? r?.lit_bebe ?? false,
    arriveeTardive: r?.arriveeTardive ?? !!(r?.horaireArriveeTardive),
    dateCreation: toDate(r?.dateCreation ?? r?.createdAt ?? r?.date_creation),
    motifAnnulation: r?.motifAnnulation ?? r?.motif_annulation ?? '',
    chambre,
    client,
    servicesAnnexes: (r?.servicesAnnexes ?? r?.services_annexes ?? r?.services ?? []).map((s: any) => ({
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

// ============================================================================
// DONNÉES STATIQUES POUR LES GRAPHIQUES DE TENDANCE
// ============================================================================

const OCCUPANCY_TREND = [
  { date: 'Lun', occupées: 3, disponibles: 3 },
  { date: 'Mar', occupées: 4, disponibles: 2 },
  { date: 'Mer', occupées: 4, disponibles: 2 },
  { date: 'Jeu', occupées: 5, disponibles: 1 },
  { date: 'Ven', occupées: 4, disponibles: 2 },
  { date: 'Sam', occupées: 3, disponibles: 3 },
  { date: 'Dim', occupées: 2, disponibles: 4 }
];

const REVENUE_TREND = [
  { mois: 'Jan', revenus: 8200 },
  { mois: 'Fév', revenus: 7500 },
  { mois: 'Mar', revenus: 9100 },
  { mois: 'Avr', revenus: 8800 },
  { mois: 'Mai', revenus: 10200 },
  { mois: 'Juin', revenus: 12450 }
];

const ACQUISITION_COLORS: Record<CanalAcquisition, string> = {
  DIRECT: '#10b981',
  SITE_WEB: '#3b82f6',
  BOOKING: '#ef4444',
  AGENCE_LOCALE: '#f59e0b',
  BOUCHE_A_OREILLE: '#8b5cf6'
};

const ACQUISITION_LABELS: Record<CanalAcquisition, string> = {
  DIRECT: 'Direct',
  SITE_WEB: 'Site web',
  BOOKING: 'Booking',
  AGENCE_LOCALE: 'Agence locale',
  BOUCHE_A_OREILLE: 'Bouche-à-oreille'
};

// ============================================================================
// ANIMATIONS PARTAGÉES
// ============================================================================

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
};

const fadeInScale = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.45, ease: 'easeOut' } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } }
};

const pulseAnimation = {
  scale: [1, 1.05, 1],
  transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
};

// ============================================================================
// CONFIGURATION VISUELLE DES STATUTS
// ============================================================================

const STATUT_CHAMBRE_CONFIG: Record<StatutAffichage, {
  label: string; dot: string; badge: string; card: string; icon: React.ReactNode;
}> = {
  DISPONIBLE: { label: 'Disponible', dot: 'bg-emerald-400', badge: 'bg-emerald-50 border-emerald-200 text-emerald-700', card: 'bg-emerald-50/80 border-emerald-200', icon: <CheckCircle size={12} /> },
  OCCUPEE: { label: 'Occupée', dot: 'bg-blue-400', badge: 'bg-blue-50 border-blue-200 text-blue-700', card: 'bg-blue-50/80 border-blue-200', icon: <Users size={12} /> },
  EN_MAINTENANCE: { label: 'Maintenance', dot: 'bg-amber-400', badge: 'bg-amber-50 border-amber-200 text-amber-700', card: 'bg-amber-50/80 border-amber-200', icon: <Settings size={12} /> },
  HORS_SERVICE: { label: 'Hors service', dot: 'bg-red-400', badge: 'bg-red-50 border-red-200 text-red-700', card: 'bg-red-50/80 border-red-200', icon: <Ban size={12} /> },
  BLOQUEE: { label: 'Bloquée', dot: 'bg-violet-400', badge: 'bg-violet-50 border-violet-200 text-violet-700', card: 'bg-violet-50/80 border-violet-200', icon: <Lock size={12} /> }
};

const STATUT_RESERVATION_CONFIG: Record<StatutReservation, { bg: string; text: string; border: string; label: string }> = {
  EN_ATTENTE_ACOMPTE: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', label: 'En attente' },
  CONFIRMEE: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', label: 'Confirmée' },
  ANNULEE: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: 'Annulée' },
  TERMINEE: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', label: 'Terminée' },
  NO_SHOW: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300', label: 'No-show' }
};

const MODE_PAIEMENT_CONFIG: Record<ModePaiement, { label: string; icon: JSX.Element; classes: string }> = {
  ESPECES: { label: 'Espèces', icon: <Wallet size={14} />, classes: 'bg-green-100 text-green-700 border-green-200' },
  CARTE: { label: 'Carte', icon: <CreditCard size={14} />, classes: 'bg-blue-100 text-blue-700 border-blue-200' },
  VIREMENT: { label: 'Virement', icon: <Receipt size={14} />, classes: 'bg-purple-100 text-purple-700 border-purple-200' },
  CHEQUE: { label: 'Chèque', icon: <DollarSign size={14} />, classes: 'bg-amber-100 text-amber-700 border-amber-200' }
};

const TYPE_VERSEMENT_LABELS: Record<TypeVersement, string> = { ACOMPTE: 'Acompte', SOLDE: 'Solde', ARRHES: 'Arrhes' };

const SERVICE_CONFIG: Record<TypeService, { label: string; icon: JSX.Element }> = {
  LOCATION_VELO: { label: 'Vélo', icon: <Bike size={16} /> },
  TRANSFERT_AEROPORT: { label: 'Transfert', icon: <Plane size={16} /> },
  ACTIVITE_GUIDE: { label: 'Activité', icon: <MapPin size={16} /> }
};

// ============================================================================
// COMPOSANTS UTILITAIRES
// ============================================================================

/** Texte tronqué proprement, avec info-bulle native pour retrouver la valeur complète. */
const Truncate: React.FC<{ children: React.ReactNode; className?: string; as?: 'span' | 'p' | 'div' }> = ({ children, className = '', as = 'span' }) => {
  const Tag = as as any;
  const title = typeof children === 'string' ? children : undefined;
  return <Tag className={`truncate min-w-0 ${className}`} title={title}>{children}</Tag>;
};

/** Placeholder animé pendant le chargement d'une section. */
const SkeletonBlock: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`skeleton-shimmer rounded-xl ${className}`} />
);

const SectionSkeleton: React.FC<{ rows?: number; label: string }> = ({ rows = 3, label }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4" aria-busy="true" aria-label={label}>
    <SkeletonBlock className="h-4 w-1/3 mb-4" />
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => <SkeletonBlock key={i} className="h-10 w-full" />)}
    </div>
  </div>
);

/** Compteur animé pour donner du relief aux indicateurs clés. */
const useCountUp = (value: number, duration = 700) => {
  const [display, setDisplay] = useState(0);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(0);

  useEffect(() => {
    fromRef.current = display;
    startRef.current = null;
    let raf: number;
    const step = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const progress = Math.min(1, (ts - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(fromRef.current + (value - fromRef.current) * eased);
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return display;
};

const StatCard: React.FC<{
  label: string; value: number | string; icon: React.ReactNode; color?: 'emerald' | 'amber' | 'blue' | 'purple' | 'red';
  subtitle?: string; trend?: number; isNumeric?: boolean; suffix?: string;
}> = ({ label, value, icon, color = 'emerald', subtitle, trend, isNumeric = false, suffix = '' }) => {
  const palette: Record<string, { bg: string; border: string; iconBg: string; iconText: string }> = {
    emerald: { bg: 'bg-gradient-to-br from-emerald-50 via-emerald-50/60 to-white', border: 'border-emerald-200/80', iconBg: 'bg-white ring-1 ring-emerald-100 shadow-emerald-100', iconText: 'text-emerald-600' },
    amber: { bg: 'bg-gradient-to-br from-amber-50 via-amber-50/60 to-white', border: 'border-amber-200/80', iconBg: 'bg-white ring-1 ring-amber-100 shadow-amber-100', iconText: 'text-amber-600' },
    blue: { bg: 'bg-gradient-to-br from-blue-50 via-blue-50/60 to-white', border: 'border-blue-200/80', iconBg: 'bg-white ring-1 ring-blue-100 shadow-blue-100', iconText: 'text-blue-600' },
    purple: { bg: 'bg-gradient-to-br from-purple-50 via-purple-50/60 to-white', border: 'border-purple-200/80', iconBg: 'bg-white ring-1 ring-purple-100 shadow-purple-100', iconText: 'text-purple-600' },
    red: { bg: 'bg-gradient-to-br from-red-50 via-red-50/60 to-white', border: 'border-red-200/80', iconBg: 'bg-white ring-1 ring-red-100 shadow-red-100', iconText: 'text-red-600' }
  };
  const c = palette[color];
  const numericValue = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^\d.-]/g, '')) || 0;
  const animated = useCountUp(isNumeric ? numericValue : 0);

  return (
    <motion.div
      variants={fadeInScale}
      whileHover={{ y: -5, scale: 1.02, boxShadow: '0 16px 32px -12px rgba(0,0,0,0.14)' }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`relative overflow-hidden p-4 sm:p-5 rounded-2xl border ${c.border} ${c.bg} shadow-sm hover:shadow-md transition-shadow duration-300 cursor-default min-w-0`}
    >
      <div className="absolute -right-6 -top-6 w-20 h-20 rounded-full bg-white/40 blur-2xl pointer-events-none" />
      <div className="relative flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <Truncate as="p" className="text-[11px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</Truncate>
          <p className="stat-value font-bold mt-1 text-gray-900 leading-tight">
            {isNumeric ? Math.round(animated).toLocaleString('fr-FR') : value}{isNumeric ? suffix : ''}
          </p>
          {subtitle && <Truncate as="p" className="text-xs text-gray-500 mt-0.5">{subtitle}</Truncate>}
          {trend !== undefined && (
            <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span className="truncate">{Math.abs(trend)}% vs mois dernier</span>
            </div>
          )}
        </div>
        <motion.div whileHover={{ rotate: 15, scale: 1.1 }} className={`p-2.5 ${c.iconBg} ${c.iconText} rounded-xl shadow-sm shrink-0`}>
          {icon}
        </motion.div>
      </div>
    </motion.div>
  );
};

const StatusBadge: React.FC<{ statut: StatutReservation }> = ({ statut }) => {
  const s = STATUT_RESERVATION_CONFIG[statut] || STATUT_RESERVATION_CONFIG.TERMINEE;
  return (
    <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border whitespace-nowrap ${s.bg} ${s.text} ${s.border}`}>
      {s.label}
    </span>
  );
};

const ChambreStatusBadge: React.FC<{ statut: StatutAffichage; animated?: boolean }> = ({ statut, animated = false }) => {
  const cfg = STATUT_CHAMBRE_CONFIG[statut];
  return (
    <span
      title={cfg.label}
      className={`inline-flex w-full max-w-full items-center gap-1 px-2 py-1 text-[10px] sm:text-[11px] font-medium rounded-full border leading-tight ${cfg.badge} ${animated ? 'animate-pulse' : ''}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot} ${animated ? 'animate-ping' : ''}`} />
      <span className="truncate min-w-0 flex-1">{cfg.label}</span>
    </span>
  );
};

const SectionCard: React.FC<{ title: string; icon: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, icon, right, children, className = '' }) => (
  <motion.div
    variants={fadeInUp}
    whileHover={{ y: -2 }}
    transition={{ type: 'spring', stiffness: 300, damping: 28 }}
    className={`bg-white rounded-2xl shadow-sm hover:shadow-md border border-gray-100 p-4 min-w-0 transition-shadow duration-300 ${className}`}
  >
    <div className="flex items-center gap-2 mb-3 min-w-0">
      <h3 className="font-semibold text-gray-900 flex items-center gap-2 min-w-0">
        <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">{icon}</span>
        <Truncate>{title}</Truncate>
      </h3>
      {right && <div className="ml-auto shrink-0">{right}</div>}
    </div>
    {children}
  </motion.div>
);

// ============================================================================
// SECTION : Arrivées & départs du jour
// ============================================================================

const ArrivalsDeparturesSection: React.FC<{ reservations: Reservation[]; loading: boolean; onClientClick: (c: Client) => void }> = ({ reservations, loading, onClientClick }) => {
  const today = new Date();
  const todayStr = today.toDateString();

  const arrivals = useMemo(() => reservations.filter(r => new Date(r.dateArrivee).toDateString() === todayStr && r.statut !== 'ANNULEE' && r.statut !== 'NO_SHOW'), [reservations, todayStr]);
  const departures = useMemo(() => reservations.filter(r => new Date(r.dateDepart).toDateString() === todayStr && r.statut !== 'ANNULEE' && r.statut !== 'NO_SHOW'), [reservations, todayStr]);

  if (loading) return <SectionSkeleton rows={3} label="Arrivées et départs du jour" />;

  const Column = ({ title, items, tint, dot }: { title: string; items: Reservation[]; tint: string; dot: string }) => (
    <div className="p-4 min-w-0">
      <div className="flex items-center gap-2 mb-3">
        <motion.div animate={pulseAnimation} className={`w-2.5 h-2.5 rounded-full shrink-0 ${dot}`} />
        <span className="text-sm font-medium text-gray-700">{title}</span>
        <span className="ml-auto text-xs font-semibold text-gray-400">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mb-2">
            <CalendarCheck size={18} className="text-gray-300" />
          </div>
          <p className="text-sm text-gray-400 italic">Aucun{title === 'Arrivées' ? 'e arrivée' : ' départ'} prévu{title === 'Arrivées' ? 'e' : ''}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((r, i) => (
            <motion.button
              key={r.id}
              type="button"
              onClick={() => onClientClick(r.client)}
              initial={{ opacity: 0, x: title === 'Arrivées' ? -15 : 15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ scale: 1.015, x: title === 'Arrivées' ? 2 : -2 }}
              whileTap={{ scale: 0.99 }}
              className={`w-full flex items-center justify-between gap-2 p-3 bg-gradient-to-r ${tint} to-white rounded-xl border border-gray-100/70 text-left min-w-0`}
            >
              <div className="min-w-0 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white ring-1 ring-gray-100 flex items-center justify-center text-[11px] font-bold text-gray-600 shrink-0">
                  {initiales(r.client.prenom, r.client.nom)}
                </div>
                <div className="min-w-0">
                  <Truncate as="p" className="text-sm font-medium text-gray-900">{r.client.prenom} {r.client.nom}</Truncate>
                  <Truncate as="p" className="text-xs text-gray-500">{r.chambre.nom} · {r.nbNuits} nuit{r.nbNuits > 1 ? 's' : ''}</Truncate>
                </div>
              </div>
              <div className="shrink-0"><StatusBadge statut={r.statut} /></div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <motion.div variants={fadeInUp} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 border border-gray-100 overflow-hidden">
      <div className="border-b border-gray-100 px-5 py-4 flex flex-wrap justify-between items-center gap-2 bg-gradient-to-r from-emerald-50/60 via-gray-50 to-white">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 min-w-0">
          <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 shrink-0"><Clock size={16} /></span>
          <Truncate>Arrivées &amp; départs du jour</Truncate>
          <span className="text-xs text-gray-400 font-normal whitespace-nowrap">
            {new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: '2-digit', month: '2-digit' }).format(today)}
          </span>
        </h3>
        <span className="text-xs font-medium text-gray-500 whitespace-nowrap bg-white px-2.5 py-1 rounded-full border border-gray-100">
          {arrivals.length} arrivée{arrivals.length !== 1 ? 's' : ''} · {departures.length} départ{departures.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
        <Column title="Arrivées" items={arrivals} tint="from-green-50" dot="bg-green-500" />
        <Column title="Départs" items={departures} tint="from-amber-50" dot="bg-amber-500" />
      </div>
    </motion.div>
  );
};

// ============================================================================
// SECTION : Occupation des chambres
// ============================================================================

const RoomOccupancySection: React.FC<{ chambres: Chambre[]; loading: boolean }> = ({ chambres, loading }) => {
  if (loading) return <SectionSkeleton rows={4} label="Occupation des chambres" />;

  const availableCount = chambres.filter(c => !c.estOccupeeActuellement).length;

  return (
    <SectionCard
      title="Chambres"
      icon={<Building size={18} />}
      right={
        <motion.span initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full whitespace-nowrap">
          {availableCount} libre{availableCount !== 1 ? 's' : ''}
        </motion.span>
      }
    >
      {chambres.length === 0 ? (
        <p className="text-sm text-gray-400 italic text-center py-6">Aucune chambre enregistrée</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2">
          {chambres.map((chambre, i) => {
            const estOccupee = !!chambre.estOccupeeActuellement;
            const statut: StatutAffichage = estOccupee ? 'OCCUPEE' : chambre.statut;
            const cfg = STATUT_CHAMBRE_CONFIG[statut];
            return (
              <motion.div
                key={chambre.id}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ scale: 1.04, y: -2 }}
                className={`flex flex-col gap-1.5 p-3 rounded-xl border transition-colors duration-200 cursor-default min-w-0 overflow-hidden ${cfg.card}`}
              >
                <div className="min-w-0">
                  <Truncate as="p" className="font-bold text-sm text-gray-800">{chambre.nom}</Truncate>
                  <Truncate as="p" className="text-xs text-gray-400">{chambre.numero}</Truncate>
                </div>
                <ChambreStatusBadge statut={statut} animated={estOccupee} />
              </motion.div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
};

// ============================================================================
// SECTION : Graphiques (occupation, revenus, acquisition)
// ============================================================================

const ChartTooltipStyle = { borderRadius: '12px', border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', color: '#1f2937' } as const;

const OccupancyChart: React.FC = () => (
  <SectionCard title="Occupation 7 jours" icon={<BarChart3 size={18} />}>
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={OCCUPANCY_TREND} layout="vertical" barSize={18}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
          <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 12 }} />
          <YAxis type="category" dataKey="date" width={40} axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 12 }} />
          <Tooltip contentStyle={ChartTooltipStyle} />
          <Bar dataKey="occupées" stackId="a" fill="#10b981" radius={[0, 6, 6, 0]} animationDuration={800} />
          <Bar dataKey="disponibles" stackId="a" fill="#e5e7eb" radius={[6, 0, 0, 6]} animationDuration={800} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </SectionCard>
);

const RevenueChart: React.FC = () => (
  <SectionCard title="Évolution des revenus" icon={<TrendingUp size={18} />}>
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={REVENUE_TREND}>
          <defs>
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="mois" axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 12 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 12 }} />
          <Tooltip contentStyle={ChartTooltipStyle} formatter={(value) => [`${value}€`, 'Revenus']} />
          <Area type="monotone" dataKey="revenus" stroke="#10b981" strokeWidth={3} fill="url(#revenueGrad)" animationDuration={900} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </SectionCard>
);

const AcquisitionChart: React.FC<{ clients: Client[] }> = ({ clients }) => {
  const data = useMemo(() => {
    const counts = clients.reduce((acc, c) => {
      const canal = c.canal_acquisition || 'DIRECT';
      acc[canal] = (acc[canal] || 0) + 1;
      return acc;
    }, {} as Record<CanalAcquisition, number>);
    return (Object.keys(ACQUISITION_LABELS) as CanalAcquisition[])
      .map(key => ({ key, name: ACQUISITION_LABELS[key], value: counts[key] || 0, color: ACQUISITION_COLORS[key] }))
      .filter(d => d.value > 0);
  }, [clients]);

  return (
    <SectionCard title="Canaux d'acquisition" icon={<PieChart size={18} />} className="overflow-hidden">
      {data.length === 0 ? (
        <p className="text-sm text-gray-400 italic text-center py-10">Aucune donnée client</p>
      ) : (
        <>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={34} outerRadius={58} paddingAngle={3} dataKey="value" animationDuration={800}>
                  {data.map((entry) => <Cell key={entry.key} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={ChartTooltipStyle} formatter={(value) => [`${value} réservation(s)`, '']} />
              </RePieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {data.map((entry) => (
              <div key={entry.key} className="flex items-center gap-1.5 min-w-0 max-w-full rounded-full bg-gray-50 px-2.5 py-1 text-xs text-gray-700 border border-gray-100">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                <Truncate className="text-gray-700">{entry.name}</Truncate>
                <span className="font-semibold text-gray-900 shrink-0">{entry.value}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </SectionCard>
  );
};

// ============================================================================
// SECTION : Statistiques clients
// ============================================================================

const ClientStatsSection: React.FC<{ clients: Client[]; loading: boolean }> = ({ clients, loading }) => {
  if (loading) return <SectionSkeleton rows={2} label="Statistiques clients" />;

  const total = clients.length;
  const vip = clients.filter(c => c.vip || c.statut === 'VIP').length;
  const regulier = clients.filter(c => c.statut === 'REGULIER').length;
  const nouveau = clients.filter(c => c.statut === 'NOUVEAU').length;
  const totalRevenue = clients.reduce((sum, c) => sum + (c.montant_total_depense || 0), 0);

  return (
    <SectionCard title="Clients" icon={<Users size={18} />}>
      <div className="grid grid-cols-2 gap-2.5 mb-3">
        <div className="text-center p-3 bg-gradient-to-br from-emerald-50 to-white rounded-xl border border-emerald-100/50 min-w-0">
          <p className="stat-value font-bold text-emerald-700">{total}</p>
          <p className="text-xs text-gray-500">Total</p>
        </div>
        <div className="text-center p-3 bg-gradient-to-br from-amber-50 to-white rounded-xl border border-amber-100/50 min-w-0">
          <Truncate as="p" className="stat-value font-bold text-amber-700 text-center">{formatEuro(totalRevenue)}</Truncate>
          <p className="text-xs text-gray-500">Dépenses</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <div className="text-center p-2 bg-gradient-to-br from-yellow-50 to-white rounded-xl border border-yellow-100/50">
          <p className="text-sm font-bold text-yellow-700">{vip}</p>
          <p className="text-xs text-gray-500 flex items-center justify-center gap-0.5"><Star size={10} className="text-yellow-500 fill-yellow-500 shrink-0" /> VIP</p>
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
    </SectionCard>
  );
};

// ============================================================================
// SECTION : Paiements
// ============================================================================

const PaiementsSection: React.FC<{ paiements: Paiement[]; reservations: Reservation[]; loading: boolean }> = ({ paiements, reservations, loading }) => {
  if (loading) return <SectionSkeleton rows={3} label="Paiements du mois" />;

  const today = new Date();
  const paiementsMois = paiements.filter(p => {
    const d = new Date(p.dateHeure);
    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  });

  const totalEncaissements = paiementsMois.reduce((sum, p) => sum + p.montant, 0);
  const totalAcomptes = paiementsMois.filter(p => p.typeVersement === 'ACOMPTE').reduce((sum, p) => sum + p.montant, 0);
  const totalSoldes = paiementsMois.filter(p => p.typeVersement === 'SOLDE').reduce((sum, p) => sum + p.montant, 0);
  const totalArrhes = paiementsMois.filter(p => p.typeVersement === 'ARRHES').reduce((sum, p) => sum + p.montant, 0);

  const paiementsParMode = paiementsMois.reduce((acc, p) => {
    acc[p.mode] = (acc[p.mode] || 0) + p.montant;
    return acc;
  }, {} as Partial<Record<ModePaiement, number>>);

  const impayes = reservations.filter(r => r.montantRestantDu > 0 && !['ANNULEE', 'NO_SHOW', 'TERMINEE'].includes(r.statut));

  const paiementsRecents = [...paiements].sort((a, b) => new Date(b.dateHeure).getTime() - new Date(a.dateHeure).getTime()).slice(0, 5);

  return (
    <SectionCard
      title="Paiements du mois"
      icon={<CreditCard size={18} />}
      right={<span className="text-xs text-gray-400 whitespace-nowrap">{new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(today)}</span>}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        {[
          { label: 'Total encaissé', value: totalEncaissements, tint: 'emerald' },
          { label: 'Acomptes', value: totalAcomptes, tint: 'blue' },
          { label: 'Soldes', value: totalSoldes, tint: 'purple' },
          { label: 'Arrhes', value: totalArrhes, tint: 'amber' }
        ].map(item => (
          <div key={item.label} className={`text-center p-2 bg-${item.tint}-50 rounded-xl border border-${item.tint}-100/50 min-w-0`}>
            <Truncate as="p" className={`text-lg font-bold text-${item.tint}-700`}>{item.value.toFixed(0)}€</Truncate>
            <p className="text-xs text-gray-500">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {Object.entries(paiementsParMode).length === 0 ? (
          <span className="text-xs text-gray-400 italic">Aucun paiement ce mois</span>
        ) : (
          Object.entries(paiementsParMode).map(([mode, montant]) => {
            const cfg = MODE_PAIEMENT_CONFIG[mode as ModePaiement];
            return (
              <div key={mode} className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border max-w-full ${cfg.classes}`}>
                {cfg.icon}
                <Truncate className="max-w-[7rem]">{cfg.label}</Truncate>
                <span className="font-bold ml-0.5 shrink-0">{(montant ?? 0).toFixed(0)}€</span>
              </div>
            );
          })
        )}
      </div>

      {impayes.length > 0 && (
        <div className="mb-3 p-3 bg-red-50 rounded-xl border border-red-200">
          <div className="flex items-center gap-2 text-sm text-red-700 font-medium mb-1">
            <AlertCircle size={16} className="shrink-0" />
            {impayes.length} impayé{impayes.length > 1 ? 's' : ''}
          </div>
          <div className="space-y-1">
            {impayes.slice(0, 3).map(r => (
              <div key={r.id} className="flex justify-between gap-2 text-xs">
                <Truncate className="text-red-600">{r.client.prenom} {r.client.nom}</Truncate>
                <span className="font-bold text-red-700 shrink-0">{r.montantRestantDu.toFixed(0)}€</span>
              </div>
            ))}
            {impayes.length > 3 && <p className="text-xs text-red-400">+ {impayes.length - 3} autre{impayes.length - 3 > 1 ? 's' : ''}</p>}
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
              const cfg = MODE_PAIEMENT_CONFIG[p.mode];
              return (
                <motion.div key={p.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} className="flex items-center justify-between gap-2 p-2 bg-gray-50 rounded-xl border border-gray-100/50 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`${cfg.classes.split(' ')[0]} p-1 rounded-full shrink-0`}>{cfg.icon}</span>
                    <div className="min-w-0">
                      <Truncate as="p" className="text-sm font-medium text-gray-900">{reservation?.client?.prenom} {reservation?.client?.nom}</Truncate>
                      <Truncate as="p" className="text-xs text-gray-500">{TYPE_VERSEMENT_LABELS[p.typeVersement]} · {cfg.label}</Truncate>
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
    </SectionCard>
  );
};

// ============================================================================
// SECTION : Répartition des revenus
// ============================================================================

const RevenueDistributionSection: React.FC<{ reservations: Reservation[]; loading: boolean }> = ({ reservations, loading }) => {
  if (loading) return <SectionSkeleton rows={3} label="Répartition des revenus" />;

  const totalHebergement = reservations.filter(r => r.statut !== 'ANNULEE').reduce((s, r) => s + (r.montantTotal || 0), 0);
  const totalAnnexes = reservations.flatMap(r => r.servicesAnnexes || []).reduce((s, svc) => s + (svc.montant || 0), 0);
  const total = totalHebergement + totalAnnexes;

  const items = [
    { label: 'Hébergement', value: totalHebergement, color: 'bg-emerald-500' },
    { label: 'Services annexes', value: totalAnnexes, color: 'bg-blue-500' }
  ];

  return (
    <SectionCard title="Répartition des revenus" icon={<PieChart size={18} />}>
      {total === 0 ? (
        <p className="text-sm text-gray-400 italic text-center py-6">Aucune donnée</p>
      ) : (
        <>
          <div className="space-y-2.5">
            {items.map((item, i) => {
              const pct = (item.value / total) * 100;
              return (
                <motion.div key={item.label} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.08 }}>
                  <div className="flex justify-between gap-2 text-sm">
                    <Truncate className="text-gray-600">{item.label}</Truncate>
                    <span className="font-medium text-gray-900 shrink-0">{item.value.toFixed(0)}€ ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden mt-1">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, delay: 0.15 + i * 0.08 }} className={`h-full rounded-full ${item.color}`} />
                  </div>
                </motion.div>
              );
            })}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-sm font-bold">
            <span className="text-gray-600">Total</span>
            <span className="text-emerald-700">{total.toFixed(0)}€</span>
          </div>
        </>
      )}
    </SectionCard>
  );
};

// ============================================================================
// SECTION : Services annexes actifs
// ============================================================================

const ActiveServicesSection: React.FC<{ reservations: Reservation[]; loading: boolean }> = ({ reservations, loading }) => {
  if (loading) return <SectionSkeleton rows={3} label="Services actifs" />;

  const active = reservations
    .flatMap(r => (r.servicesAnnexes || []).map(s => ({ ...s, reservation: r })))
    .filter(s => s.statut === 'CONFIRME' || s.statut === 'EN_COURS');

  return (
    <SectionCard
      title="Services actifs"
      icon={<Activity size={18} />}
      right={active.length > 0 ? <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">{active.length}</span> : undefined}
    >
      {active.length === 0 ? (
        <p className="text-sm text-gray-400 italic text-center py-6">Aucun service actif</p>
      ) : (
        <div className="space-y-2">
          {active.map((s, i) => {
            const cfg = SERVICE_CONFIG[s.type] || { label: s.type, icon: <Activity size={16} /> };
            return (
              <motion.div key={s.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} className="flex items-center justify-between gap-2 p-2.5 bg-gray-50 rounded-xl border border-gray-100/50 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-emerald-600 shrink-0">{cfg.icon}</span>
                  <div className="min-w-0">
                    <Truncate as="p" className="text-sm font-medium text-gray-900">{cfg.label}</Truncate>
                    <Truncate as="p" className="text-xs text-gray-500">{s.reservation?.client?.prenom} {s.reservation?.client?.nom}</Truncate>
                  </div>
                </div>
                <span className="text-sm font-semibold text-gray-900 shrink-0">{s.montant}€</span>
              </motion.div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
};

// ============================================================================
// SECTION : Prochains jours (7 jours) — comble l'espace et enrichit la donnée
// ============================================================================

const UpcomingWeekSection: React.FC<{ reservations: Reservation[]; loading: boolean; onView: (id: number) => void }> = ({ reservations, loading, onView }) => {
  if (loading) return <SectionSkeleton rows={3} label="Prochains jours" />;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in7 = new Date(today);
  in7.setDate(in7.getDate() + 7);

  const upcoming = useMemo(() => reservations
    .filter(r => {
      const arrivee = new Date(r.dateArrivee);
      return arrivee >= today && arrivee <= in7 && r.statut !== 'ANNULEE' && r.statut !== 'NO_SHOW';
    })
    .sort((a, b) => new Date(a.dateArrivee).getTime() - new Date(b.dateArrivee).getTime())
    .slice(0, 6),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [reservations]);

  const totalNuitees = upcoming.reduce((sum, r) => sum + (r.nbNuits || 0), 0);

  return (
    <SectionCard
      title="Prochains 7 jours"
      icon={<Sparkles size={18} />}
      right={upcoming.length > 0 ? <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">{upcoming.length} arrivée{upcoming.length !== 1 ? 's' : ''}</span> : undefined}
    >
      {upcoming.length === 0 ? (
        <p className="text-sm text-gray-400 italic text-center py-6">Aucune arrivée prévue cette semaine</p>
      ) : (
        <>
          <div className="space-y-2 mb-3">
            {upcoming.map((r, i) => (
              <motion.button
                key={r.id}
                type="button"
                onClick={() => onView(r.id)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                whileHover={{ x: 2, backgroundColor: '#f9fafb' }}
                className="w-full flex items-center justify-between gap-2 p-2.5 rounded-xl border border-gray-100/70 text-left min-w-0"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex flex-col items-center justify-center shrink-0 leading-none">
                    <span className="text-[13px] font-bold">{new Date(r.dateArrivee).getDate()}</span>
                    <span className="text-[9px] uppercase">{new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(new Date(r.dateArrivee))}</span>
                  </div>
                  <div className="min-w-0">
                    <Truncate as="p" className="text-sm font-medium text-gray-900">{r.client.prenom} {r.client.nom}</Truncate>
                    <Truncate as="p" className="text-xs text-gray-500">{r.chambre.nom} · {r.nbNuits} nuit{r.nbNuits > 1 ? 's' : ''}</Truncate>
                  </div>
                </div>
                <ArrowRight size={14} className="text-gray-300 shrink-0" />
              </motion.button>
            ))}
          </div>
          <div className="pt-3 border-t border-gray-100 flex justify-between text-sm">
            <span className="text-gray-500">Nuitées prévues</span>
            <span className="font-bold text-gray-900">{totalNuitees}</span>
          </div>
        </>
      )}
    </SectionCard>
  );
};

// ============================================================================
// SECTION : Notifications récentes (API /notifications)
// ============================================================================

const NotificationsSection: React.FC<{ notifications: NotificationApi[]; unreadCount: number; loading: boolean; onMarkAllRead: () => void }> = ({ notifications, unreadCount, loading, onMarkAllRead }) => {
  if (loading) return <SectionSkeleton rows={3} label="Notifications" />;

  const graviteStyles: Record<string, string> = {
    info: 'bg-blue-50 text-blue-600 border-blue-100',
    success: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    warning: 'bg-amber-50 text-amber-600 border-amber-100',
    error: 'bg-red-50 text-red-600 border-red-100'
  };

  const recent = notifications.slice(0, 5);

  return (
    <SectionCard
      title="Notifications"
      icon={<Bell size={18} />}
      right={
        unreadCount > 0 ? (
          <button onClick={onMarkAllRead} className="text-xs font-medium text-emerald-600 hover:text-emerald-700 whitespace-nowrap">
            Tout marquer lu ({unreadCount})
          </button>
        ) : (
          <span className="text-xs text-gray-400 whitespace-nowrap">À jour</span>
        )
      }
    >
      {recent.length === 0 ? (
        <p className="text-sm text-gray-400 italic text-center py-6">Aucune notification</p>
      ) : (
        <div className="space-y-1.5">
          {recent.map((n, i) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className={`flex items-start gap-2 p-2.5 rounded-xl border min-w-0 ${n.lu ? 'bg-gray-50 border-gray-100/70' : 'bg-white border-emerald-100 shadow-sm'}`}
            >
              <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${n.lu ? 'bg-gray-300' : 'bg-emerald-500'}`} />
              <div className="min-w-0 flex-1">
                <Truncate as="p" className="text-sm font-medium text-gray-900">{n.titre}</Truncate>
                <Truncate as="p" className="text-xs text-gray-500">{n.message}</Truncate>
              </div>
              <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full border whitespace-nowrap ${graviteStyles[n.gravite] || graviteStyles.info}`}>
                {n.gravite}
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </SectionCard>
  );
};

// ============================================================================
// SECTION : Communication (emails) — API /communication/stats
// ============================================================================

const CommunicationSection: React.FC<{ stats: CommunicationStats | null; loading: boolean; onGoTo: () => void }> = ({ stats, loading, onGoTo }) => {
  if (loading) return <SectionSkeleton rows={2} label="Communication" />;

  const totalEnvois = stats?.totalEnvois ?? (stats as any)?.total ?? 0;
  const tauxSucces = stats?.tauxSucces ?? 0;
  const derniers = stats?.derniersEnvois ?? [];

  return (
    <SectionCard
      title="Communication"
      icon={<Mail size={18} />}
      right={
        <button onClick={onGoTo} className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 whitespace-nowrap">
          Voir tout <ChevronRight size={12} />
        </button>
      }
    >
      {!stats ? (
        <p className="text-sm text-gray-400 italic text-center py-6">Statistiques indisponibles</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            <div className="text-center p-3 bg-gradient-to-br from-emerald-50 to-white rounded-xl border border-emerald-100/50 min-w-0">
              <p className="stat-value font-bold text-emerald-700">{totalEnvois}</p>
              <p className="text-xs text-gray-500">Envois</p>
            </div>
            <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-white rounded-xl border border-blue-100/50 min-w-0">
              <p className="stat-value font-bold text-blue-700">{tauxSucces.toFixed ? tauxSucces.toFixed(0) : tauxSucces}%</p>
              <p className="text-xs text-gray-500">Taux de succès</p>
            </div>
          </div>
          {derniers.length > 0 && (
            <div className="space-y-1.5">
              {derniers.slice(0, 3).map((m: any) => (
                <div key={m.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl border border-gray-100/50 min-w-0">
                  {m.statut === 'ENVOYE' || m.statut === 'success' ? (
                    <MailCheck size={14} className="text-emerald-500 shrink-0" />
                  ) : (
                    <MailWarning size={14} className="text-amber-500 shrink-0" />
                  )}
                  <Truncate className="text-xs text-gray-700 flex-1">{m.sujet || m.type}</Truncate>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </SectionCard>
  );
};

// ============================================================================
// SECTION : Réservations récentes
// ============================================================================

const RecentReservationsSection: React.FC<{ reservations: Reservation[]; loading: boolean; onView: (id: number) => void; onClientClick: (c: Client) => void }> = ({ reservations, loading, onView, onClientClick }) => {
  if (loading) return <SectionSkeleton rows={5} label="Dernières réservations" />;

  const sorted = [...reservations].sort((a, b) => new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime()).slice(0, 7);

  if (sorted.length === 0) {
    return (
      <motion.div variants={fadeInUp} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
        <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
          <CalendarCheck size={22} className="text-gray-300" />
        </div>
        <p className="text-gray-400">Aucune réservation récente</p>
      </motion.div>
    );
  }

  return (
    <motion.div variants={fadeInUp} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 border border-gray-100 overflow-hidden">
      <div className="border-b border-gray-100 px-5 py-4 flex justify-between items-center gap-2 bg-gradient-to-r from-emerald-50/60 via-gray-50 to-white">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 min-w-0">
          <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 shrink-0"><CalendarCheck size={16} /></span>
          <Truncate>Dernières réservations</Truncate>
        </h3>
        <span className="text-xs text-gray-400 whitespace-nowrap bg-white px-2.5 py-1 rounded-full border border-gray-100">{sorted.length} récentes</span>
      </div>
      <div className="overflow-x-auto dashboard-scrollbar">
        <table className="w-full text-sm min-w-[640px]">
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
                <td className="px-4 py-3 text-xs font-mono text-gray-500 whitespace-nowrap">{r.numeroReservation}</td>
                <td className="px-4 py-3 font-medium text-gray-900 max-w-[10rem]">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onClientClick(r.client); }}
                    className="hover:text-emerald-600 transition-colors text-left w-full"
                  >
                    <Truncate>{r.client?.prenom || '—'} {r.client?.nom || '—'}</Truncate>
                  </button>
                </td>
                <td className="px-4 py-3 text-gray-600 max-w-[8rem]"><Truncate>{r.chambre?.nom || '—'}</Truncate></td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(r.dateArrivee)}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(r.dateDepart)}</td>
                <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{r.montantTotal || 0}€</td>
                <td className="px-4 py-3"><StatusBadge statut={r.statut} /></td>
                <td className="px-4 py-3 text-center">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => { e.stopPropagation(); onView(r.id); }}
                    className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors"
                    aria-label={`Voir la réservation ${r.numeroReservation}`}
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

// ============================================================================
// OVERLAY : Détail client
// ============================================================================

const ClientDetailOverlay: React.FC<{ client: Client; onClose: () => void; onEdit: (client: Client) => void }> = ({ client, onClose, onEdit }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
  >
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
      className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto dashboard-scrollbar"
    >
      <div className="flex items-center justify-between gap-2 px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10 rounded-t-2xl">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
            {initiales(client.prenom, client.nom)}
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2 min-w-0">
              <Truncate>{client.prenom} {client.nom}</Truncate>
              {(client.vip || client.nb_sejours >= 3) && <Star size={14} className="text-yellow-500 fill-yellow-500 shrink-0" />}
            </h2>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full shrink-0">{client.statut}</span>
              <Truncate as="span" className="text-xs text-gray-400">{client.email}</Truncate>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors shrink-0" aria-label="Fermer">
          <X size={18} className="text-gray-500" />
        </button>
      </div>

      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded-xl p-4">
          {[
            ['Téléphone', client.telephone],
            ['Adresse', client.adresse],
            ['Ville', client.ville],
            ['Pays', client.pays || 'France'],
            ['Segment', client.segment],
            ['Canal', client.canal_acquisition]
          ].map(([label, val]) => (
            <div key={label} className="min-w-0">
              <p className="text-xs text-gray-500">{label}</p>
              <Truncate as="p" className="font-medium text-sm text-gray-900">{val || '—'}</Truncate>
            </div>
          ))}
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
              {client.allergies && <div className="min-w-0"><p className="text-xs text-gray-500">Allergies</p><Truncate as="p" className="text-sm text-gray-900">{client.allergies}</Truncate></div>}
              {client.regime_alimentaire && <div className="min-w-0"><p className="text-xs text-gray-500">Régime</p><Truncate as="p" className="text-sm text-gray-900">{client.regime_alimentaire}</Truncate></div>}
              {client.chambre_preferee && <div className="col-span-2 min-w-0"><p className="text-xs text-gray-500">Chambre préférée</p><Truncate as="p" className="text-sm text-gray-900">{client.chambre_preferee}</Truncate></div>}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
          <button onClick={() => { onClose(); onEdit(client); }} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors">
            Modifier
          </button>
          <button
            onClick={() => { navigator.clipboard?.writeText(client.email); toast.success('Email copié'); }}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
          >
            Copier l'email
          </button>
        </div>
      </div>
    </motion.div>
  </motion.div>
);

// ============================================================================
// STYLES EMBARQUÉS
// ============================================================================

const DashboardStyles: React.FC = () => (
  <style>{`
    .dashboard-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
    .dashboard-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .dashboard-scrollbar::-webkit-scrollbar-thumb { background: #d1fae5; border-radius: 999px; }
    .dashboard-scrollbar::-webkit-scrollbar-thumb:hover { background: #a7f3d0; }

    .skeleton-shimmer {
      background: linear-gradient(90deg, #f3f4f6 25%, #e9ecef 37%, #f3f4f6 63%);
      background-size: 400% 100%;
      animation: dashboard-shimmer 1.4s ease infinite;
    }
    @keyframes dashboard-shimmer {
      0% { background-position: 100% 50%; }
      100% { background-position: 0 50%; }
    }

    .stat-value {
      font-size: clamp(1.05rem, 1.1rem + 1vw, 1.6rem);
      line-height: 1.15;
      word-break: break-word;
    }

    .dashboard-hero {
      background: radial-gradient(120% 140% at 0% 0%, #ecfdf5 0%, #ffffff 55%, #ffffff 100%);
    }
    .dashboard-hero::before {
      content: '';
      position: absolute;
      top: -60px;
      right: -60px;
      width: 220px;
      height: 220px;
      background: radial-gradient(circle, rgba(16,185,129,0.14) 0%, rgba(16,185,129,0) 70%);
      border-radius: 9999px;
      pointer-events: none;
    }

    .dashboard-force-black, .dashboard-force-black * { color-scheme: light; }

    @media (prefers-reduced-motion: reduce) {
      .skeleton-shimmer { animation: none; }
    }
  `}</style>
);

// ============================================================================
// PAGE PRINCIPALE
// ============================================================================

export default function DashboardPage() {
  const navigate = useNavigate();
  const { isConnected, subscribe, refreshDashboard } = useWebSocketContext();

  const [clients, setClients] = useState<Client[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [chambres, setChambres] = useState<Chambre[]>([]);
  const [paiements, setPaiements] = useState<Paiement[]>([]);
  const [notifications, setNotifications] = useState<NotificationApi[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [commStats, setCommStats] = useState<CommunicationStats | null>(null);

  const [sectionLoading, setSectionLoading] = useState<SectionLoading>({
    clients: true, chambres: true, reservations: true, paiements: true, notifications: true, communication: true
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const isFetching = useRef(false);

  const setLoadingFlag = useCallback((key: keyof SectionLoading, value: boolean) => {
    setSectionLoading(prev => ({ ...prev, [key]: value }));
  }, []);

  // ── Chargement des données ────────────────────────────────────────────────────
  const fetchDashboardData = useCallback(async () => {
    if (isFetching.current) return;
    isFetching.current = true;
    setIsRefreshing(true);

    // 1. Charger les clients
    setLoadingFlag('clients', true);
    let clientsData: Client[] = [];
    try {
      const res = await clientService.getAll({ limit: 200 });
      const raw = (res as any)?.data ?? res ?? [];
      clientsData = (Array.isArray(raw) ? raw : []).map(normalizeClient);
      setClients(clientsData);
    } catch (e) {
      console.warn('[Dashboard] Erreur clients:', e);
      setClients([]);
    } finally {
      setLoadingFlag('clients', false);
    }

    // 2. Charger les chambres
    setLoadingFlag('chambres', true);
    let chambresData: Chambre[] = [];
    try {
      let rawChambres: any[] = [];
      try {
        const res = await chambreService.getAvecOccupation();
        const data = (res as any)?.data ?? res ?? {};
        rawChambres = data.chambres || [];
      } catch (e) {
        console.warn('[Dashboard] /chambres/avec-occupation indisponible, repli sur /chambres:', e);
        const fallback = await chambreService.getAll();
        rawChambres = (fallback as any)?.data ?? fallback ?? [];
      }
      chambresData = rawChambres.map(normalizeChambre);
      setChambres(chambresData);
    } catch (e) {
      console.warn('[Dashboard] Erreur chambres:', e);
      setChambres([]);
    } finally {
      setLoadingFlag('chambres', false);
    }

    // 3. Charger les paiements
    setLoadingFlag('paiements', true);
    let paiementsData: Paiement[] = [];
    try {
      const res = await paiementService.getAll();
      const raw = (res as any)?.data ?? res ?? [];
      paiementsData = (Array.isArray(raw) ? raw : []).map(normalizePaiement);
      setPaiements(paiementsData);
    } catch (e) {
      console.warn('[Dashboard] Erreur paiements:', e);
      setPaiements([]);
    } finally {
      setLoadingFlag('paiements', false);
    }

    // 4. Charger les notifications
    setLoadingFlag('notifications', true);
    try {
      const res = await notificationService.getAll(20);
      setNotifications(res?.data ?? []);
      setUnreadCount(res?.nonLues ?? 0);
    } catch (e) {
      console.warn('[Dashboard] Erreur notifications:', e);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoadingFlag('notifications', false);
    }

    // 5. Charger les stats de communication
    setLoadingFlag('communication', true);
    try {
      const res = await communicationService.getStats();
      setCommStats(res?.data ?? null);
    } catch (e) {
      console.warn('[Dashboard] Erreur stats communication:', e);
      setCommStats(null);
    } finally {
      setLoadingFlag('communication', false);
    }

    // 6. Charger les réservations (dépend des clients et chambres, inclut TOUT le détail)
    setLoadingFlag('reservations', true);
    try {
      const res = await reservationService.getAll({ include: ['client', 'chambre', 'paiements', 'services'] } as any);
      const raw = (res as any)?.data ?? res ?? [];
      const list = Array.isArray(raw) ? raw : [];

      const normalized = list.map((r: any) => {
        const clientId = r?.clientId ?? r?.client_id ?? r?.client?.id;
        const client = clientsData.find((c) => c.id === clientId)
          ?? (r?.client ? normalizeClient(r.client) : emptyClient({ nom: r?.client_nom || '', prenom: r?.client_prenom || '', email: r?.client_email || '', telephone: r?.client_telephone || '' }));

        const chambreId = r?.chambreId ?? r?.chambre_id ?? r?.chambre?.id;
        const chambre = chambresData.find((c) => c.id === chambreId)
          ?? (r?.chambre ? normalizeChambre(r.chambre) : emptyChambre({ numero: r?.chambre_numero || '', nom: r?.chambre_nom || 'Chambre' }));

        return normalizeReservation(r, client, chambre);
      });

      setReservations(normalized);
    } catch (e) {
      console.warn('[Dashboard] Erreur réservations:', e);
      setReservations([]);
    } finally {
      setLoadingFlag('reservations', false);
    }

    setIsRefreshing(false);
    isFetching.current = false;
  }, [setLoadingFlag]);

  // ── WebSocket (rafraîchissement silencieux — sans affichage de statut) ───────
  useEffect(() => {
    if (isConnected && subscribe) {
      subscribe('dashboard');
      subscribe('reservations');
      subscribe('chambres');
      subscribe('paiements');
      subscribe('notifications');
    }

    const handleRefresh = () => fetchDashboardData();

    const events = ['refresh-dashboard', 'chambre-updated', 'reservation-created', 'reservation-updated', 'reservation-cancelled', 'notification-created'];
    events.forEach(evt => window.addEventListener(evt, handleRefresh));
    return () => events.forEach(evt => window.removeEventListener(evt, handleRefresh));
  }, [subscribe, isConnected, fetchDashboardData]);

  // ── Chargement initial + polling de secours ─────────────────────────────────
  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => {
      if (!isConnected) fetchDashboardData();
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchDashboardData, isConnected]);

  // ── Indicateurs calculés ─────────────────────────────────────────────────────
  const activeReservations = useMemo(() => reservations.filter(r => r.statut !== 'ANNULEE'), [reservations]);
  const totalReservations = activeReservations.length;
  const totalRevenue = useMemo(() => activeReservations.reduce((sum, r) => sum + (r.montantTotal || 0), 0), [activeReservations]);
  const occupiedCount = chambres.filter(c => c.estOccupeeActuellement).length;
  const occupancyRate = chambres.length > 0 ? (occupiedCount / chambres.length) * 100 : 0;
  const avgNights = totalReservations > 0 ? activeReservations.reduce((sum, r) => sum + (r.nbNuits || 0), 0) / totalReservations : 0;

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const handleViewReservation = useCallback((id: number) => navigate(`/reservations/${id}`), [navigate]);
  const handleEditClient = useCallback((client: Client) => navigate(`/clients?edit=${client.id}`), [navigate]);
  const handleGoToCommunication = useCallback(() => navigate('/communication'), [navigate]);
  const handleClientClick = useCallback((client: Client) => { if (client.id) setSelectedClient(client); }, []);

  const handleMarkAllRead = useCallback(async () => {
    try {
      await notificationService.marquerToutesLues();
      setNotifications(prev => prev.map(n => ({ ...n, lu: true })));
      setUnreadCount(0);
      toast.success('Notifications marquées comme lues');
    } catch (e) {
      console.warn('[Dashboard] Erreur marquage notifications:', e);
      toast.error('Impossible de mettre à jour les notifications');
    }
  }, []);

  const handleRefresh = useCallback(() => {
    fetchDashboardData();
    if (isConnected && refreshDashboard) refreshDashboard();
    toast.success('Données rafraîchies');
  }, [fetchDashboardData, isConnected, refreshDashboard]);

  const isInitialLoading = sectionLoading.chambres && sectionLoading.reservations && chambres.length === 0 && reservations.length === 0;

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <DashboardStyles />
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full" />
          <p className="text-gray-900 font-medium">Chargement du tableau de bord...</p>
          <p className="text-gray-400 text-sm">Les Palmiers de l'Entre-Deux</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
      <DashboardStyles />
      <div className="dashboard-force-black">
        {/* En-tête */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="dashboard-hero relative overflow-hidden flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 gap-4 rounded-3xl border border-emerald-100/70 shadow-sm px-5 py-5 lg:px-7 lg:py-6"
        >
          <div className="relative flex items-center gap-3 min-w-0">
            <motion.span animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }} className="text-3xl shrink-0">
              🌴
            </motion.span>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Tableau de bord</h1>
              <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5 flex-wrap">
                <span className="whitespace-nowrap">Les Palmiers de l'Entre-Deux</span>
                {unreadCount > 0 && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-gray-300 shrink-0" />
                    <span className="flex items-center gap-1 text-amber-600 text-xs whitespace-nowrap bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                      <Bell size={11} /> {unreadCount} notification{unreadCount > 1 ? 's' : ''}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRefresh}
            className="relative flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-emerald-200 hover:text-emerald-700 transition-colors shrink-0 shadow-sm"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            Rafraîchir
          </motion.button>
        </motion.div>

        {/* Cartes KPI */}
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Taux d'occupation"
            value={`${occupancyRate.toFixed(1)}%`}
            icon={<TrendingUp size={20} />}
            color="emerald"
            subtitle={`${chambres.filter(c => !c.estOccupeeActuellement).length} chambre${chambres.filter(c => !c.estOccupeeActuellement).length !== 1 ? 's' : ''} disponible${chambres.filter(c => !c.estOccupeeActuellement).length !== 1 ? 's' : ''}`}
          />
          <StatCard label="Chiffre d'affaires" value={totalRevenue} isNumeric suffix="€" icon={<Euro size={20} />} color="amber" />
          <StatCard label="Durée moyenne" value={`${avgNights.toFixed(1)} nuits`} icon={<CalendarCheck size={20} />} color="blue" />
          <StatCard label="Réservations" value={totalReservations} isNumeric icon={<Calendar size={20} />} color="purple" subtitle="Hors annulations" />
        </motion.div>

        {/* Arrivées/Départs + Chambres */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <ArrivalsDeparturesSection reservations={reservations} loading={sectionLoading.reservations} onClientClick={handleClientClick} />
          </div>
          <div><RoomOccupancySection chambres={chambres} loading={sectionLoading.chambres} /></div>
        </div>

        {/* Graphiques */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <OccupancyChart />
          <RevenueChart />
        </div>

        {/* Clients / Acquisition / Paiements */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <ClientStatsSection clients={clients} loading={sectionLoading.clients} />
          <AcquisitionChart clients={clients} />
          <PaiementsSection paiements={paiements} reservations={reservations} loading={sectionLoading.paiements || sectionLoading.reservations} />
        </div>

        {/* Répartition revenus / Services actifs / Prochains jours */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <RevenueDistributionSection reservations={reservations} loading={sectionLoading.reservations} />
          <ActiveServicesSection reservations={reservations} loading={sectionLoading.reservations} />
          <UpcomingWeekSection reservations={reservations} loading={sectionLoading.reservations} onView={handleViewReservation} />
        </div>

        {/* Notifications / Communication */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <NotificationsSection notifications={notifications} unreadCount={unreadCount} loading={sectionLoading.notifications} onMarkAllRead={handleMarkAllRead} />
          <CommunicationSection stats={commStats} loading={sectionLoading.communication} onGoTo={handleGoToCommunication} />
        </div>

        {/* Réservations récentes */}
        <RecentReservationsSection reservations={reservations} loading={sectionLoading.reservations} onView={handleViewReservation} onClientClick={handleClientClick} />

        {/* Pied de page */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-8 text-center text-xs text-gray-400 border-t border-gray-200 pt-6">
          <p>© 2026 Les Palmiers de l'Entre-Deux.</p>
        </motion.div>

        {/* Overlay détail client */}
        <AnimatePresence>
          {selectedClient && (
            <ClientDetailOverlay client={selectedClient} onClose={() => setSelectedClient(null)} onEdit={handleEditClient} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}