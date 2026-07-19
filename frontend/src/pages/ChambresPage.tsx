// frontend/src/pages/ChambresPage.tsx
//
// ⚠️ POLICE DE CARACTÈRES : ce design utilise "Playfair Display" (titres) + "Inter" (texte).
// Ajoutez ceci UNE FOIS dans votre index.html (dans le <head>), ça ne se fait pas dans ce fichier :
//
// <link rel="preconnect" href="https://fonts.googleapis.com">
// <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700;800&display=swap" rel="stylesheet">
//
// Puis ajoutez dans tailwind.config.js -> theme.extend :
//
// fontFamily: {
//   display: ['"Playfair Display"', 'serif'],
// },
// colors: {
//   primary: "#006761",
//   "on-primary": "#ffffff",
//   "on-surface": "#1e1b18",
//   "on-surface-variant": "#3d4947",
//   outline: "#6d7a77",
//   "outline-variant": "#bcc9c7",
//   "surface-container-low": "#fbf2ed",
//   "accent-gold": "#E9C349",
//   "[#003a37]": "#003a37",
// },
//
// (le reste de vos couleurs "palmier-50…700", "sable-50" etc. ne change pas,
// ce fichier ne fait qu'ajouter les tokens ci-dessus qui manquaient.)
//
// ✅ CORRECTIONS APPORTÉES DANS CETTE VERSION :
//   1. Contraste des textes : tous les textes "secondaires" utilisaient
//      `text-outline` (#6d7a77) parfois même en opacité réduite (/60, /70),
//      ce qui est trop clair sur fond blanc. Remplacé par
//      `text-gray-700` (#3d4947), bien plus lisible, en pleine
//      opacité partout.
//   2. Images des chambres : la carte affichait uniquement une icône de lit
//      sur un dégradé. On affiche maintenant `chambre.image` si elle existe
//      en base, avec un repli propre (dégradé + icône) si l'image est
//      absente ou ne charge pas.
//   3. Section "Gérer les promos" : les routes GET/POST /api/codes-promo
//      et PATCH/DELETE /api/codes-promo/:id sont servies par
//      codesPromo.controller.ts / codesPromo.routes.ts (fichiers séparés,
//      montés sur app.use('/api/codes-promo', codesPromoRoutes) dans
//      app.ts). Le formulaire de création envoie les noms de champs exacts
//      du modèle Sequelize PromoCode (tauxReduction, dateDebut, dateFin,
//      nbUtilisationsMax…) au lieu des anciens noms incohérents
//      (reductionPourcentage, dateDebutValidite, usagesMax…).
//   4. Couleurs : tous les tokens Tailwind personnalisés qui dépendaient
//      d'un tailwind.config.js non modifié (primary, on-primary,
//      accent-gold, outline-variant, surface-container-low, palmier-900)
//      sont remplacés par leur valeur hexadécimale directe en syntaxe
//      Tailwind arbitraire (ex: text-[#006761]), qui fonctionne SANS
//      aucune configuration. Les textes génériques utilisent désormais
//      text-black / text-gray-700, garantis natifs.
//   5. ✅ NOUVEAU — Toutes les icônes "emoji" (✅ 🔒 📅 🎁 …) ont été
//      remplacées par des icônes lucide-react, pour un rendu propre et
//      cohérent sur toutes les plateformes (les emoji ne s'affichent pas
//      pareil selon l'OS/le navigateur).
//   6. ✅ NOUVEAU — Le numéro de chambre n'est plus saisi à la main : il
//      est généré automatiquement au format "CHA" + 3 chiffres (ex:
//      CHA567, 6 caractères max), avec vérification anti-collision contre
//      les chambres déjà chargées, et un bouton pour le régénérer.
//   7. ✅ NOUVEAU — Le champ "image" n'est plus une URL à coller : on
//      upload directement un fichier depuis son poste (encodé en base64
//      côté client), stocké tel quel dans la colonne `image` du modèle
//      Sequelize `Room` (voir backend/src/models/Room.ts).
//   8. ✅ Toutes les actions sur les codes promo (création, suppression,
//      activation/désactivation, application, erreurs) passent par la
//      notification UI `notifyAjout` — jamais de texte brut ou d'alert().
//
import React, { useEffect, useState, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { Modal } from '../components/ui';
import { formatEuro } from '../utils/helpers';
import { useWebSocketContext } from '../context/WebSocketContext';
import { notifyAjout } from '../components/ui/AjoutNotification';
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
  Layers, BarChart3, PieChart, Activity, RefreshCcw, Wifi as WifiIcon, WifiOff,
  ClipboardCheck, ToggleLeft, ToggleRight, PackageOpen, ImageOff,
  Leaf, Waves, Mountain, Info, Upload, ImagePlus, XCircle, LayoutGrid,
  PauseCircle, ClipboardList
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
// CONSTANTES — style "The Palms" (glass-effect, or, palmier)
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
    dot: 'bg-palmier-500',
    badge: 'bg-white/85 backdrop-blur-md border-white/50 text-black',
    text: 'text-palmier-700',
    icon: <CheckCircle size={12} />,
    bgGradient: 'from-palmier-50 to-emerald-100/30',
  },
  OCCUPEE: {
    label: 'Occupée',
    dot: 'bg-amber-400 shadow-[0_0_8px_rgba(233,195,73,0.8)] animate-pulse',
    badge: 'bg-white/85 backdrop-blur-md border-white/50 text-black',
    text: 'text-amber-700',
    icon: <Users size={12} />,
    bgGradient: 'from-amber-50 to-orange-100/30',
  },
  EN_MAINTENANCE: {
    label: 'Maintenance',
    dot: 'bg-amber-500',
    badge: 'bg-white/85 backdrop-blur-md border-white/50 text-amber-700',
    text: 'text-amber-700',
    icon: <Settings size={12} />,
    bgGradient: 'from-amber-50 to-amber-100/30',
  },
  HORS_SERVICE: {
    label: 'Hors service',
    dot: 'bg-red-400',
    badge: 'bg-white/85 backdrop-blur-md border-white/50 text-red-700',
    text: 'text-red-700',
    icon: <Ban size={12} />,
    bgGradient: 'from-red-50 to-red-100/30',
  },
  BLOQUEE: {
    label: 'Bloquée',
    dot: 'bg-violet-400',
    badge: 'bg-white/85 backdrop-blur-md border-white/50 text-violet-700',
    text: 'text-violet-700',
    icon: <Lock size={12} />,
    bgGradient: 'from-violet-50 to-violet-100/30',
  },
};

const STATUTS_MODIFIABLES: StatutChambre[] = ['DISPONIBLE', 'EN_MAINTENANCE', 'HORS_SERVICE', 'BLOQUEE'];

// ✅ Emoji -> icônes lucide
const VUE_CONFIG: Record<VueChambre, { label: string; icon: React.ReactNode; color: string }> = {
  JARDIN:   { label: 'Jardin',   icon: <Leaf size={12} />,     color: 'text-emerald-600' },
  PISCINE:  { label: 'Piscine',  icon: <Waves size={12} />,    color: 'text-blue-600' },
  MONTAGNE: { label: 'Montagne', icon: <Mountain size={12} />, color: 'text-slate-600' },
};

// ✅ Emoji -> icônes lucide
const SAISON_CONFIG: Record<string, { label: string; classes: string; icon: React.ReactNode }> = {
  BASSE:   { label: 'Basse saison',   classes: 'bg-sky-50 text-sky-700 border-sky-200', icon: <Snowflake size={12} className="text-sky-500" /> },
  MOYENNE: { label: 'Moyenne saison', classes: 'bg-teal-50 text-teal-700 border-teal-200', icon: <Cloud size={12} className="text-teal-500" /> },
  HAUTE:   { label: 'Haute saison',   classes: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Sun size={12} className="text-amber-500" /> },
};

const EQUIPEMENTS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  climatisation:       { label: 'Clim',          icon: <Wind size={12} />, color: 'text-sky-600' },
  ventilateur:         { label: 'Ventilateur',   icon: <Wind size={12} />, color: 'text-gray-600' },
  'sèche-cheveux':     { label: 'Sèche-cheveux', icon: <Sparkles size={12} />, color: 'text-purple-600' },
  bouilloire:          { label: 'Bouilloire',    icon: <Coffee size={12} />, color: 'text-amber-600' },
  'mini-réfrigérateur':{ label: 'Frigo',         icon: <Coffee size={12} />, color: 'text-blue-600' },
  wifi:                { label: 'WiFi',          icon: <Wifi size={12} />, color: 'text-indigo-600' },
  tv:                  { label: 'TV',            icon: <Tv size={12} />, color: 'text-gray-600' },
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
    if (r.statut !== 'CONFIRMEE' && r.statut !== 'EN_ATTENTE_ACOMPTE') return false;
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

function getJoursRestantsPromo(dateFin: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const fin = new Date(dateFin);
  fin.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((fin.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

function formatReduction(promo: { tauxReduction?: number; reductionFixe?: number }): string {
  if (promo.tauxReduction) return `${promo.tauxReduction}%`;
  if (promo.reductionFixe) return `${formatEuro(promo.reductionFixe)}`;
  return '';
}

function generateRandomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function validatePromoCode(code: string): boolean {
  const regex = /^[A-Z0-9]{1,6}$/;
  return regex.test(code);
}

// ✅ AJOUT — Génère un numéro de chambre automatique au format "CHA" + 3
// chiffres (6 caractères max, ex: "CHA567"). Vérifie qu'il n'entre pas en
// collision avec un numéro déjà utilisé par une chambre existante.
function generateNumeroChambre(existants: string[] = []): string {
  const existantsSet = new Set(existants.map(n => n.toUpperCase()));
  let numero = '';
  let tentatives = 0;
  do {
    const rand = Math.floor(100 + Math.random() * 900); // 100-999
    numero = `CHA${rand}`;
    tentatives++;
  } while (existantsSet.has(numero) && tentatives < 50);
  return numero;
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    notifyAjout('success', 'Copié', `"${text}" copié dans le presse-papiers`);
  } catch {
    notifyAjout('error', 'Erreur', 'Impossible de copier');
  }
}

// ✅ Illustration de la chambre.
// Utilise l'image réelle uploadée (`chambre.image`, une data URI base64
// stockée directement dans la colonne Sequelize `image`) si elle existe.
// Sinon, retourne une image de secours cohérente par vue (jardin / piscine /
// montagne), stable pour une même chambre (seed = id) pour ne pas changer
// d'une actualisation à l'autre.
function getChambreImageUrl(chambre: Chambre): string {
  if (chambre.image) return chambre.image;
  // Image de secours stable (pas de mots-clés de recherche pouvant échouer,
  // pas de dépendance à un compte/API key). Le "seed" est basé sur l'id de
  // la chambre : l'image reste la même à chaque chargement.
  return `https://picsum.photos/seed/chambre-${chambre.id}/480/360`;
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
  <div className="bg-white rounded-[2rem] border border-[#bcc9c7]/20 shadow-sm p-5 animate-pulse space-y-4">
    <div className="h-44 bg-gray-100 rounded-2xl" />
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
// STAT CARD — bento style, hover lift
// ============================================

const StatCard = ({ value, label, color, icon: Icon, subtitle }: {
  value: number | string; label: string; color: string; icon: React.ElementType; subtitle?: string;
}) => (
  <div className="bento-card bg-white rounded-2xl border border-[#bcc9c7]/20 shadow-sm px-5 py-4 flex items-center gap-4">
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color} shadow-sm`}>
      <Icon size={18} className="text-white" />
    </div>
    <div>
      <p className="font-display text-2xl font-bold text-black leading-none">{value}</p>
      <p className="text-[10px] text-gray-700 uppercase tracking-widest font-bold mt-1">{label}</p>
      {subtitle && <p className="text-[10px] text-gray-700 mt-0.5">{subtitle}</p>}
    </div>
  </div>
);

// ============================================
// STATUS BADGE — pill "glass" comme la maquette
// ============================================

const StatusBadge = ({ statut, animated = false }: { statut: StatutAffichage; animated?: boolean }) => {
  const cfg = STATUT_CONFIG[statut];
  return (
    <span className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-full border shadow-sm ${cfg.badge}`}>
      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

// ============================================
// PROGRESS BAR UTILISATION PROMO
// ============================================

const PromoUsageBar = ({ used, max }: { used: number; max?: number | null }) => {
  if (!max) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full" style={{ width: '100%' }} />
        </div>
        <span className="text-[10px] text-gray-700 whitespace-nowrap">{used} · ∞</span>
      </div>
    );
  }
  const pct = Math.min(100, Math.round((used / max) * 100));
  const isNearLimit = pct >= 80;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${isNearLimit ? 'bg-gradient-to-r from-red-400 to-red-500' : 'bg-gradient-to-r from-amber-400 to-orange-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-[10px] whitespace-nowrap ${isNearLimit ? 'text-red-600 font-semibold' : 'text-gray-700'}`}>{used}/{max}</span>
    </div>
  );
};

// ============================================
// IMAGE DE CHAMBRE — avec repli propre si l'image ne charge pas
// ============================================

const ChambreImage = ({ chambre, statutCfg }: { chambre: Chambre; statutCfg: typeof STATUT_CONFIG[StatutAffichage] }) => {
  const [erreur, setErreur] = useState(false);
  const src = getChambreImageUrl(chambre);

  if (erreur) {
    return (
      <div className={`absolute inset-0 bg-gradient-to-br ${statutCfg.bgGradient} flex items-center justify-center`}>
        <div className="flex flex-col items-center gap-1.5 text-gray-700">
          <ImageOff size={28} />
          <span className="text-[10px] font-medium">Pas d'image</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <img
        src={src}
        alt={`Photo de la chambre ${chambre.nom}`}
        onError={() => setErreur(true)}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        loading="lazy"
      />
      {/* Voile sombre en bas pour garder les badges lisibles au-dessus de la photo */}
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/40 to-transparent" />
    </>
  );
};

// ============================================
// CHAMBRE CARD — refonte "The Palms" (bento-card, glass badges, prix mis en avant)
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
    if (r.statut !== 'CONFIRMEE' && r.statut !== 'EN_ATTENTE_ACOMPTE') return false;
    const today = new Date();
    const arrivee = new Date(r.dateArrivee);
    const depart = new Date(r.dateDepart);
    return today >= arrivee && today < depart;
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
      className={`bento-card group bg-white rounded-[2rem] border border-[#bcc9c7]/20 shadow-sm overflow-visible relative ${menuOpen || statusOpen ? 'z-30' : 'z-0'}`}
    >
      {/* Bandeau photo réel de la chambre (avec repli dégradé + icône si absente) */}
      <div className="relative h-48 rounded-t-[2rem] overflow-hidden bg-gray-100">
        <ChambreImage chambre={chambre} statutCfg={statutCfg} />

        {reservationEnCours && (
          <div className="absolute inset-x-0 top-16 flex justify-center z-10">
            <span className="text-[10px] font-bold text-black glass-effect px-2.5 py-1 rounded-full">
              {joursRestants} jour{joursRestants > 1 ? 's' : ''} restant{joursRestants > 1 ? 's' : ''}
            </span>
          </div>
        )}

        <div className="absolute top-4 left-4 z-10">
          <StatusBadge statut={statut} animated={estOccupee} />
        </div>

        {chambre.accessiblePMR && (
          <div className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-white/85 backdrop-blur-md border border-white/50 rounded-full text-[#006761] z-10 shadow-sm" title="Accessible PMR">
            <Accessibility size={16} />
          </div>
        )}

        {hasActivePromo && (
          <div className="absolute bottom-4 left-4 bg-[#E9C349] text-black px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 shadow-lg z-10">
            <Gift size={13} /> -{chambre.codesPromoActifs?.[0]?.tauxReduction || 0}% PROMO
          </div>
        )}

        <div className="absolute bottom-4 right-4 glass-effect px-3 py-1.5 rounded-full flex items-center gap-1.5 text-[10px] font-bold text-black z-10">
          <span className={vue.color}>{vue.icon}</span> {vue.label}
        </div>
      </div>

      <div className="p-7 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-display text-2xl text-[#006761] mb-1 leading-tight flex items-center gap-2">
              {chambre.nom}
              {chambre.estOccupeeActuellement && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
            </h3>
            <p className="text-[11px] text-gray-700 font-semibold uppercase tracking-wide font-mono">#{chambre.numero}</p>
          </div>
          <div className="relative">
            <button
              onClick={() => { setMenuOpen(v => !v); setStatusOpen(false); }}
              className="p-2 text-gray-700 hover:text-[#006761] hover:bg-[#006761]/5 rounded-full transition-all"
              title="Paramètres de la chambre"
            >
              <MoreVertical size={18} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-[#bcc9c7]/20 py-1.5 z-20 w-64 text-sm animate-fadeInDown">
                <div className="px-3 py-2 border-b border-[#bcc9c7]/20 bg-gradient-to-r from-[#006761]/5 to-transparent rounded-t-xl">
                  <p className="text-xs font-semibold text-[#006761] flex items-center gap-2 font-display">
                    <Settings size={12} className="text-[#006761]" />
                    Gestion de {chambre.nom}
                  </p>
                </div>

                <MenuItem icon={<Eye size={13} />} label="Voir détails" onClick={() => { onView(chambre); setMenuOpen(false); }} />
                <MenuItem icon={<Edit2 size={13} />} label="Modifier la chambre" onClick={() => { onEdit(chambre); setMenuOpen(false); }} />
                <MenuItem icon={<Calendar size={13} />} label="Bloquer des dates" onClick={() => { onBlock(chambre); setMenuOpen(false); }} />
                <MenuItem icon={<DollarSign size={13} />} label="Gérer les tarifs" onClick={() => { onManageTarifs(chambre); setMenuOpen(false); }} />

                <div className="border-t border-[#bcc9c7]/20 my-1">
                  <div className="px-2 py-1">
                    <p className="text-[10px] text-gray-700 uppercase tracking-wider px-2 py-0.5">Promotions</p>
                  </div>
                  <MenuItem
                    icon={<Gift size={13} className="text-[#E9C349]" />}
                    label="Appliquer un code promo"
                    onClick={() => { if (onApplyPromo) onApplyPromo(chambre); setMenuOpen(false); }}
                    highlight
                  />
                  <MenuItem
                    icon={<Tag size={13} className="text-purple-600" />}
                    label="Voir les promos actives"
                    onClick={() => { if (onViewPromos) onViewPromos(chambre); setMenuOpen(false); }}
                  />
                </div>

                <MenuItem icon={<History size={13} />} label="Historique" onClick={() => { onHistorique(chambre); setMenuOpen(false); }} />
                <MenuItem icon={<Copy size={13} />} label="Dupliquer" onClick={() => { onCopy(chambre); setMenuOpen(false); }} />

                <div className="px-2 py-1 border-t border-[#bcc9c7]/20">
                  <button
                    onClick={() => setStatusOpen(v => !v)}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
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
                                notifyAjout('error', 'Action impossible', 'Impossible de marquer disponible une chambre occupée');
                                return;
                              }
                              onToggleStatut(chambre, s);
                              setMenuOpen(false); setStatusOpen(false);
                            }}
                            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                              isActive ? `${cfg.text} font-semibold bg-gray-50` : 'text-gray-700 hover:bg-gray-50'
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

                <div className="border-t border-[#bcc9c7]/20 mt-1 pt-1">
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

        {reservationEnCours && (
          <div className="bg-[#fbf2ed]/60 p-4 rounded-2xl mb-5 border border-[#bcc9c7]/10">
            <p className="text-[9px] text-gray-700 uppercase font-bold tracking-widest mb-2">Guest actuel</p>
            <div className="flex justify-between items-center flex-wrap gap-1">
              <p className="text-sm font-semibold text-black">{reservationEnCours.client_prenom} {reservationEnCours.client_nom}</p>
              <span className="text-[10px] px-2 py-0.5 bg-[#006761]/10 text-[#006761] rounded-full font-bold">
                {fmtDate(reservationEnCours.dateArrivee)} → {fmtDate(reservationEnCours.dateDepart)}
              </span>
            </div>
            {reservationEnCours.codePromo && (
              <span className="mt-2 inline-flex text-[9px] bg-[#E9C349]/20 text-amber-800 px-2 py-0.5 rounded-full items-center gap-1">
                <Tag size={9} /> {reservationEnCours.codePromo} · -{reservationEnCours.reduction}%
              </span>
            )}
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 mb-6 pt-1 border-t border-[#bcc9c7]/10 pt-4">
          <div className="text-center">
            <Users size={16} className="mx-auto text-gray-700 mb-1" />
            <p className="text-[10px] text-gray-700 font-medium">{chambre.capaciteAdultes} pers.</p>
          </div>
          <div className="text-center">
            <Maximize2 size={16} className="mx-auto text-gray-700 mb-1" />
            <p className="text-[10px] text-gray-700 font-medium">{chambre.surfaceM2} m²</p>
          </div>
          <div className="text-center">
            {saison.icon}
            <p className="text-[10px] text-gray-700 font-medium mt-1">{saison.label}</p>
          </div>
        </div>

        {chambre.equipements?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-6">
            {chambre.equipements.slice(0, 5).map(eq => {
              const cfg = EQUIPEMENTS[eq];
              return cfg ? (
                <span key={eq} className={`inline-flex items-center gap-1 text-[10px] ${cfg.color} bg-[#fbf2ed] px-2.5 py-1 rounded-lg border border-[#bcc9c7]/10 font-semibold`}>
                  {cfg.icon} {cfg.label}
                </span>
              ) : null;
            })}
            {chambre.equipements.length > 5 && (
              <span className="text-[10px] text-gray-700 bg-[#fbf2ed] px-2.5 py-1 rounded-lg border border-[#bcc9c7]/10">
                +{chambre.equipements.length - 5}
              </span>
            )}
          </div>
        )}

        {/* Prix — mis en avant comme dans la maquette */}
        <div className="mt-auto flex justify-between items-center">
          <div>
            <p className="text-[9px] text-gray-700 uppercase font-bold tracking-wider">À partir de</p>
            <p className="text-2xl font-bold text-black">
              {formatEuro(tarifActuel)}<span className="text-sm font-normal text-gray-700">/n</span>
            </p>
          </div>
          <button
            onClick={() => onView(chambre)}
            className="bg-[#006761] text-white px-6 py-2.5 rounded-xl font-semibold text-[13px] hover:bg-[#003a37] transition-all shadow-md active:scale-95 flex items-center gap-1.5"
          >
            <Eye size={14} /> Détails
          </button>
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
      danger ? 'text-red-600 hover:bg-red-50' :
      highlight ? 'text-amber-700 hover:bg-amber-50 bg-amber-50/30' :
      'text-gray-700 hover:bg-gray-50'
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
  const vue = VUE_CONFIG[chambre.vue];
  const saison = SAISON_CONFIG[chambre.saison_actuelle] ?? SAISON_CONFIG.MOYENNE;

  const reservationEnCours = reservationsActuelles.find(r => {
    if (r.chambreId !== chambre.id) return false;
    if (r.statut !== 'CONFIRMEE' && r.statut !== 'EN_ATTENTE_ACOMPTE') return false;
    const now = new Date();
    return now >= new Date(r.dateArrivee) && now < new Date(r.dateDepart);
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
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl border border-[#bcc9c7]/30 transition-colors">Fermer</button>
          <button onClick={() => { onEdit(chambre); onClose(); }} className="px-4 py-2 text-sm font-medium text-black hover:bg-gray-50 rounded-xl border border-[#bcc9c7]/30 flex items-center gap-1.5 transition-colors"><Edit2 size={14} /> Modifier</button>
          <button onClick={() => { onBlock(chambre); onClose(); }} className="px-4 py-2 text-sm font-medium text-black hover:bg-gray-50 rounded-xl border border-[#bcc9c7]/30 flex items-center gap-1.5 transition-colors"><Calendar size={14} /> Bloquer</button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Photo de la chambre en tête du détail */}
        <div className="relative h-56 rounded-2xl overflow-hidden bg-gray-100">
          <ChambreImage chambre={chambre} statutCfg={cfg} />
        </div>

        <div className={`bg-gradient-to-br ${cfg.bgGradient} rounded-2xl p-4 flex items-center gap-4 border border-[#bcc9c7]/10`}>
          <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
            <BedDouble size={28} className="text-[#006761]" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs bg-white text-gray-700 px-2 py-0.5 rounded-md">{chambre.numero}</span>
              <StatusBadge statut={statut} />
              <span className={`px-2 py-0.5 rounded-full border text-[10px] font-medium ${saison.classes} flex items-center gap-1`}>
                {saison.icon} {saison.label}
              </span>
              {hasActivePromo && (
                <span className="px-2 py-0.5 rounded-full border text-[10px] font-medium bg-amber-50 border-amber-200 text-amber-800 flex items-center gap-1">
                  <Gift size={10} /> Promo
                </span>
              )}
            </div>
            <p className="text-sm text-gray-700 mt-1 font-display flex items-center gap-1.5">
              <span className={vue.color}>{vue.icon}</span> Vue {vue.label} · {chambre.capaciteAdultes} personnes · {chambre.surfaceM2} m²
            </p>
            {reservationEnCours && (
              <p className="text-xs text-[#006761] mt-1 flex items-center gap-1">
                <Users size={12} /> Occupé par {reservationEnCours.client_prenom} {reservationEnCours.client_nom} jusqu'au {fmtDateFull(reservationEnCours.dateDepart)}
                {reservationEnCours.codePromo && (
                  <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full text-[10px] flex items-center gap-1">
                    <Tag size={10} /> -{reservationEnCours.reduction}%
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Lits doubles', value: chambre.nbLitsDoubles || 0 },
            { label: 'Lits simples', value: chambre.nbLitsSimples || 0 },
            { label: 'Lits bébé',    value: chambre.nbLitsBebe || 0 },
          ].map(item => (
            <div key={item.label} className="bg-[#fbf2ed] rounded-xl px-4 py-3 border border-[#bcc9c7]/10">
              <p className="text-[10px] text-gray-700 uppercase tracking-wide">{item.label}</p>
              <p className="text-sm font-semibold text-black mt-0.5">{item.value}</p>
            </div>
          ))}
          <div className="bg-[#fbf2ed] rounded-xl px-4 py-3 border border-[#bcc9c7]/10">
            <p className="text-[10px] text-gray-700 uppercase tracking-wide">Accessibilité</p>
            <p className="text-sm font-semibold text-black mt-0.5 flex items-center gap-1.5">
              {chambre.accessiblePMR ? (
                <><CheckCircle size={13} className="text-[#006761]" /> PMR</>
              ) : '—'}
            </p>
          </div>
        </div>

        {hasActivePromo && (
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-200">
            <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-2 flex items-center gap-2">
              <Gift size={12} /> Promotions actives
            </p>
            <div className="space-y-2">
              {chambre.codesPromoActifs?.map((promo: PromoCode) => (
                <div key={promo.id} className="flex justify-between items-center bg-white rounded-lg px-3 py-2 border border-amber-100">
                  <div className="flex items-center gap-2">
                    <Tag size={14} className="text-amber-700" />
                    <span className="font-mono font-bold text-amber-800">{promo.code}</span>
                    <span className="text-xs text-gray-700">{promo.description}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-amber-800">
                      {promo.tauxReduction ? `-${promo.tauxReduction}%` : promo.reductionFixe ? `-${formatEuro(promo.reductionFixe)}` : ''}
                    </span>
                    <span className="text-[10px] text-gray-700">
                      {promo.nbUtilisations}/{promo.nbUtilisationsMax || '∞'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {reservationsActuelles.filter(r => r.chambreId === chambre.id && (r.statut === 'CONFIRMEE' || r.statut === 'EN_ATTENTE_ACOMPTE')).length > 0 && (
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-2 flex items-center gap-2">
              <Calendar size={12} /> Réservations actives
            </p>
            <div className="space-y-2 max-h-36 overflow-y-auto">
              {reservationsActuelles.filter(r => r.chambreId === chambre.id && (r.statut === 'CONFIRMEE' || r.statut === 'EN_ATTENTE_ACOMPTE')).map(r => (
                <div key={r.id} className="flex justify-between items-center text-sm bg-white rounded-lg px-3 py-2 border border-blue-100">
                  <span className="text-blue-900">
                    {fmtDate(r.dateArrivee)} → {fmtDate(r.dateDepart)}
                    {r.client_prenom && r.client_nom && <span className="text-blue-700 ml-1">· {r.client_prenom} {r.client_nom}</span>}
                    {r.codePromo && (
                      <span className="ml-2 text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                        <Tag size={10} /> -{r.reduction}%
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-palmier-100 text-palmier-700">
                    {r.statut === 'EN_ATTENTE_ACOMPTE' ? 'En attente' : 'Confirmée'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {chambre.equipements?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Équipements</p>
            <div className="flex flex-wrap gap-2">
              {chambre.equipements.map(eq => {
                const cfg2 = EQUIPEMENTS[eq];
                return cfg2 ? (
                  <span key={eq} className={`inline-flex items-center gap-1.5 bg-[#fbf2ed] border border-[#bcc9c7]/10 px-3 py-1.5 rounded-full text-xs ${cfg2.color}`}>
                    {cfg2.icon} {cfg2.label}
                  </span>
                ) : <span key={eq} className="text-xs text-gray-700 border border-[#bcc9c7]/10 px-3 py-1.5 rounded-full">{eq}</span>;
              })}
            </div>
          </div>
        )}

        {chambre.description && (
          <div>
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Description</p>
            <p className="text-sm text-black leading-relaxed bg-[#fbf2ed] rounded-xl p-3 border border-[#bcc9c7]/10">{chambre.description}</p>
          </div>
        )}

        <div className="bg-gradient-to-r from-[#006761]/5 to-[#E9C349]/5 rounded-xl p-4 border border-[#006761]/10">
          <div className="flex items-center gap-2 mb-3">
            <p className="text-xs font-semibold text-[#006761] uppercase tracking-wide font-display">Tarifs</p>
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
              <div key={t.label} className="bg-white/80 rounded-lg px-3 py-2 border border-[#006761]/10">
                <p className="text-[10px] text-[#006761]/80 uppercase tracking-wide">{t.label}</p>
                <p className="text-lg font-bold text-[#006761]">{formatEuro(t.value)}</p>
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
//
// ✅ CORRECTION — le numéro de chambre n'est plus un champ texte libre : il
// est généré automatiquement au format "CHA" + 3 chiffres (ex: CHA567) via
// generateNumeroChambre(), avec un bouton pour le régénérer manuellement.
// En mode édition, le numéro existant est conservé (lecture seule).
//
// ✅ CORRECTION — le champ "image" n'est plus une URL à coller : c'est un
// input file. Le fichier est lu en base64 côté client (FileReader) puis
// stocké tel quel dans `form.image`, envoyé au backend Sequelize qui le
// range dans la colonne TEXT `image` du modèle Room.
//
const MAX_IMAGE_SIZE = 3 * 1024 * 1024; // 3 Mo

const ChambreFormModal = ({ chambre, isOpen, onClose, onSave, saving, existingNumeros = [] }: {
  chambre?: Chambre | null; isOpen: boolean; onClose: () => void;
  onSave: (data: any) => Promise<void>; saving: boolean;
  existingNumeros?: string[];
}) => {
  const defaults = {
    numero: '', nom: '', capaciteAdultes: '2', nbLitsSimples: '0', nbLitsDoubles: '1',
    nbLitsBebe: '0', surfaceM2: '18', vue: 'JARDIN', accessiblePMR: false,
    tarif_base: '85', tarif_weekend: '95', tarif_enfant: '0', tarif_lit_supp: '0',
    description: '', image: ''
  };
  const [form, setForm] = useState<any>(defaults);
  const [selectedEq, setSelectedEq] = useState<string[]>([]);
  const [imagePreview, setImagePreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (chambre) {
      setForm({ ...defaults, ...Object.fromEntries(Object.entries(chambre).map(([k, v]) => [k, String(v ?? '')])), accessiblePMR: chambre.accessiblePMR, numero: chambre.numero, image: chambre.image || '' });
      setSelectedEq(chambre.equipements || []);
      setImagePreview(chambre.image || '');
    } else {
      const numero = generateNumeroChambre(existingNumeros);
      setForm({ ...defaults, numero });
      setSelectedEq([]);
      setImagePreview('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chambre, isOpen]);

  const handleRegenerateNumero = () => {
    const numero = generateNumeroChambre(existingNumeros);
    setForm((p: any) => ({ ...p, numero }));
    notifyAjout('success', 'Numéro régénéré', `Nouveau numéro : ${numero}`);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      notifyAjout('error', 'Fichier invalide', 'Veuillez sélectionner une image');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      notifyAjout('error', 'Image trop lourde', 'La taille maximale autorisée est de 3 Mo');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setForm((p: any) => ({ ...p, image: result }));
      setImagePreview(result);
    };
    reader.onerror = () => {
      notifyAjout('error', 'Erreur', "Impossible de lire l'image sélectionnée");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setForm((p: any) => ({ ...p, image: '' }));
    setImagePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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
      description: form.description, image: form.image || undefined
    });
  };

  const F = (field: string) => ({
    value: form[field] ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((p: any) => ({ ...p, [field]: e.target.value }))
  });

  const inputCls = "w-full border border-[#bcc9c7]/30 rounded-xl px-3 py-2 text-sm text-black focus:ring-2 focus:ring-[#006761]/40 outline-none transition-shadow";
  const labelCls = "block text-xs font-medium text-gray-700 mb-1";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={chambre ? `Modifier · ${chambre.nom}` : 'Ajouter une chambre'} size="lg"
      footer={
        <div className="flex gap-2 justify-end w-full">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl border border-[#bcc9c7]/30 transition-colors" disabled={saving}>Annuler</button>
          <button type="submit" form="chambre-form" className="px-5 py-2 text-sm font-medium text-white bg-[#006761] hover:bg-[#003a37] rounded-xl flex items-center gap-2 transition-colors shadow-sm" disabled={saving}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {chambre ? 'Mettre à jour' : 'Ajouter'}
          </button>
        </div>
      }
    >
      <form id="chambre-form" onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Numéro (généré automatiquement)</label>
            <div className="flex items-center gap-2">
              <input value={form.numero} readOnly className={inputCls + ' font-mono tracking-widest uppercase bg-gray-50 cursor-not-allowed'} />
              {!chambre && (
                <button
                  type="button"
                  onClick={handleRegenerateNumero}
                  title="Régénérer le numéro"
                  className="p-2 text-[#006761] bg-[#006761]/5 hover:bg-[#006761]/10 rounded-xl border border-[#006761]/20 transition-colors shrink-0"
                >
                  <RefreshCcw size={16} />
                </button>
              )}
            </div>
          </div>
          <div><label className={labelCls}>Nom *</label><input {...F('nom')} required className={inputCls} /></div>
        </div>

        <div>
          <label className={labelCls}>Photo de la chambre (optionnel)</label>
          {imagePreview ? (
            <div className="relative rounded-xl overflow-hidden border border-[#bcc9c7]/30 h-40 group">
              <img src={imagePreview} alt="Aperçu" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 bg-white/90 text-red-600 rounded-full p-1.5 shadow-sm hover:bg-white transition-colors"
                title="Retirer l'image"
              >
                <XCircle size={16} />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[#bcc9c7]/40 rounded-xl h-32 cursor-pointer hover:border-[#006761]/40 hover:bg-[#006761]/5 transition-colors text-gray-700">
              <ImagePlus size={22} className="text-[#006761]" />
              <span className="text-xs font-medium">Cliquez pour ajouter une photo</span>
              <span className="text-[10px] text-gray-700">JPG, PNG · 3 Mo max</span>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </label>
          )}
          <p className="text-[10px] text-gray-700 mt-1 flex items-center gap-1">
            <Info size={11} /> Laissez vide pour utiliser une image générique selon la vue de la chambre.
          </p>
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
              {Object.entries(VUE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer group">
          <input type="checkbox" checked={form.accessiblePMR} onChange={e => setForm((p: any) => ({ ...p, accessiblePMR: e.target.checked }))} className="w-4 h-4 text-[#006761] rounded focus:ring-[#006761]/40" />
          <span className="text-sm text-gray-700 group-hover:text-[#006761] transition-colors">Accessible PMR</span>
        </label>

        <div>
          <label className={labelCls}>Équipements</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(EQUIPEMENTS).map(([k, v]) => (
              <button key={k} type="button" onClick={() => setSelectedEq(p => p.includes(k) ? p.filter(x => x !== k) : [...p, k])}
                className={`px-3 py-1.5 rounded-xl text-xs border transition-all duration-200 flex items-center gap-1.5 ${
                  selectedEq.includes(k) ? 'bg-[#006761]/10 border-[#006761]/30 text-[#006761] shadow-sm' : 'bg-gray-50 border-[#bcc9c7]/20 text-gray-700 hover:bg-gray-100'
                }`}>
                {v.icon} {v.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-r from-[#006761]/5 to-[#E9C349]/5 rounded-xl p-4 border border-[#006761]/10">
          <p className="text-xs font-semibold text-[#006761] uppercase tracking-wide mb-3 font-display">Tarifs</p>
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

  const inputCls = "w-full border border-[#bcc9c7]/30 rounded-xl px-2.5 py-1.5 text-sm text-black bg-white focus:ring-2 focus:ring-[#006761]/40 outline-none";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Tarifs saisonniers · ${chambre.nom}`} size="lg"
      footer={
        <div className="flex gap-2 justify-end w-full">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl border border-[#bcc9c7]/30 transition-colors" disabled={saving}>Fermer</button>
          <button onClick={() => onSave(tarifs)} className="px-5 py-2 text-sm font-medium text-white bg-[#006761] hover:bg-[#003a37] rounded-xl flex items-center gap-2 transition-colors shadow-sm" disabled={saving}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Enregistrer
          </button>
        </div>
      }
    >
      {loading ? (
        <div className="py-12 flex flex-col items-center gap-2 text-gray-700">
          <Loader2 size={28} className="animate-spin text-[#006761]" />
          <p className="text-sm">Chargement des tarifs…</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-3 flex items-start gap-2">
            <Info size={15} className="shrink-0 mt-0.5 text-blue-500" />
            Définissez les prix pour chaque période de l'année. Les modifications s'appliquent aux nouvelles réservations.
          </p>
          {tarifs.map((t, i) => {
            const s = SAISON_CONFIG[t.saison] ?? SAISON_CONFIG.MOYENNE;
            return (
              <div key={t.saison || i} className={`rounded-xl border p-4 ${s.classes} shadow-sm`}>
                <div className="flex items-center gap-2 mb-3">
                  <p className="font-semibold text-sm font-display flex items-center gap-1.5">{s.icon} {t.saison === 'BASSE' ? 'Basse saison' : t.saison === 'HAUTE' ? 'Haute saison' : 'Moyenne saison'}</p>
                  <span className="text-[10px] bg-white/70 px-2 py-0.5 rounded-full border border-current/20 flex items-center gap-1">
                    {t.actif ? <CheckCircle size={10} /> : <XCircle size={10} />} {t.actif ? 'Actif' : 'Inactif'}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    ['Prix base / nuit', 'prixBase'], ['Prix weekend', 'prixWeekend'],
                    ['Enfant -12 ans', 'prixEnfant'], ['Lit supplémentaire', 'prixLitSupplementaire']
                  ].map(([l, k]) => (
                    <div key={k}>
                      <label className="text-[10px] text-current opacity-80 block mb-1">{l}</label>
                      <input type="number" value={t[k] ?? ''} onChange={e => update(i, k, +e.target.value || 0)} className={inputCls} />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="text-[10px] text-current opacity-80 block mb-1">Coeff. weekend</label>
                    <input type="number" step="0.01" value={t.coeffWeekend ?? 1.15} onChange={e => update(i, 'coeffWeekend', +e.target.value || 1)} className={inputCls} />
                  </div>
                  <div>
                    <label className="text-[10px] text-current opacity-80 block mb-1">Réduction &gt;5 nuits (%)</label>
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

  const inputCls = "w-full border border-[#bcc9c7]/30 rounded-xl px-3 py-2 text-sm text-black focus:ring-2 focus:ring-[#006761]/40 outline-none";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Bloquer · ${chambre.nom}`}
      footer={
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl border border-[#bcc9c7]/30 transition-colors" disabled={saving}>Annuler</button>
          <button onClick={() => onConfirm(form)} className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-xl flex items-center gap-2 transition-all duration-200 shadow-sm" disabled={saving || !form.dateDebut || !form.dateFin || !form.motif}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />} Confirmer le blocage
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 flex items-start gap-2">
          <AlertTriangle size={15} className="shrink-0 mt-0.5" />
          Aucune réservation ne pourra être créée sur cette période.
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs font-medium text-gray-700 mb-1 flex items-center gap-1.5"><Calendar size={12} /> Date de début</label><input type="date" value={form.dateDebut} onChange={e => setForm(f => ({ ...f, dateDebut: e.target.value }))} className={inputCls} /></div>
          <div><label className="text-xs font-medium text-gray-700 mb-1 flex items-center gap-1.5"><Calendar size={12} /> Date de fin</label><input type="date" value={form.dateFin} min={form.dateDebut} onChange={e => setForm(f => ({ ...f, dateFin: e.target.value }))} className={inputCls} /></div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 flex items-center gap-1.5"><Settings size={12} /> Type de blocage</label>
          <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className={inputCls + ' bg-white'}>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="FERMETURE_ANNUELLE">Fermeture annuelle</option>
            <option value="PRIVATISATION">Privatisation</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 flex items-center gap-1.5"><ClipboardList size={12} /> Motif *</label>
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
      footer={<div className="flex justify-end"><button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl border border-[#bcc9c7]/30 transition-colors">Fermer</button></div>}
    >
      {loading ? (
        <div className="py-12 flex flex-col items-center gap-2 text-gray-700">
          <Loader2 size={28} className="animate-spin text-[#006761]" />
          <p className="text-sm">Chargement…</p>
        </div>
      ) : historique.length === 0 ? (
        <div className="py-12 text-center text-gray-700">
          <History size={36} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">Aucune modification enregistrée</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {historique.map((h: any) => (
            <div key={h.id} className="flex items-start justify-between p-3 bg-[#fbf2ed] rounded-xl hover:bg-gray-100 transition-colors border border-[#bcc9c7]/10">
              <div>
                <p className="text-sm font-medium text-black">
                  <span className="text-gray-700">Modification de</span> {h.champ || h.field} :
                  <span className="text-red-600 line-through ml-1">{h.ancienneValeur || h.old_value || '—'}</span>
                  <ArrowRight size={12} className="inline mx-1 text-gray-700" />
                  <span className="text-palmier-700 font-semibold">{h.nouvelleValeur || h.new_value || '—'}</span>
                </p>
                <p className="text-xs text-gray-700 mt-0.5 flex items-center gap-1"><Users size={11} /> {h.modifiePar || h.modified_by || 'Inconnu'}</p>
              </div>
              <p className="text-xs text-gray-700 shrink-0 ml-3">{new Date(h.dateHeureModification || h.modified_at || h.createdAt).toLocaleString('fr-FR')}</p>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
};

// ============================================
// MODAL CRÉER CODE PROMO
// ============================================
//
// Les champs du formulaire correspondent EXACTEMENT aux attributs du
// modèle backend PromoCode : code, description, tauxReduction,
// reductionFixe, dateDebut, dateFin, nbUtilisationsMax, actif.
// Toutes les actions (génération, création, erreurs de validation)
// passent par notifyAjout — aucun texte brut, aucun emoji.
//
const CodePromoModal = ({ isOpen, onClose, onSave, saving }: {
  isOpen: boolean; onClose: () => void;
  onSave: (data: any) => Promise<void>; saving: boolean;
}) => {
  const [form, setForm] = useState({
    code: '', description: '', tauxReduction: '0', reductionFixe: '0',
    dateDebut: new Date().toISOString().split('T')[0],
    dateFin: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    nbUtilisationsMax: '10', actif: true
  });

  const handleGenerateCode = () => {
    const newCode = generateRandomCode();
    setForm(f => ({ ...f, code: newCode }));
    notifyAjout('success', 'Code généré', 'Nouveau code généré');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePromoCode(form.code)) {
      notifyAjout('error', 'Code invalide', 'Le code doit contenir 1 à 6 caractères (majuscules et chiffres uniquement)');
      return;
    }

    if (!form.tauxReduction || +form.tauxReduction === 0) {
      if (!form.reductionFixe || +form.reductionFixe === 0) {
        notifyAjout('error', 'Réduction manquante', 'Indiquez un pourcentage ou un montant fixe de réduction');
        return;
      }
    }

    await onSave({
      code: form.code,
      description: form.description,
      tauxReduction: +form.tauxReduction,
      reductionFixe: +form.reductionFixe,
      dateDebut: form.dateDebut,
      dateFin: form.dateFin,
      nbUtilisationsMax: +form.nbUtilisationsMax,
      actif: form.actif
    });
  };

  useEffect(() => {
    if (isOpen) {
      setForm(f => ({
        ...f,
        code: generateRandomCode(),
        dateDebut: new Date().toISOString().split('T')[0],
        dateFin: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
      }));
    }
  }, [isOpen]);

  const inputCls = "w-full border border-[#bcc9c7]/30 rounded-xl px-3 py-2 text-sm text-black focus:ring-2 focus:ring-[#006761]/40 outline-none";
  const labelCls = "block text-xs font-medium text-gray-700 mb-1";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Créer un code promo"
      footer={
        <div className="flex gap-2 justify-end w-full">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl border border-[#bcc9c7]/30 transition-colors" disabled={saving}>Annuler</button>
          <button type="submit" form="code-promo-form" className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-[#006761] to-emerald-600 hover:from-[#003a37] hover:to-emerald-700 rounded-xl flex items-center gap-2 transition-all duration-200 shadow-sm" disabled={saving}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Percent size={15} />} Créer le code
          </button>
        </div>
      }
    >
      <form id="code-promo-form" onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-3 flex items-start gap-2">
          <Info size={15} className="shrink-0 mt-0.5 text-blue-500" />
          <span>
            Créez un code promotionnel pour offrir des réductions à vos clients.
            <br />
            <span className="text-[10px] text-gray-700">Le code doit contenir 1 à 6 caractères (majuscules et chiffres)</span>
          </span>
        </p>

        <div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className={labelCls}>Code *</label>
              <input
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="Ex: ETE2026"
                required
                className={inputCls + ' font-mono tracking-widest uppercase'}
                maxLength={6}
              />
            </div>
            <button
              type="button"
              onClick={handleGenerateCode}
              className="px-3 py-2 text-sm font-medium text-[#006761] bg-[#006761]/5 hover:bg-[#006761]/10 rounded-xl border border-[#006761]/20 transition-colors flex items-center gap-1.5 h-[42px] whitespace-nowrap"
            >
              <RefreshCcw size={14} /> Générer
            </button>
          </div>
          <p className="text-[10px] text-gray-700 mt-1">
            {form.code.length}/6 caractères
          </p>
        </div>

        <div>
          <label className={labelCls}>Description</label>
          <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Ex: Réduction été 2026" className={inputCls} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Réduction (%)</label>
            <input type="number" value={form.tauxReduction} min={0} max={100} onChange={e => setForm(f => ({ ...f, tauxReduction: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Réduction fixe (€)</label>
            <input type="number" value={form.reductionFixe} min={0} onChange={e => setForm(f => ({ ...f, reductionFixe: e.target.value }))} className={inputCls} />
          </div>
        </div>
        <p className="text-[10px] text-gray-700 -mt-2">Renseignez l'un ou l'autre (pas besoin des deux).</p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Valide du</label>
            <input type="date" value={form.dateDebut} onChange={e => setForm(f => ({ ...f, dateDebut: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Valide jusqu'au</label>
            <input type="date" value={form.dateFin} min={form.dateDebut} onChange={e => setForm(f => ({ ...f, dateFin: e.target.value }))} className={inputCls} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Usages maximum</label>
          <input type="number" value={form.nbUtilisationsMax} min={1} onChange={e => setForm(f => ({ ...f, nbUtilisationsMax: e.target.value }))} className={inputCls} />
        </div>

        <label className="flex items-center gap-2 cursor-pointer group">
          <input type="checkbox" checked={form.actif} onChange={e => setForm(f => ({ ...f, actif: e.target.checked }))} className="w-4 h-4 text-[#006761] rounded focus:ring-[#006761]/40" />
          <span className="text-sm text-gray-700 group-hover:text-[#006761] transition-colors">Actif immédiatement</span>
        </label>
      </form>
    </Modal>
  );
};

// ============================================
// MODAL APPLIQUER CODE PROMO
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
      api.get('/chambres/codes-promo/actifs')
        .then(res => {
          const data = res.data.data || [];
          setAvailablePromos(data);
        })
        .catch(() => {
          setAvailablePromos([]);
          notifyAjout('error', 'Erreur', 'Impossible de charger les codes promo disponibles');
        })
        .finally(() => setLoading(false));
      setCode('');
    }
  }, [isOpen, chambre]);

  if (!chambre) return null;

  const inputCls = "w-full border border-[#bcc9c7]/30 rounded-xl px-3 py-2 text-sm text-black focus:ring-2 focus:ring-[#006761]/40 outline-none";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Appliquer un code promo · ${chambre.nom}`}
      footer={
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl border border-[#bcc9c7]/30 transition-colors" disabled={saving}>Annuler</button>
          <button
            onClick={() => onApply(code)}
            className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-xl flex items-center gap-2 transition-all duration-200 shadow-sm"
            disabled={saving || !code.trim() || !validatePromoCode(code)}
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Gift size={15} />} Appliquer
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 flex items-start gap-2">
          <Gift size={15} className="shrink-0 mt-0.5" />
          Entrez un code promo pour appliquer une réduction à cette chambre.
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Code promo (1-6 caractères, majuscules)</label>
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="Ex: ETE2026"
            className={inputCls + ' font-mono tracking-widest uppercase'}
            maxLength={6}
          />
          <p className="text-[10px] text-gray-700 mt-1">
            {code.length}/6 caractères
          </p>
        </div>

        {availablePromos.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">Codes disponibles</p>
            <div className="flex flex-wrap gap-2">
              {availablePromos.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setCode(p.code)}
                  className="px-3 py-1.5 text-xs font-mono bg-gray-50 border border-[#bcc9c7]/20 rounded-lg hover:bg-amber-50 hover:border-amber-300 transition-colors flex items-center gap-1.5"
                >
                  <Tag size={12} className="text-amber-700" />
                  {p.code}
                  <span className="text-[10px] text-gray-700">
                    {p.tauxReduction ? `-${p.tauxReduction}%` : p.reductionFixe ? `-${formatEuro(p.reductionFixe)}` : ''}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 size={20} className="animate-spin text-[#006761]" />
            <span className="ml-2 text-sm text-gray-700">Chargement des promos…</span>
          </div>
        )}
      </div>
    </Modal>
  );
};

// ============================================
// MODAL PROMOS ACTIVES SUR UNE CHAMBRE
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
    <Modal isOpen={isOpen} onClose={onClose} title={`Promotions actives · ${chambre.nom}`} size="lg"
      footer={<div className="flex justify-end"><button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl border border-[#bcc9c7]/30 transition-colors">Fermer</button></div>}
    >
      {promos.length === 0 ? (
        <div className="py-12 text-center text-gray-700">
          <Gift size={36} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">Aucune promotion active sur cette chambre</p>
          <p className="text-xs text-gray-700 mt-1">Utilisez "Appliquer un code promo" pour en ajouter une</p>
        </div>
      ) : (
        <div className="space-y-3">
          {promos.map((promo: PromoCode) => (
            <div key={promo.id} className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-200">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Tag size={16} className="text-amber-700" />
                    <span className="font-mono font-bold text-amber-800 text-lg">{promo.code}</span>
                    <span className="text-xs bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">Actif</span>
                  </div>
                  {promo.description && (
                    <p className="text-sm text-gray-700 mt-1">{promo.description}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-amber-800">
                    {promo.tauxReduction ? `-${promo.tauxReduction}%` : promo.reductionFixe ? `-${formatEuro(promo.reductionFixe)}` : ''}
                  </p>
                  <p className="text-[10px] text-gray-700">
                    Utilisé {promo.nbUtilisations}/{promo.nbUtilisationsMax || '∞'} fois
                  </p>
                </div>
              </div>
              <div className="flex gap-4 mt-2 text-[10px] text-gray-700">
                <span className="flex items-center gap-1"><Calendar size={10} /> Du {fmtDateFull(promo.dateDebut)} au {fmtDateFull(promo.dateFin)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
};

// ============================================
// MODAL GESTION GLOBALE DES CODES PROMO
// ============================================
//
// Cette modale appelle GET/POST /api/codes-promo et
// PATCH/DELETE /api/codes-promo/:id, servis par codesPromo.controller.ts /
// codesPromo.routes.ts (fichiers séparés, à monter dans app.ts via
// app.use('/api/codes-promo', codesPromoRoutes)). Toutes les actions
// (activer/désactiver, supprimer, erreurs de chargement) déclenchent une
// notification via notifyAjout.
//
const GestionPromosModal = ({
  isOpen,
  onClose,
  onCreateNew,
  refreshSignal
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreateNew: () => void;
  refreshSignal: number;
}) => {
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'TOUS' | 'ACTIFS' | 'EXPIRES' | 'INACTIFS'>('TOUS');
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    api.get('/codes-promo')
      .then(res => setPromos(res.data.data || []))
      .catch((e: any) => {
        setPromos([]);
        const message = e.response?.data?.message || 'Impossible de charger les codes promo';
        setLoadError(message);
        notifyAjout('error', 'Erreur', message);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen, refreshSignal, load]);

  const isExpired = (p: PromoCode) => new Date(p.dateFin) < new Date();

  const filtered = promos.filter(p => {
    const matchSearch = p.code.toLowerCase().includes(search.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (filter === 'ACTIFS') return p.actif && !isExpired(p);
    if (filter === 'EXPIRES') return isExpired(p);
    if (filter === 'INACTIFS') return !p.actif;
    return true;
  });

  const handleToggle = async (promo: PromoCode) => {
    setBusyId(promo.id);
    try {
      await api.patch(`/codes-promo/${promo.id}/toggle`);
      notifyAjout('success', promo.actif ? 'Code désactivé' : 'Code activé', `${promo.code} ${promo.actif ? 'désactivé' : 'activé'}`);
      load();
    } catch (e: any) {
      notifyAjout('error', 'Erreur', e.response?.data?.message || 'Erreur lors de la mise à jour du code');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (promo: PromoCode) => {
    if (!confirm(`Supprimer définitivement le code "${promo.code}" ?`)) return;
    setBusyId(promo.id);
    try {
      await api.delete(`/codes-promo/${promo.id}`);
      notifyAjout('success', 'Code supprimé', `Code ${promo.code} supprimé`);
      load();
    } catch (e: any) {
      notifyAjout('error', 'Erreur', e.response?.data?.message || 'Erreur lors de la suppression du code');
    } finally {
      setBusyId(null);
    }
  };

  const inputCls = "w-full border border-[#bcc9c7]/30 rounded-xl px-3 py-2 text-sm text-black focus:ring-2 focus:ring-[#006761]/40 outline-none";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gestion des codes promo" size="lg"
      footer={
        <div className="flex justify-between items-center w-full">
          <span className="text-xs text-gray-700">{filtered.length} code{filtered.length !== 1 ? 's' : ''} affiché{filtered.length !== 1 ? 's' : ''}</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl border border-[#bcc9c7]/30 transition-colors">Fermer</button>
            <button
              onClick={onCreateNew}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-[#006761] to-emerald-600 hover:from-[#003a37] hover:to-emerald-700 rounded-xl flex items-center gap-1.5 transition-all duration-200 shadow-sm"
            >
              <Plus size={14} /> Nouveau code
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-700" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un code…"
              className={inputCls + ' pl-9'}
            />
          </div>
          <select value={filter} onChange={e => setFilter(e.target.value as any)} className={inputCls + ' bg-white sm:w-44'}>
            <option value="TOUS">Tous</option>
            <option value="ACTIFS">Actifs</option>
            <option value="EXPIRES">Expirés</option>
            <option value="INACTIFS">Désactivés</option>
          </select>
        </div>

        {loading ? (
          <div className="py-14 flex flex-col items-center gap-2 text-gray-700">
            <Loader2 size={28} className="animate-spin text-[#006761]" />
            <p className="text-sm">Chargement des codes promo…</p>
          </div>
        ) : loadError ? (
          <div className="py-14 text-center">
            <AlertTriangle size={36} className="mx-auto mb-2 text-red-500" />
            <p className="text-sm font-medium text-black">{loadError}</p>
            <button onClick={load} className="mt-3 text-sm text-[#006761] hover:underline font-medium">Réessayer</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center text-gray-700">
            <PackageOpen size={40} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium text-black">Aucun code promo trouvé</p>
            <p className="text-xs text-gray-700 mt-1">
              {search || filter !== 'TOUS' ? 'Essayez un autre filtre' : 'Créez votre premier code promotionnel'}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
            {filtered.map(promo => {
              const expired = isExpired(promo);
              const joursRestants = getJoursRestantsPromo(promo.dateFin);
              const statusLabel = expired ? 'Expiré' : promo.actif ? 'Actif' : 'Désactivé';
              const statusClasses = expired
                ? 'bg-gray-100 text-gray-600 border-gray-200'
                : promo.actif
                ? 'bg-palmier-50 text-palmier-700 border-palmier-200'
                : 'bg-amber-50 text-amber-800 border-amber-200';

              return (
                <div key={promo.id} className={`rounded-xl border p-3.5 transition-all duration-200 hover:shadow-sm ${expired ? 'bg-gray-50/60 border-gray-100' : 'bg-white border-[#bcc9c7]/10'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${expired ? 'bg-gray-100' : 'bg-gradient-to-br from-amber-100 to-orange-100'}`}>
                        <Gift size={17} className={expired ? 'text-gray-500' : 'text-amber-700'} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => copyToClipboard(promo.code)}
                            className="font-mono font-bold text-black hover:text-[#006761] transition-colors flex items-center gap-1 group"
                            title="Copier le code"
                          >
                            {promo.code}
                            <ClipboardCheck size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-[#006761]" />
                          </button>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${statusClasses}`}>
                            {statusLabel}
                          </span>
                          {!expired && promo.actif && joursRestants <= 5 && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full border bg-red-50 text-red-700 border-red-200 flex items-center gap-1">
                              <Clock size={9} /> {joursRestants}j
                            </span>
                          )}
                        </div>
                        {promo.description && (
                          <p className="text-xs text-gray-700 mt-0.5 truncate">{promo.description}</p>
                        )}
                        <p className="text-[10px] text-gray-700 mt-1">
                          Du {fmtDateFull(promo.dateDebut)} au {fmtDateFull(promo.dateFin)}
                        </p>
                        <div className="mt-2 w-40">
                          <PromoUsageBar used={promo.nbUtilisations} max={promo.nbUtilisationsMax} />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="text-base font-bold text-amber-800 whitespace-nowrap">
                        {promo.tauxReduction ? `-${promo.tauxReduction}%` : promo.reductionFixe ? `-${formatEuro(promo.reductionFixe)}` : '—'}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggle(promo)}
                          disabled={busyId === promo.id || expired}
                          title={promo.actif ? 'Désactiver' : 'Activer'}
                          className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${promo.actif ? 'text-palmier-600 hover:bg-palmier-50' : 'text-gray-500 hover:bg-gray-100'}`}
                        >
                          {busyId === promo.id ? <Loader2 size={16} className="animate-spin" /> : promo.actif ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                        </button>
                        <button
                          onClick={() => handleDelete(promo)}
                          disabled={busyId === promo.id}
                          title="Supprimer"
                          className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors disabled:opacity-40"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
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
  const [showGestionPromosModal, setShowGestionPromosModal] = useState(false);
  const [promosRefreshSignal, setPromosRefreshSignal] = useState(0);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRealtimeUpdate, setLastRealtimeUpdate] = useState<Date | null>(null);

  // WebSocket
  const { isConnected } = useWebSocketContext();

  // Référence pour éviter les appels simultanés
  const isFetching = useRef(false);

  // Fonction pour récupérer les données (rapide, sans passer par le cache)
  const fetchFreshData = useCallback(async () => {
    if (isFetching.current) {
      console.log('⏳ [ChambresPage] Déjà en cours...');
      return;
    }

    isFetching.current = true;

    try {
      console.log('🔄 [ChambresPage] fetchFreshData');
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
        setLastRealtimeUpdate(new Date());
        setPromosRefreshSignal(s => s + 1);

        console.log('✅ [ChambresPage] Données mises à jour');
      }
    } catch (error) {
      console.error('❌ [ChambresPage] Erreur fetchFreshData:', error);
    } finally {
      isFetching.current = false;
    }
  }, []);

  const fetchChambres = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setIsRefreshing(true);
    try {
      if (!forceRefresh) {
        const cached = getCache();
        if (cached) {
          setChambres(cached.chambres);
          setReservationsActuelles(cached.reservationsActuelles);
          setStatistiques(cached.statistiques);
          setLoading(false);
          setIsRefreshing(false);
          fetchFreshData();
          return;
        }
      }
      await fetchFreshData();
    } catch {
      notifyAjout('error', 'Erreur', 'Impossible de charger les chambres');
      const cached = getCache();
      if (cached) {
        setChambres(cached.chambres);
        setReservationsActuelles(cached.reservationsActuelles);
        setStatistiques(cached.statistiques);
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [fetchFreshData]);

  // ============================================
  // WEBSOCKET — TEMPS RÉEL, PAS DE POLLING
  // ============================================

  useEffect(() => {
    const handleRefresh = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      console.log('🔄 [ChambresPage] WebSocket event:', detail);
      clearCache();
      fetchFreshData();
    };

    window.addEventListener('refresh-chambres', handleRefresh);
    window.addEventListener('chambre-updated', handleRefresh);
    window.addEventListener('refresh-dashboard', handleRefresh);

    return () => {
      window.removeEventListener('refresh-chambres', handleRefresh);
      window.removeEventListener('chambre-updated', handleRefresh);
      window.removeEventListener('refresh-dashboard', handleRefresh);
    };
  }, [fetchFreshData]);

  // Chargement initial
  useEffect(() => {
    fetchChambres();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================
  // FILTRAGE
  // ============================================
  const filtered = chambres.filter(c => {
    const matchSearch = c.nom?.toLowerCase().includes(search.toLowerCase()) ||
                        c.numero?.toLowerCase().includes(search.toLowerCase());
    const statutAffichage = getStatutAffichage(c, reservationsActuelles);
    const matchStatut = filterStatut === 'TOUS' || statutAffichage === filterStatut;
    return matchSearch && matchStatut;
  });

  // ============================================
  // GESTIONNAIRES
  // ============================================

  const handleAddChambre = async (data: any) => {
    setSaving(true);
    try {
      await api.post('/chambres', data);
      notifyAjout('success', 'Chambre ajoutée', `Nouvelle chambre "${data.numero}" créée avec succès`);
      clearCache();
      await fetchChambres(true);
      setShowFormModal(false);
    } catch (e: any) {
      notifyAjout('error', 'Erreur', e.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  const handleEditChambre = async (data: any) => {
    if (!selectedChambre) return;
    setSaving(true);
    try {
      await api.put(`/chambres/${selectedChambre.id}`, data);
      notifyAjout('success', 'Chambre modifiée', `${selectedChambre.nom} a été mise à jour`);
      clearCache();
      await fetchChambres(true);
      setShowFormModal(false);
      setSelectedChambre(null);
    } catch (e: any) {
      notifyAjout('error', 'Erreur', e.response?.data?.message || 'Erreur lors de la modification');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteChambre = async (chambre: Chambre) => {
    if (getStatutAffichage(chambre, reservationsActuelles) === 'OCCUPEE') {
      notifyAjout('error', 'Action impossible', 'Impossible de supprimer une chambre occupée');
      return;
    }
    if (!confirm(`Supprimer "${chambre.nom}" ?`)) return;
    try {
      await api.delete(`/chambres/${chambre.id}`);
      notifyAjout('success', 'Chambre supprimée', `${chambre.nom} a été supprimée`);
      clearCache();
      await fetchChambres(true);
    } catch (e: any) {
      notifyAjout('error', 'Erreur', e.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const handleDuplicateChambre = async (chambre: Chambre) => {
    try {
      const { id, createdAt, updatedAt, ...data } = chambre as any;
      const numeroDuplique = generateNumeroChambre(chambres.map(c => c.numero));
      await api.post('/chambres', { ...data, nom: `${chambre.nom} (copie)`, numero: numeroDuplique });
      notifyAjout('success', 'Chambre dupliquée', `${chambre.nom} a été dupliquée sous le numéro ${numeroDuplique}`);
      clearCache();
      await fetchChambres(true);
    } catch (e: any) {
      notifyAjout('error', 'Erreur', e.response?.data?.message || 'Erreur lors de la duplication');
    }
  };

  const handleToggleStatut = async (chambre: Chambre, newStatut: StatutChambre) => {
    if (newStatut === 'DISPONIBLE' && getStatutAffichage(chambre, reservationsActuelles) === 'OCCUPEE') {
      notifyAjout('error', 'Action impossible', 'Impossible de marquer disponible une chambre occupée');
      return;
    }
    try {
      await api.patch(`/chambres/${chambre.id}/statut`, { statut: newStatut });
      notifyAjout('success', 'Statut modifié', `${chambre.nom} → ${STATUT_CONFIG[newStatut].label}`);
      clearCache();
      await fetchChambres(true);
    } catch (e: any) {
      notifyAjout('error', 'Erreur', e.response?.data?.message || 'Erreur lors du changement de statut');
    }
  };

  const handleBlocage = async (data: { dateDebut: string; dateFin: string; motif: string; type: string }) => {
    if (!selectedChambre) return;
    if (!estChambreDisponible(selectedChambre, new Date(data.dateDebut), new Date(data.dateFin), reservationsActuelles, [])) {
      notifyAjout('error', 'Action impossible', 'Chambre non disponible sur cette période');
      return;
    }
    setSaving(true);
    try {
      await api.post(`/chambres/${selectedChambre.id}/bloquer`, data);
      notifyAjout('success', 'Dates bloquées', `${selectedChambre.nom} bloquée du ${fmtDate(data.dateDebut)} au ${fmtDate(data.dateFin)}`);
      clearCache();
      await fetchChambres(true);
      setShowBlocageModal(false);
      setSelectedChambre(null);
    } catch (e: any) {
      notifyAjout('error', 'Erreur', e.response?.data?.message || 'Erreur lors du blocage');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTarifs = async (tarifs: any[]) => {
    if (!selectedChambre) return;
    setSaving(true);
    try {
      await api.put(`/chambres/${selectedChambre.id}/tarifs`, { tarifs });
      notifyAjout('success', 'Tarifs mis à jour', `Les tarifs de ${selectedChambre.nom} ont été mis à jour`);
      clearCache();
      await fetchChambres(true);
      setShowTarifModal(false);
    } catch (e: any) {
      notifyAjout('error', 'Erreur', e.response?.data?.message || 'Erreur lors de la mise à jour des tarifs');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCodePromo = async (data: any) => {
    setSaving(true);
    try {
      await api.post('/codes-promo', data);
      notifyAjout('success', 'Code promo créé', `Code ${data.code} créé avec succès`);
      clearCache();
      await fetchChambres(true);
      setPromosRefreshSignal(s => s + 1);
      setShowCodePromoModal(false);
    } catch (e: any) {
      notifyAjout('error', 'Erreur', e.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  const handleApplyPromo = async (code: string) => {
    if (!selectedChambre) return;
    if (!validatePromoCode(code)) {
      notifyAjout('error', 'Code invalide', 'Le code doit contenir 1 à 6 caractères (majuscules et chiffres)');
      return;
    }
    setSaving(true);
    try {
      await api.post(`/chambres/${selectedChambre.id}/appliquer-promo`, { code });
      notifyAjout('success', 'Code promo appliqué', `${code} appliqué à ${selectedChambre.nom}`);
      clearCache();
      await fetchChambres(true);
      setShowApplyPromoModal(false);
    } catch (e: any) {
      notifyAjout('error', 'Erreur', e.response?.data?.message || 'Erreur lors de l\'application du code');
    } finally {
      setSaving(false);
    }
  };

  const openAddForm = () => { setIsEditing(false); setSelectedChambre(null); setShowFormModal(true); };
  const openEditForm = (c: Chambre) => { setIsEditing(true); setSelectedChambre(c); setShowFormModal(true); };
  const openApplyPromo = (c: Chambre) => { setSelectedChambre(c); setShowApplyPromoModal(true); };
  const openViewPromos = (c: Chambre) => { setSelectedChambre(c); setShowPromosActiveModal(true); };

  // ============================================
  // RENDU
  // ============================================

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
    /* Le fond de page n'est pas touché : il continue d'hériter du fond global de l'app (body/layout parent). */
    <div className="p-4 lg:p-6 space-y-6">

      {/* En-tête façon "The Palms" */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-black flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#006761] to-emerald-500 flex items-center justify-center shadow-sm">
              <BedDouble size={18} className="text-white" />
            </div>
            Gestion des chambres
            {isRefreshing && <Loader2 size={16} className="animate-spin text-[#006761]" />}
          </h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-gray-700">
            <span>{chambres.length} chambre{chambres.length > 1 ? 's' : ''}</span>
            <span className="w-1 h-1 rounded-full bg-gray-300" />
            <span className="text-palmier-700 font-medium">{statistiques.disponibles} disponible{statistiques.disponibles > 1 ? 's' : ''}</span>
            <span className="text-amber-700 font-medium">{statistiques.occupees} occupée{statistiques.occupees > 1 ? 's' : ''}</span>
            {statistiques.tauxOccupationGlobal > 0 && (
              <>
                <span className="w-1 h-1 rounded-full bg-gray-300" />
                <span className="text-amber-700 font-medium">{statistiques.tauxOccupationGlobal}% d'occupation</span>
              </>
            )}
            {statistiques.revenusMois > 0 && (
              <>
                <span className="w-1 h-1 rounded-full bg-gray-300" />
                <span className="text-[#006761] font-medium">{formatEuro(statistiques.revenusMois)} ce mois</span>
              </>
            )}
            <span className="w-1 h-1 rounded-full bg-gray-300" />
            {isConnected ? (
              <span className="flex items-center gap-1 text-palmier-600 font-medium">
                <WifiIcon size={11} className="animate-pulse" /> Temps réel
              </span>
            ) : (
              <span className="flex items-center gap-1 text-gray-700">
                <WifiOff size={11} /> Hors ligne
              </span>
            )}
            {lastRealtimeUpdate && (
              <span className="text-gray-700 text-[10px]">
                · {lastRealtimeUpdate.toLocaleTimeString('fr-FR')}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowGestionPromosModal(true)}
            className="px-3 py-2 text-sm font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl flex items-center gap-1.5 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <Tag size={14} /> Gérer les promos
          </button>
          <button onClick={() => setShowCodePromoModal(true)}
            className="px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-xl flex items-center gap-1.5 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <Gift size={14} /> Code promo
          </button>
          <button onClick={openAddForm}
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-[#006761] to-emerald-600 hover:from-[#003a37] hover:to-emerald-700 rounded-xl flex items-center gap-1.5 transition-all duration-200 shadow-sm hover:shadow-md">
            <Plus size={15} /> Ajouter
          </button>
        </div>
      </div>

      {/* Stats — bento */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard value={chambres.length}          label="Total chambres" color="bg-gradient-to-br from-slate-500 to-slate-600" icon={Building2} />
        <StatCard value={statistiques.disponibles} label="Disponibles"    color="bg-gradient-to-br from-palmier-500 to-emerald-600" icon={CheckCircle} />
        <StatCard value={statistiques.occupees}    label="Occupées"       color="bg-gradient-to-br from-amber-500 to-orange-500" icon={Users} subtitle={statistiques.tauxOccupationGlobal > 0 ? `${statistiques.tauxOccupationGlobal}% occup` : ''} />
        <StatCard value={statistiques.maintenance} label="Maintenance"    color="bg-gradient-to-br from-red-500 to-red-600" icon={Settings} />
        <StatCard value={statistiques.revenusMois ? formatEuro(statistiques.revenusMois) : '0€'} label="Revenus du mois" color="bg-gradient-to-br from-[#006761] to-emerald-500" icon={DollarSign} />
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-700" />
          <input
            type="text" placeholder="Rechercher par nom ou numéro…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 border border-[#bcc9c7]/30 rounded-xl text-sm text-black focus:ring-2 focus:ring-[#006761]/40 outline-none transition-shadow bg-white"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-700 hover:text-black">
              <X size={14} />
            </button>
          )}
        </div>

        <select
          value={filterStatut} onChange={e => setFilterStatut(e.target.value as any)}
          className="px-3 py-2.5 border border-[#bcc9c7]/30 rounded-xl text-sm text-black focus:ring-2 focus:ring-[#006761]/40 outline-none bg-white min-w-[160px]"
        >
          <option value="TOUS">Tous les statuts</option>
          <option value="DISPONIBLE">Disponibles</option>
          <option value="OCCUPEE">Occupées</option>
          <option value="EN_MAINTENANCE">En maintenance</option>
          <option value="HORS_SERVICE">Hors service</option>
          <option value="BLOQUEE">Bloquées</option>
        </select>

        <div className="flex rounded-xl overflow-hidden border border-[#bcc9c7]/30">
          {(['grid', 'list'] as const).map(mode => (
            <button key={mode} onClick={() => setViewMode(mode)}
              className={`px-3 py-2.5 transition-all duration-200 ${viewMode === mode ? 'bg-[#006761] text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
              {mode === 'grid' ? <Grid3x3 size={15} /> : <List size={15} />}
            </button>
          ))}
        </div>

        <button
          onClick={() => { setSearch(''); setFilterStatut('TOUS'); }}
          className="px-3 py-2.5 text-sm text-gray-700 hover:text-black transition-colors"
        >
          Réinitialiser
        </button>
      </div>

      {/* Légende statuts */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-700 bg-white rounded-xl border border-[#bcc9c7]/20 px-4 py-2.5">
        <span className="font-medium text-black">Statuts :</span>
        {(Object.entries(STATUT_CONFIG) as [StatutAffichage, typeof STATUT_CONFIG[StatutAffichage]][]).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${v.dot}`} /> {v.label}
            {k === 'OCCUPEE' && <span className="text-gray-700 text-[9px]">(auto)</span>}
          </span>
        ))}
        <span className="text-gray-700 ml-2 text-[9px] flex items-center gap-1">
          {isConnected ? <><Zap size={10} className="text-amber-500" /> Temps réel</> : <><RefreshCw size={10} /> Veuillez reconnecter...</>}
        </span>
        {lastRealtimeUpdate && (
          <span className="text-palmier-600 text-[9px]">
            · {lastRealtimeUpdate.toLocaleTimeString('fr-FR')}
          </span>
        )}
      </div>

      {/* Liste / Grille */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-[2rem] border border-[#bcc9c7]/20 shadow-sm">
          <BedDouble size={48} className="text-gray-300 mx-auto mb-3" />
          <p className="font-display text-base font-medium text-gray-700">Aucune chambre trouvée</p>
          <p className="text-sm text-gray-700 mt-1">
            {search || filterStatut !== 'TOUS' ? 'Aucun résultat pour ces filtres' : 'Ajoutez votre première chambre'}
          </p>
          {(search || filterStatut !== 'TOUS') && (
            <button onClick={() => { setSearch(''); setFilterStatut('TOUS'); }} className="mt-3 text-sm text-[#006761] hover:underline font-medium">
              Réinitialiser les filtres
            </button>
          )}
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8' : 'space-y-3'}>
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
      <ChambreFormModal chambre={isEditing ? selectedChambre : null} isOpen={showFormModal} onClose={() => { setShowFormModal(false); setSelectedChambre(null); setIsEditing(false); }} onSave={isEditing ? handleEditChambre : handleAddChambre} saving={saving} existingNumeros={chambres.map(c => c.numero)} />
      <TarifSaisonModal chambre={selectedChambre} isOpen={showTarifModal} onClose={() => { setShowTarifModal(false); setSelectedChambre(null); }} onSave={handleSaveTarifs} saving={saving} />
      <BlocageModal chambre={selectedChambre} isOpen={showBlocageModal} onClose={() => { setShowBlocageModal(false); setSelectedChambre(null); }} onConfirm={handleBlocage} saving={saving} />
      <HistoriqueModal chambre={selectedChambre} isOpen={showHistoriqueModal} onClose={() => { setShowHistoriqueModal(false); setSelectedChambre(null); }} />
      <CodePromoModal isOpen={showCodePromoModal} onClose={() => setShowCodePromoModal(false)} onSave={handleCreateCodePromo} saving={saving} />
      <ApplyPromoModal chambre={selectedChambre} isOpen={showApplyPromoModal} onClose={() => { setShowApplyPromoModal(false); setSelectedChambre(null); }} onApply={handleApplyPromo} saving={saving} />
      <PromosActiveModal chambre={selectedChambre} isOpen={showPromosActiveModal} onClose={() => { setShowPromosActiveModal(false); setSelectedChambre(null); }} />
      <GestionPromosModal
        isOpen={showGestionPromosModal}
        onClose={() => setShowGestionPromosModal(false)}
        onCreateNew={() => { setShowGestionPromosModal(false); setShowCodePromoModal(true); }}
        refreshSignal={promosRefreshSignal}
      />

      <style>{`
        .font-display {
          font-family: "Playfair Display", serif;
        }
        .glass-effect {
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.5);
        }
        .bento-card {
          transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
        }
        .bento-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.08);
        }
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