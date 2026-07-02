// frontend/src/pages/ChambresPage.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { Modal } from '../components/ui';
import { formatEuro } from '../utils/helpers';
import {
  BedDouble, Plus, Edit2, Ban, CheckCircle, Wifi, Wind,
  Accessibility, Coffee, Search, X, Calendar,
  Users, Maximize2, Eye, MapPin, Settings,
  Filter, AlertTriangle, Lock,
  Trash2, Copy, Save, Percent, Grid3x3, List,
  ChevronDown, DollarSign,
  History, Building2, Loader2,
  Sparkles, RefreshCw, MoreVertical, TrendingUp, TrendingDown,
  Clock, Sun, Cloud, Snowflake, Home, Key, Shield,
  ArrowRight, Star, Award, Crown,
  Tv, Gift, Tag, Zap, Rocket, Gem, BadgeCheck,
  Layers, BarChart3, PieChart, Activity
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

type StatutChambre = 'DISPONIBLE' | 'OCCUPEE' | 'EN_MAINTENANCE' | 'HORS_SERVICE' | 'BLOQUEE';
type StatutAffichage = StatutChambre | 'OCCUPEE';
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

interface BlocageLight {
  id: number;
  dateDebut: string;
  dateFin: string;
  motif: string;
  type: string;
}

interface PromoCode {
  id: number;
  code: string;
  description?: string;
  tauxReduction: number;
  reductionFixe?: number;
  dateDebut: string;
  dateFin: string;
  actif: boolean;
  nbUtilisationsMax?: number;
  nbUtilisations: number;
  created_at: string;
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
  statut: StatutChambre;
  equipements: string[];
  tarif_base: number;
  tarif_weekend: number;
  tarif_enfant: number;
  tarif_lit_supp: number;
  tarif_petit_dejeuner: number;
  tarifs_complets: {
    BASSE?: { prixBase: number; prixWeekend: number; prixEnfant: number; prixLitSupplementaire: number; prixPetitDejeuner: number; coeffWeekend: number; coeffDegressif: number };
    MOYENNE?: { prixBase: number; prixWeekend: number; prixEnfant: number; prixLitSupplementaire: number; prixPetitDejeuner: number; coeffWeekend: number; coeffDegressif: number };
    HAUTE?: { prixBase: number; prixWeekend: number; prixEnfant: number; prixLitSupplementaire: number; prixPetitDejeuner: number; coeffWeekend: number; coeffDegressif: number };
  };
  saison_actuelle: 'BASSE' | 'MOYENNE' | 'HAUTE';
  description?: string;
  image?: string;
  createdAt: string;
  updatedAt: string;
  version?: number;
  estOccupeeActuellement?: boolean;
  occupationActuelle?: {
    reservationId: number;
    clientNom: string;
    dateArrivee: string;
    dateDepart: string;
    joursRestants: number;
    codePromo?: string;
    reduction?: number;
  } | null;
  prochaineReservation?: {
    id: number;
    clientNom: string;
    dateArrivee: string;
    dateDepart: string;
    nbNuits: number;
    codePromo?: string;
    reduction?: number;
  } | null;
  reservationsActuelles?: ReservationLight[];
  blocagesActifs?: BlocageLight[];
  tauxOccupationMois?: number;
  revenuMois?: number;
  codesPromoActifs?: PromoCode[];
}

interface ChambresResponse {
  chambres: Chambre[];
  reservationsActuelles: ReservationLight[];
  statistiques: {
    total: number;
    disponibles: number;
    occupees: number;
    maintenance: number;
    bloques: number;
    tauxOccupationGlobal: number;
    revenusMois: number;
  };
  codesPromoActifs?: PromoCode[];
}

// ============================================
// CONSTANTES
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

const STATUTS_MODIFIABLES: StatutChambre[] = ['DISPONIBLE', 'EN_MAINTENANCE', 'HORS_SERVICE', 'BLOQUEE'];

const VUE_CONFIG: Record<VueChambre, { label: string; emoji: string; color: string }> = {
  JARDIN:   { label: 'Jardin',   emoji: '🌿', color: 'text-emerald-500' },
  PISCINE:  { label: 'Piscine',  emoji: '🏊', color: 'text-blue-500' },
  MONTAGNE: { label: 'Montagne', emoji: '⛰️', color: 'text-slate-500' },
};

const SAISON_CONFIG: Record<string, { label: string; emoji: string; classes: string; icon: React.ReactNode }> = {
  BASSE:   { label: 'Basse saison',   emoji: '❄️', classes: 'bg-sky-50 text-sky-700 border-sky-200', icon: <Snowflake size={12} className="text-sky-500" /> },
  MOYENNE: { label: 'Moyenne saison', emoji: '🌤️', classes: 'bg-teal-50 text-teal-700 border-teal-200', icon: <Cloud size={12} className="text-teal-500" /> },
  HAUTE:   { label: 'Haute saison',   emoji: '☀️', classes: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Sun size={12} className="text-amber-500" /> },
};

const EQUIPEMENTS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  climatisation:       { label: 'Clim',          icon: <Wind size={12} />, color: 'text-sky-500' },
  ventilateur:         { label: 'Ventilateur',   icon: <Wind size={12} />, color: 'text-gray-400' },
  'sèche-cheveux':     { label: 'Sèche-cheveux', icon: <Sparkles size={12} />, color: 'text-purple-400' },
  bouilloire:          { label: 'Bouilloire',    icon: <Coffee size={12} />, color: 'text-amber-500' },
  'mini-réfrigérateur':{ label: 'Frigo',         icon: <Coffee size={12} />, color: 'text-blue-400' },
  wifi:                { label: 'WiFi',          icon: <Wifi size={12} />, color: 'text-indigo-500' },
  tv:                  { label: 'TV',            icon: <Tv size={12} />, color: 'text-gray-500' },
};

// ============================================
// HELPERS
// ============================================

function estChambreDisponible(
  chambre: Chambre,
  dateArrivee: Date,
  dateDepart: Date,
  reservationsExistantes: ReservationLight[] = [],
  blocagesExistants: BlocageLight[] = []
): boolean {
  if (chambre.statut === 'HORS_SERVICE' || chambre.statut === 'BLOQUEE') return false;
  for (const resa of reservationsExistantes) {
    if (resa.chambreId !== chambre.id) continue;
    if (resa.statut !== 'CONFIRMEE' && resa.statut !== 'EN_ATTENTE_ACOMPTE') continue;
    if (dateArrivee < new Date(resa.dateDepart) && new Date(resa.dateArrivee) < dateDepart) return false;
  }
  for (const blocage of blocagesExistants) {
    if (dateArrivee < new Date(blocage.dateFin) && new Date(blocage.dateDebut) < dateDepart) return false;
  }
  return true;
}

function estChambreOccupeeActuellement(chambre: Chambre, reservations: ReservationLight[] = []): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return reservations.some(r => {
    if (r.chambreId !== chambre.id) return false;
    if (r.statut !== 'CONFIRMEE') return false;
    const dateDepart = new Date(r.dateDepart);
    dateDepart.setHours(23, 59, 59, 999);
    return dateDepart >= today;
  });
}

function getStatutAffichage(chambre: Chambre, reservations: ReservationLight[] = []): StatutAffichage {
  if (chambre.statut === 'EN_MAINTENANCE') return 'EN_MAINTENANCE';
  if (chambre.statut === 'HORS_SERVICE')   return 'HORS_SERVICE';
  if (chambre.statut === 'BLOQUEE')        return 'BLOQUEE';
  if (estChambreOccupeeActuellement(chambre, reservations)) return 'OCCUPEE';
  return 'DISPONIBLE';
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function fmtDateFull(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getJoursRestants(dateDepart: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const depart = new Date(dateDepart);
  depart.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((depart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

function formatReduction(promo: { tauxReduction?: number; reductionFixe?: number }): string {
  if (promo.tauxReduction) return `${promo.tauxReduction}%`;
  if (promo.reductionFixe) return `${formatEuro(promo.reductionFixe)}`;
  return '';
}

// ============================================
// CACHE
// ============================================

const CACHE_KEY = 'chambres_cache';
const CACHE_TTL = 30_000;

interface CacheData {
  chambres: Chambre[];
  reservationsActuelles: ReservationLight[];
  statistiques: ChambresResponse['statistiques'];
  codesPromoActifs?: PromoCode[];
  timestamp: number;
}

function getCache(): CacheData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data: CacheData = JSON.parse(raw);
    if (Date.now() - data.timestamp > CACHE_TTL) { localStorage.removeItem(CACHE_KEY); return null; }
    return data;
  } catch { return null; }
}
function setCache(chambres: Chambre[], reservationsActuelles: ReservationLight[], statistiques: ChambresResponse['statistiques'], codesPromoActifs?: PromoCode[]) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ chambres, reservationsActuelles, statistiques, codesPromoActifs, timestamp: Date.now() })); } catch { /* ignore */ }
}
function clearCache() { localStorage.removeItem(CACHE_KEY); }

// ============================================
// SKELETON
// ============================================

const SkeletonCard = () => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse space-y-4">
    <div className="h-40 bg-gray-100 rounded-xl" />
    <div className="space-y-2">
      <div className="h-4 bg-gray-100 rounded w-2/3" />
      <div className="h-3 bg-gray-100 rounded w-1/2" />
    </div>
    <div className="flex gap-2">
      <div className="h-7 bg-gray-100 rounded-full w-20" />
      <div className="h-7 bg-gray-100 rounded-full w-16" />
    </div>
    <div className="flex gap-2 pt-2 border-t border-gray-50">
      <div className="h-8 bg-gray-100 rounded-lg flex-1" />
      <div className="h-8 bg-gray-100 rounded-lg w-10" />
    </div>
  </div>
);

// ============================================
// STAT CARD
// ============================================

const StatCard = ({ value, label, color, icon: Icon, subtitle }: {
  value: number | string; label: string; color: string; icon: React.ElementType; subtitle?: string;
}) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color} shadow-sm group-hover:scale-105 transition-transform duration-200`}>
      <Icon size={18} className="text-white" />
    </div>
    <div>
      <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
      {subtitle && <p className="text-[10px] text-gray-300 mt-0.5">{subtitle}</p>}
    </div>
  </div>
);

// ============================================
// STATUS BADGE
// ============================================

const StatusBadge = ({ statut, animated = false }: { statut: StatutAffichage; animated?: boolean }) => {
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
// CHAMBRE CARD - Avec icône Settings et menu amélioré
// ============================================

const ChambreCard = ({
  chambre, reservationsActuelles = [],
  onView, onToggleStatut, onBlock, onEdit, onDelete, onCopy, onManageTarifs, onHistorique,
  onApplyPromo, onViewPromos
}: {
  chambre: Chambre;
  reservationsActuelles?: ReservationLight[];
  onView: (c: Chambre) => void;
  onToggleStatut: (c: Chambre, s: StatutChambre) => void;
  onBlock: (c: Chambre) => void;
  onEdit: (c: Chambre) => void;
  onDelete: (c: Chambre) => void;
  onCopy: (c: Chambre) => void;
  onManageTarifs: (c: Chambre) => void;
  onHistorique: (c: Chambre) => void;
  onApplyPromo?: (c: Chambre) => void;
  onViewPromos?: (c: Chambre) => void;
}) => {
  const statut = getStatutAffichage(chambre, reservationsActuelles);
  const [menuOpen, setMenuOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const estOccupee = statut === 'OCCUPEE';
  const statutCfg = STATUT_CONFIG[statut];

  const reservationEnCours = reservationsActuelles.find(r => {
    if (r.chambreId !== chambre.id) return false;
    return r.statut === 'CONFIRMEE';
  });

  const joursRestants = reservationEnCours ? getJoursRestants(reservationEnCours.dateDepart) : 0;
  const vue = VUE_CONFIG[chambre.vue];
  const saison = SAISON_CONFIG[chambre.saison_actuelle] ?? SAISON_CONFIG.MOYENNE;

  const getTarifSaison = () => {
    const saisonKey = chambre.saison_actuelle || 'MOYENNE';
    const tarifsSaison = chambre.tarifs_complets?.[saisonKey as keyof typeof chambre.tarifs_complets];
    if (tarifsSaison) {
      return tarifsSaison.prixBase || chambre.tarif_base;
    }
    return chambre.tarif_base;
  };

  const tarifActuel = getTarifSaison();
  const hasActivePromo = chambre.codesPromoActifs && chambre.codesPromoActifs.length > 0;

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setMenuOpen(false); setStatusOpen(false);
      }
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { setMenuOpen(false); setStatusOpen(false); } };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, []);

  return (
    <div
      ref={cardRef}
      className={`group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-visible relative ${menuOpen || statusOpen ? 'z-30' : 'z-0'}`}
    >
      {/* Image / Illustration avec gradient dynamique selon statut */}
      <div className={`relative h-44 rounded-t-2xl overflow-hidden bg-gradient-to-br ${statutCfg.bgGradient} flex items-center justify-center`}>
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_50%,_rgba(13,148,136,0.1)_0%,_transparent_70%)]" />
        
        <div className="relative z-10 flex flex-col items-center">
          <BedDouble size={48} className={`${statut === 'OCCUPEE' ? 'text-blue-300' : statut === 'DISPONIBLE' ? 'text-emerald-300' : 'text-gray-300'} transition-transform duration-300 group-hover:scale-105`} />
          {reservationEnCours && (
            <span className="mt-1 text-[10px] font-medium text-blue-600 bg-white/80 px-2 py-0.5 rounded-full border border-blue-100">
              {joursRestants} jour{joursRestants > 1 ? 's' : ''} restant{joursRestants > 1 ? 's' : ''}
            </span>
          )}
          {hasActivePromo && (
            <span className="mt-1 text-[10px] font-medium text-amber-600 bg-amber-50/90 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
              <Gift size={10} /> Promo active
            </span>
          )}
        </div>

        {/* Status badge */}
        <div className="absolute top-3 right-3 z-10">
          <StatusBadge statut={statut} animated={estOccupee} />
        </div>

        {/* Vue tag */}
        <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1 z-10">
          <span className={vue.color}>{vue.emoji}</span> {vue.label}
        </div>

        {/* PMR */}
        {chambre.accessiblePMR && (
          <div className="absolute top-3 left-3 bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 z-10">
            <Accessibility size={10} /> PMR
          </div>
        )}

        {/* Saison tag */}
        <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm text-xs px-2 py-0.5 rounded-full border border-gray-200 flex items-center gap-1 z-10">
          {saison.icon}
          <span className="text-gray-600">{saison.emoji}</span>
        </div>

        {/* Occupation banner */}
        {reservationEnCours && (
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-blue-600/95 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1.5 z-10 shadow-lg whitespace-nowrap">
            <Users size={10} />
            {reservationEnCours.client_prenom} {reservationEnCours.client_nom}
            <span className="opacity-60">·</span>
            {fmtDate(reservationEnCours.dateArrivee)} → {fmtDate(reservationEnCours.dateDepart)}
            {reservationEnCours.codePromo && (
              <span className="bg-amber-400/30 px-1.5 py-0.5 rounded-full text-[9px] flex items-center gap-0.5">
                <Tag size={8} /> -{reservationEnCours.reduction}%
              </span>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">

        {/* Titre + meta */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-gray-900 text-base leading-tight flex items-center gap-2">
              {chambre.nom}
              {chambre.estOccupeeActuellement && (
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              )}
            </h3>
            <span className="text-xs font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md shrink-0">#{chambre.numero}</span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
            <span className="flex items-center gap-1"><Users size={11} /> {chambre.capaciteAdultes} pers.</span>
            {chambre.surfaceM2 > 0 && <span className="flex items-center gap-1"><Maximize2 size={11} /> {chambre.surfaceM2} m²</span>}
            <span className={`px-2 py-0.5 rounded-full border text-[10px] font-medium ${saison.classes} flex items-center gap-1`}>
              {saison.icon} {saison.label}
            </span>
          </div>
        </div>

        {/* Équipements */}
        {chambre.equipements?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {chambre.equipements.slice(0, 5).map(eq => {
              const cfg = EQUIPEMENTS[eq];
              return cfg ? (
                <span key={eq} className={`inline-flex items-center gap-1 text-[10px] ${cfg.color} bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100`}>
                  {cfg.icon} {cfg.label}
                </span>
              ) : null;
            })}
            {chambre.equipements.length > 5 && (
              <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
                +{chambre.equipements.length - 5}
              </span>
            )}
          </div>
        )}

        {/* Tarif avec saison */}
        <div className="bg-gradient-to-r from-palmier-50 to-sable-50 rounded-xl px-3 py-2.5 flex items-center justify-between border border-palmier-100/50">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Tarif / nuit</p>
              {chambre.saison_actuelle && (
                <span className="text-[9px] text-palmier-500 bg-palmier-100 px-1.5 py-0.5 rounded-full">
                  {chambre.saison_actuelle}
                </span>
              )}
            </div>
            <div className="flex items-end gap-1.5">
              <p className="text-xl font-bold text-palmier-700 leading-none">{formatEuro(tarifActuel)}</p>
              <p className="text-[10px] text-gray-400 leading-none mb-0.5">/ nuit</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {hasActivePromo && (
              <div className="text-right border-r border-palmier-200/50 pr-3">
                <p className="text-[10px] text-amber-600 uppercase tracking-wide flex items-center gap-1">
                  <Gift size={10} /> Promo
                </p>
                <p className="text-sm font-semibold text-amber-600">-{chambre.codesPromoActifs?.[0]?.tauxReduction || 0}%</p>
              </div>
            )}
            {chambre.tarif_weekend > 0 && (
              <div className="text-right">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Weekend</p>
                <p className="text-sm font-semibold text-palmier-600">{formatEuro(chambre.tarif_weekend)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions - Menu avec icône Settings au lieu de MoreVertical */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onView(chambre)}
            className="flex-1 py-2 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-100 transition-all duration-200 hover:border-gray-200 flex items-center justify-center gap-1.5 group-hover:scale-[1.02]"
          >
            <Eye size={13} /> Détails
          </button>

          {/* Menu contextuel avec icône Settings */}
          <div className="relative">
            <button
              onClick={() => { setMenuOpen(v => !v); setStatusOpen(false); }}
              className="p-2 text-gray-400 hover:text-palmier-600 hover:bg-palmier-50 rounded-xl border border-gray-100 transition-all duration-200 hover:border-palmier-200 hover:shadow-sm"
              title="Paramètres de la chambre"
            >
              <Settings size={16} className="transition-transform duration-300 group-hover:rotate-45" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 bottom-full mb-2 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-20 w-64 text-sm animate-fadeInDown">
                {/* En-tête du menu */}
                <div className="px-3 py-2 border-b border-gray-100 bg-gradient-to-r from-palmier-50 to-transparent rounded-t-xl">
                  <p className="text-xs font-semibold text-palmier-700 flex items-center gap-2">
                    <Settings size={12} className="text-palmier-500" />
                    Gestion de {chambre.nom}
                  </p>
                </div>

                <MenuItem icon={<Eye size={13} />} label="Voir détails" onClick={() => { onView(chambre); setMenuOpen(false); }} />
                <MenuItem icon={<Edit2 size={13} />} label="Modifier la chambre" onClick={() => { onEdit(chambre); setMenuOpen(false); }} />
                <MenuItem icon={<Calendar size={13} />} label="Bloquer des dates" onClick={() => { onBlock(chambre); setMenuOpen(false); }} />
                <MenuItem icon={<DollarSign size={13} />} label="Gérer les tarifs" onClick={() => { onManageTarifs(chambre); setMenuOpen(false); }} />
                
                {/* Séparateur avec promo */}
                <div className="border-t border-gray-100 my-1">
                  <div className="px-2 py-1">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider px-2 py-0.5">Promotions</p>
                  </div>
                  <MenuItem 
                    icon={<Gift size={13} className="text-amber-500" />} 
                    label="Appliquer un code promo" 
                    onClick={() => { if (onApplyPromo) onApplyPromo(chambre); setMenuOpen(false); }} 
                    highlight 
                  />
                  <MenuItem 
                    icon={<Tag size={13} className="text-purple-500" />} 
                    label="Voir les promos actives" 
                    onClick={() => { if (onViewPromos) onViewPromos(chambre); setMenuOpen(false); }} 
                  />
                </div>

                <MenuItem icon={<History size={13} />} label="Historique" onClick={() => { onHistorique(chambre); setMenuOpen(false); }} />
                <MenuItem icon={<Copy size={13} />} label="Dupliquer" onClick={() => { onCopy(chambre); setMenuOpen(false); }} />

                {/* Sous-menu statut */}
                <div className="px-2 py-1 border-t border-gray-100">
                  <button
                    onClick={() => setStatusOpen(v => !v)}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <span className="flex items-center gap-2"><Activity size={13} /> Changer le statut</span>
                    <ChevronDown size={12} className={`transition-transform duration-200 ${statusOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {statusOpen && (
                    <div className="mt-1 space-y-0.5 animate-slideDown">
                      {STATUTS_MODIFIABLES.map(s => {
                        const cfg = STATUT_CONFIG[s];
                        const isActive = s === chambre.statut;
                        return (
                          <button
                            key={s}
                            onClick={() => {
                              if (estOccupee && s === 'DISPONIBLE') {
                                toast.error('Impossible de marquer disponible une chambre occupée');
                                return;
                              }
                              onToggleStatut(chambre, s);
                              setMenuOpen(false); setStatusOpen(false);
                            }}
                            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                              isActive ? `${cfg.badge} font-semibold` : 'text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                            {isActive && <CheckCircle size={10} className="ml-auto" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-100 mt-1 pt-1">
                  <MenuItem
                    icon={<Trash2 size={13} />}
                    label="Supprimer"
                    onClick={() => { onDelete(chambre); setMenuOpen(false); }}
                    danger
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const MenuItem = ({ icon, label, onClick, danger = false, highlight = false }: {
  icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean; highlight?: boolean;
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-all duration-150 ${
      danger ? 'text-red-500 hover:bg-red-50' : 
      highlight ? 'text-amber-700 hover:bg-amber-50 bg-amber-50/30' :
      'text-gray-600 hover:bg-gray-50'
    }`}
  >
    {icon} {label}
  </button>
);

// ============================================
// MODAL DÉTAIL
// ============================================

const ChambreDetailModal = ({
  chambre, isOpen, onClose, onToggleStatut, onBlock, onEdit, reservationsActuelles = []
}: {
  chambre: Chambre | null; isOpen: boolean; onClose: () => void;
  onToggleStatut: (c: Chambre, s: StatutChambre) => void;
  onBlock: (c: Chambre) => void; onEdit: (c: Chambre) => void;
  reservationsActuelles?: ReservationLight[];
}) => {
  if (!chambre) return null;
  const statut = getStatutAffichage(chambre, reservationsActuelles);
  const cfg = STATUT_CONFIG[statut];
  const estOccupee = statut === 'OCCUPEE';
  const vue = VUE_CONFIG[chambre.vue];
  const saison = SAISON_CONFIG[chambre.saison_actuelle] ?? SAISON_CONFIG.MOYENNE;

  const reservationEnCours = reservationsActuelles.find(r => {
    const now = new Date();
    return now >= new Date(r.dateArrivee) && now < new Date(r.dateDepart)
      && r.statut === 'CONFIRMEE';
  });

  const getTarifSaison = () => {
    const saisonKey = chambre.saison_actuelle || 'MOYENNE';
    const tarifsSaison = chambre.tarifs_complets?.[saisonKey as keyof typeof chambre.tarifs_complets];
    if (tarifsSaison) {
      return tarifsSaison.prixBase || chambre.tarif_base;
    }
    return chambre.tarif_base;
  };

  const hasActivePromo = chambre.codesPromoActifs && chambre.codesPromoActifs.length > 0;

  return (
    <Modal
      isOpen={isOpen} onClose={onClose} title={chambre.nom} size="lg"
      footer={
        <div className="flex gap-2 justify-end flex-wrap">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-xl border border-gray-200 transition-colors">Fermer</button>
          <button onClick={() => { onEdit(chambre); onClose(); }} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-1.5 transition-colors"><Edit2 size={14} /> Modifier</button>
          <button onClick={() => { onBlock(chambre); onClose(); }} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-1.5 transition-colors"><Calendar size={14} /> Bloquer</button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Header card */}
        <div className={`bg-gradient-to-br ${cfg.bgGradient} rounded-xl p-4 flex items-center gap-4 border border-gray-100`}>
          <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-sm">
            <BedDouble size={28} className="text-palmier-500" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs bg-white text-gray-500 px-2 py-0.5 rounded-md">{chambre.numero}</span>
              <StatusBadge statut={statut} />
              <span className={`px-2 py-0.5 rounded-full border text-[10px] font-medium ${saison.classes} flex items-center gap-1`}>
                {saison.icon} {saison.label}
              </span>
              {hasActivePromo && (
                <span className="px-2 py-0.5 rounded-full border text-[10px] font-medium bg-amber-50 border-amber-200 text-amber-700 flex items-center gap-1">
                  <Gift size={10} /> Promo
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">{vue.emoji} Vue {vue.label} · {chambre.capaciteAdultes} personnes · {chambre.surfaceM2} m²</p>
            {reservationEnCours && (
              <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                <Users size={12} /> Occupé par {reservationEnCours.client_prenom} {reservationEnCours.client_nom} jusqu'au {fmtDateFull(reservationEnCours.dateDepart)}
                {reservationEnCours.codePromo && (
                  <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full text-[10px] flex items-center gap-1">
                    <Tag size={10} /> -{reservationEnCours.reduction}%
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Grille infos */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Lits doubles', value: chambre.nbLitsDoubles || 0 },
            { label: 'Lits simples', value: chambre.nbLitsSimples || 0 },
            { label: 'Lits bébé',    value: chambre.nbLitsBebe || 0 },
            { label: 'Accessibilité', value: chambre.accessiblePMR ? '✅ PMR' : '—' },
          ].map(item => (
            <div key={item.label} className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">{item.label}</p>
              <p className="text-sm font-semibold text-gray-800 mt-0.5">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Promotions actives */}
        {hasActivePromo && (
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-200">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2 flex items-center gap-2">
              <Gift size={12} /> Promotions actives
            </p>
            <div className="space-y-2">
              {chambre.codesPromoActifs?.map((promo: PromoCode) => (
                <div key={promo.id} className="flex justify-between items-center bg-white rounded-lg px-3 py-2 border border-amber-100">
                  <div className="flex items-center gap-2">
                    <Tag size={14} className="text-amber-500" />
                    <span className="font-mono font-bold text-amber-700">{promo.code}</span>
                    <span className="text-xs text-gray-500">{promo.description}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-amber-700">
                      {promo.tauxReduction ? `-${promo.tauxReduction}%` : promo.reductionFixe ? `-${formatEuro(promo.reductionFixe)}` : ''}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {promo.nbUtilisations}/{promo.nbUtilisationsMax || '∞'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Réservations en cours */}
        {reservationsActuelles.filter(r => r.chambreId === chambre.id && r.statut === 'CONFIRMEE').length > 0 && (
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2 flex items-center gap-2">
              <Calendar size={12} /> Réservations actives
            </p>
            <div className="space-y-2 max-h-36 overflow-y-auto">
              {reservationsActuelles.filter(r => r.chambreId === chambre.id && r.statut === 'CONFIRMEE').map(r => (
                <div key={r.id} className="flex justify-between items-center text-sm bg-white rounded-lg px-3 py-2 border border-blue-100">
                  <span className="text-blue-800">
                    {fmtDate(r.dateArrivee)} → {fmtDate(r.dateDepart)}
                    {r.client_prenom && r.client_nom && <span className="text-blue-600 ml-1">· {r.client_prenom} {r.client_nom}</span>}
                    {r.codePromo && (
                      <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                        <Tag size={10} /> -{r.reduction}%
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700">
                    Confirmée
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Équipements */}
        {chambre.equipements?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Équipements</p>
            <div className="flex flex-wrap gap-2">
              {chambre.equipements.map(eq => {
                const cfg = EQUIPEMENTS[eq];
                return cfg ? (
                  <span key={eq} className={`inline-flex items-center gap-1.5 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-full text-xs ${cfg.color}`}>
                    {cfg.icon} {cfg.label}
                  </span>
                ) : <span key={eq} className="text-xs text-gray-500 border border-gray-100 px-3 py-1.5 rounded-full">{eq}</span>;
              })}
            </div>
          </div>
        )}

        {chambre.description && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Description</p>
            <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-3 border border-gray-100">{chambre.description}</p>
          </div>
        )}

        {/* Tarifs */}
        <div className="bg-gradient-to-r from-palmier-50 to-sable-50 rounded-xl p-4 border border-palmier-100">
          <div className="flex items-center gap-2 mb-3">
            <p className="text-xs font-semibold text-palmier-700 uppercase tracking-wide">Tarifs</p>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${saison.classes} flex items-center gap-1`}>
              {saison.icon} {saison.label}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Base / nuit',    value: getTarifSaison() },
              { label: 'Weekend',        value: chambre.tarif_weekend },
              { label: 'Enfant -12 ans', value: chambre.tarif_enfant },
              { label: 'Lit supp.',      value: chambre.tarif_lit_supp },
            ].map(t => (
              <div key={t.label} className="bg-white/80 rounded-lg px-3 py-2 border border-palmier-100/50">
                <p className="text-[10px] text-palmier-600 uppercase tracking-wide">{t.label}</p>
                <p className="text-lg font-bold text-palmier-800">{formatEuro(t.value)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};

// ============================================
// MODAL FORMULAIRE
// ============================================

const ChambreFormModal = ({ chambre, isOpen, onClose, onSave, saving }: {
  chambre?: Chambre | null; isOpen: boolean; onClose: () => void;
  onSave: (data: any) => Promise<void>; saving: boolean;
}) => {
  const defaults = {
    numero: '', nom: '', capaciteAdultes: '2', nbLitsSimples: '0', nbLitsDoubles: '1',
    nbLitsBebe: '0', surfaceM2: '18', vue: 'JARDIN', accessiblePMR: false,
    tarif_base: '85', tarif_weekend: '95', tarif_enfant: '0', tarif_lit_supp: '0', description: ''
  };
  const [form, setForm] = useState<any>(defaults);
  const [selectedEq, setSelectedEq] = useState<string[]>([]);

  useEffect(() => {
    if (chambre) {
      setForm({ ...defaults, ...Object.fromEntries(Object.entries(chambre).map(([k, v]) => [k, String(v ?? '')])), accessiblePMR: chambre.accessiblePMR });
      setSelectedEq(chambre.equipements || []);
    } else {
      setForm(defaults); setSelectedEq([]);
    }
  }, [chambre, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      numero: form.numero, nom: form.nom,
      capaciteAdultes: +form.capaciteAdultes, nbLitsSimples: +form.nbLitsSimples,
      nbLitsDoubles: +form.nbLitsDoubles, nbLitsBebe: +form.nbLitsBebe,
      surfaceM2: +form.surfaceM2, vue: form.vue, accessiblePMR: form.accessiblePMR,
      equipements: selectedEq,
      tarif_base: +form.tarif_base, tarif_weekend: +form.tarif_weekend,
      tarif_enfant: +form.tarif_enfant, tarif_lit_supp: +form.tarif_lit_supp,
      description: form.description
    });
  };

  const F = (field: string) => ({
    value: form[field] ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((p: any) => ({ ...p, [field]: e.target.value }))
  });

  const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-palmier-400 outline-none transition-shadow";
  const labelCls = "block text-xs font-medium text-gray-500 mb-1";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={chambre ? `Modifier · ${chambre.nom}` : 'Ajouter une chambre'} size="lg"
      footer={
        <div className="flex gap-2 justify-end w-full">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-xl border border-gray-200 transition-colors" disabled={saving}>Annuler</button>
          <button type="submit" form="chambre-form" className="px-5 py-2 text-sm font-medium text-white bg-palmier-600 hover:bg-palmier-700 rounded-xl flex items-center gap-2 transition-colors shadow-sm" disabled={saving}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {chambre ? 'Mettre à jour' : 'Ajouter'}
          </button>
        </div>
      }
    >
      <form id="chambre-form" onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Numéro *</label><input {...F('numero')} required className={inputCls} /></div>
          <div><label className={labelCls}>Nom *</label><input {...F('nom')} required className={inputCls} /></div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {[['Adultes', 'capaciteAdultes'], ['Lits doubles', 'nbLitsDoubles'], ['Lits simples', 'nbLitsSimples'], ['Lits bébé', 'nbLitsBebe']].map(([l, k]) => (
            <div key={k}><label className={labelCls}>{l}</label><input type="number" min={0} {...F(k)} className={inputCls} /></div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Surface (m²)</label><input type="number" {...F('surfaceM2')} className={inputCls} /></div>
          <div>
            <label className={labelCls}>Vue</label>
            <select {...F('vue')} className={inputCls + ' bg-white'}>
              {Object.entries(VUE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer group">
          <input type="checkbox" checked={form.accessiblePMR} onChange={e => setForm((p: any) => ({ ...p, accessiblePMR: e.target.checked }))} className="w-4 h-4 text-palmier-600 rounded focus:ring-palmier-400" />
          <span className="text-sm text-gray-600 group-hover:text-palmier-600 transition-colors">Accessible PMR</span>
        </label>

        <div>
          <label className={labelCls}>Équipements</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(EQUIPEMENTS).map(([k, v]) => (
              <button key={k} type="button" onClick={() => setSelectedEq(p => p.includes(k) ? p.filter(x => x !== k) : [...p, k])}
                className={`px-3 py-1.5 rounded-xl text-xs border transition-all duration-200 flex items-center gap-1.5 ${
                  selectedEq.includes(k) ? 'bg-palmier-100 border-palmier-300 text-palmier-700 shadow-sm' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                }`}>
                {v.icon} {v.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-r from-palmier-50 to-sable-50 rounded-xl p-4 border border-palmier-100">
          <p className="text-xs font-semibold text-palmier-700 uppercase tracking-wide mb-3">Tarifs</p>
          <div className="grid grid-cols-2 gap-3">
            {[['Base / nuit (€)', 'tarif_base'], ['Weekend / nuit (€)', 'tarif_weekend'], ['Enfant -12 ans (€)', 'tarif_enfant'], ['Lit supplémentaire (€)', 'tarif_lit_supp']].map(([l, k]) => (
              <div key={k}><label className={labelCls}>{l}</label><input type="number" {...F(k)} className={inputCls + ' bg-white'} /></div>
            ))}
          </div>
        </div>

        <div>
          <label className={labelCls}>Description</label>
          <textarea {...F('description')} rows={2} placeholder="Décrivez la chambre…" className={inputCls + ' resize-none'} />
        </div>
      </form>
    </Modal>
  );
};

// ============================================
// MODAL TARIFS PAR SAISON
// ============================================

const TarifSaisonModal = ({ chambre, isOpen, onClose, onSave, saving }: {
  chambre: Chambre | null; isOpen: boolean; onClose: () => void;
  onSave: (data: any) => Promise<void>; saving: boolean;
}) => {
  const [tarifs, setTarifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chambre || !isOpen) return;
    setLoading(true);

    if (chambre.tarifs_complets && Object.keys(chambre.tarifs_complets).length > 0) {
      setTarifs(Object.entries(chambre.tarifs_complets).map(([saison, t]: [string, any]) => ({
        saison, prixBase: t.prixBase || 0, prixWeekend: t.prixWeekend || 0,
        prixEnfant: t.prixEnfant || 10, prixLitSupplementaire: t.prixLitSupplementaire || 20,
        coeffWeekend: t.coeffWeekend || 1.15, coeffDegressif: t.coeffDegressif || 0.9, actif: true
      })));
      setLoading(false); return;
    }

    const base = chambre.tarif_base || 85;
    const buildDefault = (mult: number, saison: string) => ({
      saison, prixBase: Math.round(base * mult), prixWeekend: Math.round(base * mult * 1.15),
      prixEnfant: 10, prixLitSupplementaire: 20, coeffWeekend: 1.15, coeffDegressif: 0.9, actif: true
    });

    api.get(`/chambres/${chambre.id}/tarifs`)
      .then(res => {
        const data = res.data.data || [];
        setTarifs(data.length > 0 ? data : [buildDefault(0.8, 'BASSE'), buildDefault(1, 'MOYENNE'), buildDefault(1.4, 'HAUTE')]);
      })
      .catch(() => setTarifs([buildDefault(0.8, 'BASSE'), buildDefault(1, 'MOYENNE'), buildDefault(1.4, 'HAUTE')]))
      .finally(() => setLoading(false));
  }, [chambre, isOpen]);

  if (!chambre) return null;

  const update = (i: number, field: string, val: any) =>
    setTarifs(p => { const n = [...p]; n[i] = { ...n[i], [field]: val }; return n; });

  const inputCls = "w-full border border-gray-200 rounded-xl px-2.5 py-1.5 text-sm text-gray-900 bg-white focus:ring-2 focus:ring-palmier-400 outline-none";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Tarifs saisonniers · ${chambre.nom}`} size="lg"
      footer={
        <div className="flex gap-2 justify-end w-full">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-xl border border-gray-200 transition-colors" disabled={saving}>Fermer</button>
          <button onClick={() => onSave(tarifs)} className="px-5 py-2 text-sm font-medium text-white bg-palmier-600 hover:bg-palmier-700 rounded-xl flex items-center gap-2 transition-colors shadow-sm" disabled={saving}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Enregistrer
          </button>
        </div>
      }
    >
      {loading ? (
        <div className="py-12 flex flex-col items-center gap-2 text-gray-400">
          <Loader2 size={28} className="animate-spin text-palmier-500" />
          <p className="text-sm">Chargement des tarifs…</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-500 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-3 flex items-start gap-2">
            💡 Définissez les prix pour chaque période de l'année. Les modifications s'appliquent aux nouvelles réservations.
          </p>
          {tarifs.map((t, i) => {
            const s = SAISON_CONFIG[t.saison] ?? SAISON_CONFIG.MOYENNE;
            return (
              <div key={t.saison || i} className={`rounded-xl border p-4 ${s.classes} shadow-sm`}>
                <div className="flex items-center gap-2 mb-3">
                  <p className="font-semibold text-sm">{s.emoji} {t.saison === 'BASSE' ? 'Basse saison' : t.saison === 'HAUTE' ? 'Haute saison' : 'Moyenne saison'}</p>
                  <span className="text-[10px] bg-white/70 px-2 py-0.5 rounded-full border border-current/20">
                    {t.actif ? '✅ Actif' : '❌ Inactif'}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    ['Prix base / nuit', 'prixBase'], ['Prix weekend', 'prixWeekend'],
                    ['Enfant -12 ans', 'prixEnfant'], ['Lit supplémentaire', 'prixLitSupplementaire']
                  ].map(([l, k]) => (
                    <div key={k}>
                      <label className="text-[10px] text-current opacity-70 block mb-1">{l}</label>
                      <input type="number" value={t[k] ?? ''} onChange={e => update(i, k, +e.target.value || 0)} className={inputCls} />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="text-[10px] text-current opacity-70 block mb-1">Coeff. weekend</label>
                    <input type="number" step="0.01" value={t.coeffWeekend ?? 1.15} onChange={e => update(i, 'coeffWeekend', +e.target.value || 1)} className={inputCls} />
                  </div>
                  <div>
                    <label className="text-[10px] text-current opacity-70 block mb-1">Réduction &gt;5 nuits (%)</label>
                    <input type="number" value={t.coeffDegressif ? Math.round((1 - t.coeffDegressif) * 100) : 10}
                      onChange={e => update(i, 'coeffDegressif', 1 - ((+e.target.value || 0) / 100))} className={inputCls} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
};

// ============================================
// MODAL BLOCAGE
// ============================================

const BlocageModal = ({ chambre, isOpen, onClose, onConfirm, saving }: {
  chambre: Chambre | null; isOpen: boolean; onClose: () => void;
  onConfirm: (data: { dateDebut: string; dateFin: string; motif: string; type: string }) => void;
  saving: boolean;
}) => {
  const [form, setForm] = useState({ dateDebut: '', dateFin: '', motif: '', type: 'MAINTENANCE' });

  useEffect(() => {
    if (isOpen) {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      setForm({ dateDebut: today, dateFin: tomorrow, motif: '', type: 'MAINTENANCE' });
    }
  }, [isOpen]);

  if (!chambre) return null;

  const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-palmier-400 outline-none";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Bloquer · ${chambre.nom}`}
      footer={
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-xl border border-gray-200 transition-colors" disabled={saving}>Annuler</button>
          <button onClick={() => onConfirm(form)} className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-xl flex items-center gap-2 transition-all duration-200 shadow-sm" disabled={saving || !form.dateDebut || !form.dateFin || !form.motif}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />} Confirmer le blocage
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700 flex items-start gap-2">
          <AlertTriangle size={15} className="shrink-0 mt-0.5" />
          Aucune réservation ne pourra être créée sur cette période.
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-xs font-medium text-gray-500 mb-1">📅 Date de début</label><input type="date" value={form.dateDebut} onChange={e => setForm(f => ({ ...f, dateDebut: e.target.value }))} className={inputCls} /></div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1">📅 Date de fin</label><input type="date" value={form.dateFin} min={form.dateDebut} onChange={e => setForm(f => ({ ...f, dateFin: e.target.value }))} className={inputCls} /></div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">🔧 Type de blocage</label>
          <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className={inputCls + ' bg-white'}>
            <option value="MAINTENANCE">🔧 Maintenance</option>
            <option value="FERMETURE_ANNUELLE">📅 Fermeture annuelle</option>
            <option value="PRIVATISATION">🏠 Privatisation</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">📝 Motif *</label>
          <input type="text" value={form.motif} onChange={e => setForm(f => ({ ...f, motif: e.target.value }))} placeholder="Ex : Travaux de peinture…" className={inputCls} />
        </div>
      </div>
    </Modal>
  );
};

// ============================================
// MODAL HISTORIQUE
// ============================================

const HistoriqueModal = ({ chambre, isOpen, onClose }: {
  chambre: Chambre | null; isOpen: boolean; onClose: () => void;
}) => {
  const [historique, setHistorique] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chambre || !isOpen) return;
    setLoading(true);
    api.get(`/chambres/${chambre.id}/historique`)
      .then(res => setHistorique(res.data.data || []))
      .catch(() => setHistorique([]))
      .finally(() => setLoading(false));
  }, [chambre, isOpen]);

  if (!chambre) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Historique · ${chambre.nom}`} size="lg"
      footer={<div className="flex justify-end"><button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-xl border border-gray-200 transition-colors">Fermer</button></div>}
    >
      {loading ? (
        <div className="py-12 flex flex-col items-center gap-2 text-gray-400">
          <Loader2 size={28} className="animate-spin text-palmier-500" />
          <p className="text-sm">Chargement…</p>
        </div>
      ) : historique.length === 0 ? (
        <div className="py-12 text-center text-gray-400">
          <History size={36} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">Aucune modification enregistrée</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {historique.map((h: any) => (
            <div key={h.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors border border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-800">
                  <span className="text-gray-500">Modification de</span> {h.champ || h.field} : 
                  <span className="text-red-500 line-through ml-1">{h.ancienneValeur || h.old_value || '—'}</span> 
                  <ArrowRight size={12} className="inline mx-1 text-gray-400" /> 
                  <span className="text-emerald-600 font-semibold">{h.nouvelleValeur || h.new_value || '—'}</span>
                </p>
                <p className="text-xs text-gray-400 mt-0.5">👤 {h.modifiePar || h.modified_by || 'Inconnu'}</p>
              </div>
              <p className="text-xs text-gray-400 shrink-0 ml-3">{new Date(h.dateHeureModification || h.modified_at || h.createdAt).toLocaleString('fr-FR')}</p>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
};

// ============================================
// MODAL CODE PROMO - Appliquer à une chambre
// ============================================

const ApplyPromoModal = ({ 
  chambre, 
  isOpen, 
  onClose, 
  onApply,
  saving 
}: {
  chambre: Chambre | null;
  isOpen: boolean;
  onClose: () => void;
  onApply: (code: string) => Promise<void>;
  saving: boolean;
}) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [availablePromos, setAvailablePromos] = useState<PromoCode[]>([]);

  useEffect(() => {
    if (isOpen && chambre) {
      setLoading(true);
      api.get('/codes-promo/actifs')
        .then(res => {
          const data = res.data.data || [];
          setAvailablePromos(data);
        })
        .catch(() => setAvailablePromos([]))
        .finally(() => setLoading(false));
      setCode('');
    }
  }, [isOpen, chambre]);

  if (!chambre) return null;

  const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-palmier-400 outline-none";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`🎁 Appliquer un code promo · ${chambre.nom}`}
      footer={
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-xl border border-gray-200 transition-colors" disabled={saving}>Annuler</button>
          <button 
            onClick={() => onApply(code)} 
            className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-xl flex items-center gap-2 transition-all duration-200 shadow-sm" 
            disabled={saving || !code.trim()}
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Gift size={15} />} Appliquer
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700 flex items-start gap-2">
          <Gift size={15} className="shrink-0 mt-0.5" />
          Entrez un code promo pour appliquer une réduction à cette chambre.
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Code promo</label>
          <input 
            type="text" 
            value={code} 
            onChange={e => setCode(e.target.value.toUpperCase())} 
            placeholder="Ex: ETE2026" 
            className={inputCls + ' font-mono tracking-widest'} 
          />
        </div>

        {availablePromos.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Codes disponibles</p>
            <div className="flex flex-wrap gap-2">
              {availablePromos.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setCode(p.code)}
                  className="px-3 py-1.5 text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg hover:bg-amber-50 hover:border-amber-300 transition-colors flex items-center gap-1.5"
                >
                  <Tag size={12} className="text-amber-500" />
                  {p.code}
                  <span className="text-[10px] text-gray-400">
                    {p.tauxReduction ? `-${p.tauxReduction}%` : p.reductionFixe ? `-${formatEuro(p.reductionFixe)}` : ''}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 size={20} className="animate-spin text-palmier-500" />
            <span className="ml-2 text-sm text-gray-400">Chargement des promos…</span>
          </div>
        )}
      </div>
    </Modal>
  );
};

// ============================================
// MODAL PROMOS ACTIVES
// ============================================

const PromosActiveModal = ({ 
  chambre, 
  isOpen, 
  onClose 
}: {
  chambre: Chambre | null;
  isOpen: boolean;
  onClose: () => void;
}) => {
  if (!chambre) return null;

  const promos = chambre.codesPromoActifs || [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`🎁 Promotions actives · ${chambre.nom}`} size="lg"
      footer={<div className="flex justify-end"><button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-xl border border-gray-200 transition-colors">Fermer</button></div>}
    >
      {promos.length === 0 ? (
        <div className="py-12 text-center text-gray-400">
          <Gift size={36} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">Aucune promotion active sur cette chambre</p>
          <p className="text-xs text-gray-300 mt-1">Utilisez "Appliquer un code promo" pour en ajouter une</p>
        </div>
      ) : (
        <div className="space-y-3">
          {promos.map((promo: PromoCode) => (
            <div key={promo.id} className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-200">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Tag size={16} className="text-amber-500" />
                    <span className="font-mono font-bold text-amber-700 text-lg">{promo.code}</span>
                    <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">Actif</span>
                  </div>
                  {promo.description && (
                    <p className="text-sm text-gray-600 mt-1">{promo.description}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-amber-700">
                    {promo.tauxReduction ? `-${promo.tauxReduction}%` : promo.reductionFixe ? `-${formatEuro(promo.reductionFixe)}` : ''}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    Utilisé {promo.nbUtilisations}/{promo.nbUtilisationsMax || '∞'} fois
                  </p>
                </div>
              </div>
              <div className="flex gap-4 mt-2 text-[10px] text-gray-400">
                <span>📅 Du {fmtDateFull(promo.dateDebut)} au {fmtDateFull(promo.dateFin)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
};

// ============================================
// PAGE PRINCIPALE
// ============================================

export default function ChambresPage() {
  const [chambres, setChambres] = useState<Chambre[]>([]);
  const [reservationsActuelles, setReservationsActuelles] = useState<ReservationLight[]>([]);
  const [statistiques, setStatistiques] = useState<ChambresResponse['statistiques']>({ 
    total: 0, disponibles: 0, occupees: 0, maintenance: 0, bloques: 0, 
    tauxOccupationGlobal: 0, revenusMois: 0 
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState<StatutAffichage | 'TOUS'>('TOUS');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedChambre, setSelectedChambre] = useState<Chambre | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showBlocageModal, setShowBlocageModal] = useState(false);
  const [showTarifModal, setShowTarifModal] = useState(false);
  const [showHistoriqueModal, setShowHistoriqueModal] = useState(false);
  const [showCodePromoModal, setShowCodePromoModal] = useState(false);
  const [showApplyPromoModal, setShowApplyPromoModal] = useState(false);
  const [showPromosActiveModal, setShowPromosActiveModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchFreshData = useCallback(async () => {
    const response = await api.get('/chambres/avec-occupation');
    const data: ChambresResponse = response.data.data;
    if (data?.chambres) {
      const chambresAvecOccupation = data.chambres.map(c => {
        const estOccupee = estChambreOccupeeActuellement(c, data.reservationsActuelles || []);
        return {
          ...c,
          estOccupeeActuellement: estOccupee,
          statut: estOccupee ? 'OCCUPEE' : (c.statut === 'OCCUPEE' ? 'DISPONIBLE' : c.statut),
          codesPromoActifs: data.codesPromoActifs || []
        };
      });
      setChambres(chambresAvecOccupation);
      setReservationsActuelles(data.reservationsActuelles || []);
      setStatistiques(data.statistiques || { 
        total: data.chambres.length, disponibles: 0, occupees: 0, 
        maintenance: 0, bloques: 0, tauxOccupationGlobal: 0, revenusMois: 0 
      });
      setCache(chambresAvecOccupation, data.reservationsActuelles || [], data.statistiques, data.codesPromoActifs);
    }
  }, []);

  const fetchChambres = useCallback(async (forceRefresh = false) => {
    setLoading(true); setIsRefreshing(true);
    try {
      if (!forceRefresh) {
        const cached = getCache();
        if (cached) {
          setChambres(cached.chambres);
          setReservationsActuelles(cached.reservationsActuelles);
          setStatistiques(cached.statistiques);
          setLoading(false); setIsRefreshing(false);
          fetchFreshData().catch(() => {});
          return;
        }
      }
      await fetchFreshData();
    } catch {
      toast.error('Impossible de charger les chambres');
      const cached = getCache();
      if (cached) { setChambres(cached.chambres); setReservationsActuelles(cached.reservationsActuelles); setStatistiques(cached.statistiques); }
    } finally { setLoading(false); setIsRefreshing(false); }
  }, [fetchFreshData]);

  useEffect(() => {
    fetchChambres();
    
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchFreshData().catch(() => {});
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [fetchChambres, fetchFreshData, autoRefresh]);

  const filtered = chambres.filter(c => {
    const matchSearch = c.nom?.toLowerCase().includes(search.toLowerCase()) || c.numero?.toLowerCase().includes(search.toLowerCase());
    const matchStatut = filterStatut === 'TOUS' || getStatutAffichage(c, reservationsActuelles) === filterStatut;
    return matchSearch && matchStatut;
  });

  const handleAddChambre = async (data: any) => {
    setSaving(true);
    try { await api.post('/chambres', data); toast.success('✅ Chambre ajoutée avec succès'); clearCache(); await fetchChambres(true); setShowFormModal(false); }
    catch (e: any) { toast.error(e.response?.data?.message || 'Erreur lors de l\'ajout'); }
    finally { setSaving(false); }
  };

  const handleEditChambre = async (data: any) => {
    if (!selectedChambre) return;
    setSaving(true);
    try { await api.put(`/chambres/${selectedChambre.id}`, data); toast.success('✅ Chambre modifiée avec succès'); clearCache(); await fetchChambres(true); setShowFormModal(false); setSelectedChambre(null); }
    catch (e: any) { toast.error(e.response?.data?.message || 'Erreur lors de la modification'); }
    finally { setSaving(false); }
  };

  const handleDeleteChambre = async (chambre: Chambre) => {
    if (getStatutAffichage(chambre, reservationsActuelles) === 'OCCUPEE') { toast.error('Impossible de supprimer une chambre occupée'); return; }
    if (!confirm(`Supprimer "${chambre.nom}" ?`)) return;
    try { await api.delete(`/chambres/${chambre.id}`); toast.success('🗑️ Chambre supprimée'); clearCache(); await fetchChambres(true); }
    catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  const handleDuplicateChambre = async (chambre: Chambre) => {
    try {
      const { id, createdAt, updatedAt, ...data } = chambre as any;
      await api.post('/chambres', { ...data, nom: `${chambre.nom} (copie)`, numero: `${chambre.numero}-COPY` });
      toast.success('📋 Chambre dupliquée avec succès'); clearCache(); await fetchChambres(true);
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  const handleToggleStatut = async (chambre: Chambre, newStatut: StatutChambre) => {
    if (newStatut === 'DISPONIBLE' && getStatutAffichage(chambre, reservationsActuelles) === 'OCCUPEE') {
      toast.error('Impossible de marquer disponible une chambre occupée');
      return;
    }
    try {
      await api.patch(`/chambres/${chambre.id}/statut`, { statut: newStatut });
      toast.success(`✅ Statut → ${STATUT_CONFIG[newStatut].label}`);
      clearCache(); await fetchChambres(true);
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  const handleBlocage = async (data: { dateDebut: string; dateFin: string; motif: string; type: string }) => {
    if (!selectedChambre) return;
    if (!estChambreDisponible(selectedChambre, new Date(data.dateDebut), new Date(data.dateFin), reservationsActuelles, [])) {
      toast.error('Chambre non disponible sur cette période'); return;
    }
    setSaving(true);
    try { await api.post(`/chambres/${selectedChambre.id}/bloquer`, data); toast.success('🔒 Dates bloquées avec succès'); clearCache(); await fetchChambres(true); setShowBlocageModal(false); setSelectedChambre(null); }
    catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const handleSaveTarifs = async (tarifs: any[]) => {
    if (!selectedChambre) return;
    setSaving(true);
    try { await api.put(`/chambres/${selectedChambre.id}/tarifs`, { tarifs }); toast.success('💰 Tarifs mis à jour avec succès'); clearCache(); await fetchChambres(true); setShowTarifModal(false); }
    catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  // ✅ Appliquer un code promo à une chambre
  const handleApplyPromo = async (code: string) => {
    if (!selectedChambre) return;
    setSaving(true);
    try {
      await api.post(`/chambres/${selectedChambre.id}/appliquer-promo`, { code });
      toast.success(`🎁 Code promo ${code} appliqué avec succès`);
      clearCache(); await fetchChambres(true);
      setShowApplyPromoModal(false);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erreur lors de l\'application du code promo');
    } finally {
      setSaving(false);
    }
  };

  const openAddForm = () => { setIsEditing(false); setSelectedChambre(null); setShowFormModal(true); };
  const openEditForm = (c: Chambre) => { setIsEditing(true); setSelectedChambre(c); setShowFormModal(true); };
  const openApplyPromo = (c: Chambre) => { setSelectedChambre(c); setShowApplyPromoModal(true); };
  const openViewPromos = (c: Chambre) => { setSelectedChambre(c); setShowPromosActiveModal(true); };

  // ---- RENDU ----

  if (loading && chambres.length === 0) {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        <div className="h-8 bg-gray-100 rounded-xl w-64 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">

      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-palmier-500 to-emerald-500 flex items-center justify-center shadow-sm">
              <BedDouble size={18} className="text-white" />
            </div>
            Gestion des chambres
            {isRefreshing && <Loader2 size={16} className="animate-spin text-palmier-500" />}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5 flex items-center gap-3 flex-wrap">
            <span>{chambres.length} chambre{chambres.length > 1 ? 's' : ''}</span>
            <span className="w-1 h-1 rounded-full bg-gray-300" />
            <span className="text-emerald-600">{statistiques.disponibles} disponible{statistiques.disponibles > 1 ? 's' : ''}</span>
            {statistiques.tauxOccupationGlobal > 0 && (
              <>
                <span className="w-1 h-1 rounded-full bg-gray-300" />
                <span className="text-blue-600">{statistiques.tauxOccupationGlobal}% d'occupation</span>
              </>
            )}
            {statistiques.revenusMois > 0 && (
              <>
                <span className="w-1 h-1 rounded-full bg-gray-300" />
                <span className="text-palmier-600">{formatEuro(statistiques.revenusMois)} ce mois</span>
              </>
            )}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button 
            onClick={() => setAutoRefresh(!autoRefresh)} 
            className={`p-2 rounded-xl border transition-colors ${autoRefresh ? 'text-palmier-600 border-palmier-200 bg-palmier-50' : 'text-gray-400 border-gray-200 hover:bg-gray-50'}`}
            title={autoRefresh ? 'Auto-refresh activé' : 'Auto-refresh désactivé'}
          >
            <RefreshCw size={15} className={autoRefresh ? 'animate-spin-slow' : ''} />
          </button>
          <button onClick={() => { clearCache(); fetchChambres(true); }} disabled={isRefreshing}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors">
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
          <button onClick={openAddForm}
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-palmier-600 to-emerald-600 hover:from-palmier-700 hover:to-emerald-700 rounded-xl flex items-center gap-1.5 transition-all duration-200 shadow-sm hover:shadow-md">
            <Plus size={15} /> Ajouter
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard value={chambres.length}          label="Total chambres" color="bg-gradient-to-br from-slate-500 to-slate-600" icon={Building2} />
        <StatCard value={statistiques.disponibles} label="Disponibles"    color="bg-gradient-to-br from-emerald-500 to-emerald-600" icon={CheckCircle} />
        <StatCard value={statistiques.occupees}    label="Occupées"       color="bg-gradient-to-br from-blue-500 to-blue-600" icon={Users} subtitle={statistiques.tauxOccupationGlobal > 0 ? `${statistiques.tauxOccupationGlobal}% occup` : ''} />
        <StatCard value={statistiques.maintenance} label="Maintenance"    color="bg-gradient-to-br from-amber-500 to-amber-600" icon={Settings} />
        <StatCard value={statistiques.revenusMois ? formatEuro(statistiques.revenusMois) : '0€'} label="Revenus du mois" color="bg-gradient-to-br from-palmier-500 to-emerald-500" icon={DollarSign} />
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text" placeholder="Rechercher par nom ou numéro…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-palmier-400 outline-none transition-shadow"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>

        <select
          value={filterStatut} onChange={e => setFilterStatut(e.target.value as any)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:ring-2 focus:ring-palmier-400 outline-none bg-white min-w-[160px]"
        >
          <option value="TOUS">📊 Tous les statuts</option>
          <option value="DISPONIBLE">✅ Disponibles</option>
          <option value="OCCUPEE">👥 Occupées</option>
          <option value="EN_MAINTENANCE">🔧 En maintenance</option>
          <option value="HORS_SERVICE">🚫 Hors service</option>
          <option value="BLOQUEE">🔒 Bloquées</option>
        </select>

        <div className="flex rounded-xl overflow-hidden border border-gray-200">
          {(['grid', 'list'] as const).map(mode => (
            <button key={mode} onClick={() => setViewMode(mode)}
              className={`px-3 py-2.5 transition-all duration-200 ${viewMode === mode ? 'bg-palmier-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
              {mode === 'grid' ? <Grid3x3 size={15} /> : <List size={15} />}
            </button>
          ))}
        </div>

        <button 
          onClick={() => { setSearch(''); setFilterStatut('TOUS'); }}
          className="px-3 py-2.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          Réinitialiser
        </button>
      </div>

      {/* Légende statuts */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-500 bg-white rounded-xl border border-gray-100 px-4 py-2.5">
        <span className="font-medium text-gray-700">Statuts :</span>
        {(Object.entries(STATUT_CONFIG) as [StatutAffichage, typeof STATUT_CONFIG[StatutAffichage]][]).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${v.dot}`} /> {v.label}
            {k === 'OCCUPEE' && <span className="text-gray-300 text-[9px]">(auto)</span>}
          </span>
        ))}
        <span className="text-gray-300 ml-2 text-[9px]">🔄 Mise à jour automatique toutes les 30s</span>
      </div>

      {/* Liste / Grille */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <BedDouble size={48} className="text-gray-200 mx-auto mb-3" />
          <p className="text-base font-medium text-gray-400">Aucune chambre trouvée</p>
          <p className="text-sm text-gray-300 mt-1">{search || filterStatut !== 'TOUS' ? 'Aucun résultat pour ces filtres' : 'Ajoutez votre première chambre'}</p>
          {(search || filterStatut !== 'TOUS') && (
            <button onClick={() => { setSearch(''); setFilterStatut('TOUS'); }} className="mt-3 text-sm text-palmier-600 hover:underline font-medium">
              Réinitialiser les filtres
            </button>
          )}
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4' : 'space-y-3'}>
          {filtered.map(c => (
            <ChambreCard
              key={c.id}
              chambre={c}
              reservationsActuelles={reservationsActuelles}
              onView={c => { setSelectedChambre(c); setShowDetailModal(true); }}
              onToggleStatut={handleToggleStatut}
              onBlock={c => { setSelectedChambre(c); setShowBlocageModal(true); }}
              onEdit={openEditForm}
              onDelete={handleDeleteChambre}
              onCopy={handleDuplicateChambre}
              onManageTarifs={c => { setSelectedChambre(c); setShowTarifModal(true); }}
              onHistorique={c => { setSelectedChambre(c); setShowHistoriqueModal(true); }}
              onApplyPromo={openApplyPromo}
              onViewPromos={openViewPromos}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <ChambreDetailModal chambre={selectedChambre} isOpen={showDetailModal} onClose={() => { setShowDetailModal(false); setSelectedChambre(null); }} onToggleStatut={handleToggleStatut} onBlock={c => { setSelectedChambre(c); setShowBlocageModal(true); }} onEdit={openEditForm} reservationsActuelles={reservationsActuelles} />
      <ChambreFormModal chambre={isEditing ? selectedChambre : null} isOpen={showFormModal} onClose={() => { setShowFormModal(false); setSelectedChambre(null); setIsEditing(false); }} onSave={isEditing ? handleEditChambre : handleAddChambre} saving={saving} />
      <TarifSaisonModal chambre={selectedChambre} isOpen={showTarifModal} onClose={() => { setShowTarifModal(false); setSelectedChambre(null); }} onSave={handleSaveTarifs} saving={saving} />
      <BlocageModal chambre={selectedChambre} isOpen={showBlocageModal} onClose={() => { setShowBlocageModal(false); setSelectedChambre(null); }} onConfirm={handleBlocage} saving={saving} />
      <HistoriqueModal chambre={selectedChambre} isOpen={showHistoriqueModal} onClose={() => { setShowHistoriqueModal(false); setSelectedChambre(null); }} />
      <ApplyPromoModal chambre={selectedChambre} isOpen={showApplyPromoModal} onClose={() => { setShowApplyPromoModal(false); setSelectedChambre(null); }} onApply={handleApplyPromo} saving={saving} />
      <PromosActiveModal chambre={selectedChambre} isOpen={showPromosActiveModal} onClose={() => { setShowPromosActiveModal(false); setSelectedChambre(null); }} />

      {/* Styles d'animation */}
      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-10px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-5px); max-height: 0; }
          to { opacity: 1; transform: translateY(0); max-height: 200px; }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-fadeInDown {
          animation: fadeInDown 0.2s ease-out forwards;
        }
        .animate-slideDown {
          animation: slideDown 0.25s ease-out forwards;
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
    </div>
  );
}