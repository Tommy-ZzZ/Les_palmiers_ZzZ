// frontend/src/pages/ServicesAnnexesPage.tsx
// Module Services Annexes — §3.5 du cahier des charges (vélos, transferts, activités/guides)
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  Bike, Plus, Edit2, Trash2, Box, Clock, CheckCircle,
  XCircle, AlertCircle, RefreshCw, DollarSign, Percent,
  Plane, Navigation, Star, CircleDot, Loader2, Shield,
  Beer, Activity, CalendarClock,
  Search, X, User, Users, Mail, Phone,
  MapPin, Building, Calendar, Tag, Gift, Sparkles,
  Crown, Award, Medal, Trophy, Gem, Diamond,
  Zap, Rocket, Fire, Flame, Sun, Cloud, Snowflake,
  Palette, Layers, Grid, List, Filter, Settings, Eye,
  Euro, CreditCard, Wallet, Banknote, Coins, PiggyBank,
  TrendingUp, TrendingDown, BarChart3, PieChart, Lock, ArrowRight,
  Calendar as CalendarIcon
} from 'lucide-react';
import { formatDateTime, formatEuro } from '../utils/helpers';
import { useWebSocketContext } from '../context/WebSocketContext';
import { useAuth } from '../context/AuthContext';
import { notifyAjout } from '../components/ui/AjoutNotification';
import { clientService } from '../services/api';

// ============================================================
// TYPES — basés sur le diagramme de classes §3.5
// ============================================================

type TypeVelo = 'VTT' | 'VILLE' | 'ELECTRIQUE';
type EtatVelo = 'BON' | 'USAGE' | 'EN_REPARATION' | 'HORS_SERVICE';
type TypeService = 'LOCATION_VELO' | 'TRANSFERT_AEROPORT' | 'ACTIVITE_GUIDE';
type TypeTarification = 'HORAIRE' | 'JOURNALIERE';
type StatutLocation = 'EN_COURS' | 'TERMINEE' | 'ANNULEE';
type StatutTransfert = 'PLANIFIE' | 'REALISE' | 'ANNULE';
type SensTransfert = 'AEROPORT_VERS_GITE' | 'GITE_VERS_AEROPORT';
type TypeActivite = 'CANYONING' | 'RANDONNEE' | 'VISITE_DISTILLERIE' | 'AUTRE';
type EditorKind = TypeService | 'velo' | 'partenaire';

interface LocationEnCours {
  id: number;
  clientNom: string;
  clientPrenom: string;
  dateDebut: string;
  dateFin: string;
  reservationId: number;
}

interface ClientSimple {
  id: number;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  civilite: string;
  vip: boolean;
  statut: string;
  nb_sejours: number;
}

interface Velo {
  id: number;
  numero: string;
  type: TypeVelo;
  taille: string;
  etat: EtatVelo;
  prix: number;
  disponible: boolean;
  numero_serie?: string;
  date_creation: string;
  date_modification?: string;
  locationEnCours?: LocationEnCours | null;
}

interface LocationVelo {
  id: number;
  reservation_id: number;
  velo_id: number;
  date_debut: string;
  date_fin: string;
  type_tarification: TypeTarification;
  montant: number;
  statut: StatutLocation;
  velo?: Velo;
  client?: ClientSimple;
  reservation?: { id: number; client: { id: number; prenom: string; nom: string } };
}

interface TransfertAeroport {
  id: number;
  reservation_id: number;
  date_heure: string;
  sens: SensTransfert;
  numero_vol?: string;
  nb_personnes: number;
  nb_bagages: number;
  montant: number;
  statut: StatutTransfert;
  remarques?: string;
  reservation?: { id: number; client: { id: number; prenom: string; nom: string } };
  client?: ClientSimple;
  client_id?: number;
}

interface ActiviteGuide {
  id: number;
  nom_activite: string;
  nom_partenaire: string;
  type_activite: TypeActivite;
  duree_heures: number;
  tarif_client: number;
  commission_gite: number;
  description?: string;
  disponible: boolean;
  partenaire_id: number;
}

interface Partenaire {
  id: number;
  nom: string;
  contact?: string;
  telephone?: string;
  email?: string;
  actif: boolean;
}

// ============================================================
// CONSTANTES — §3.5
// ============================================================

const TYPE_VELO_LABELS: Record<TypeVelo, string> = {
  VTT: 'VTT',
  VILLE: 'Ville',
  ELECTRIQUE: 'Électrique',
};

const TYPE_VELO_ICONS: Record<TypeVelo, React.ReactNode> = {
  VTT: <Bike size={14} className="text-amber-600" />,
  VILLE: <Bike size={14} className="text-blue-600" />,
  ELECTRIQUE: <Bike size={14} className="text-emerald-600" />,
};

const TAILLE_VELO_OPTIONS: { value: string; label: string }[] = [
  { value: '3_ROUES', label: '🔺 3 roues' },
  { value: 'PETITE', label: 'Petite' },
  { value: 'MOYENNE', label: 'Moyenne' },
  { value: 'GRANDE', label: 'Grande' },
];

const TAILLE_VELO_LABELS: Record<string, string> = {
  '3_ROUES': '3 roues',
  PETITE: 'Petite',
  MOYENNE: 'Moyenne',
  GRANDE: 'Grande',
};

const ETAT_VELO_STYLES: Record<EtatVelo, { bg: string; text: string; label: string; icon: React.ReactNode }> = {
  BON: { bg: 'bg-green-100', text: 'text-green-800', label: 'Bon état', icon: <CheckCircle size={12} className="text-green-600" /> },
  USAGE: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Usagé', icon: <AlertCircle size={12} className="text-yellow-600" /> },
  EN_REPARATION: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'En réparation', icon: <Clock size={12} className="text-orange-600" /> },
  HORS_SERVICE: { bg: 'bg-red-100', text: 'text-red-800', label: 'Hors service', icon: <XCircle size={12} className="text-red-600" /> },
};

const STATUT_LOCATION_STYLES: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  EN_COURS: { bg: 'bg-blue-100', text: 'text-blue-800', icon: <Clock size={14} className="text-blue-600" /> },
  TERMINEE: { bg: 'bg-green-100', text: 'text-green-800', icon: <CheckCircle size={14} className="text-green-600" /> },
  ANNULEE: { bg: 'bg-red-100', text: 'text-red-800', icon: <XCircle size={14} className="text-red-600" /> },
  DEFAULT: { bg: 'bg-gray-100', text: 'text-gray-800', icon: null },
};

const STATUT_TRANSFERT_STYLES: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  PLANIFIE: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: <Clock size={14} className="text-yellow-600" /> },
  REALISE: { bg: 'bg-green-100', text: 'text-green-800', icon: <CheckCircle size={14} className="text-green-600" /> },
  ANNULE: { bg: 'bg-red-100', text: 'text-red-800', icon: <XCircle size={14} className="text-red-600" /> },
  DEFAULT: { bg: 'bg-gray-100', text: 'text-gray-800', icon: null },
};

const ACTIVITE_LABELS: Record<TypeActivite, string> = {
  CANYONING: 'Canyoning',
  RANDONNEE: 'Randonnée',
  VISITE_DISTILLERIE: 'Visite distilleries',
  AUTRE: 'Autre',
};

const ACTIVITE_ICONS: Record<TypeActivite, React.ReactNode> = {
  CANYONING: <Activity size={14} className="text-blue-600" />,
  RANDONNEE: <Navigation size={14} className="text-green-600" />,
  VISITE_DISTILLERIE: <Beer size={14} className="text-amber-600" />,
  AUTRE: <Star size={14} className="text-gray-600" />,
};

const SENS_TRANSFERT_LABELS: Record<SensTransfert, string> = {
  AEROPORT_VERS_GITE: 'Aéroport → Gîte',
  GITE_VERS_AEROPORT: 'Gîte → Aéroport',
};

const FORM_EMPTY = {
  id: 0,
  // Vélo
  type: 'VTT' as TypeVelo,
  taille: '',
  etat: 'BON' as EtatVelo,
  prix: 15,
  numero_serie: '',
  disponible: true,
  // Location
  clientId: '',
  reservation_id: '',
  velo_id: '',
  date_debut: '',
  date_fin: '',
  type_tarification: 'JOURNALIERE' as TypeTarification,
  montant: 0,
  statut: 'EN_COURS' as StatutLocation,
  nombreJours: 1,
  // Transfert
  clientIdTransfert: '',
  date_heure: '',
  sens: 'AEROPORT_VERS_GITE' as SensTransfert,
  numero_vol: '',
  nb_personnes: 1,
  nb_bagages: 0,
  remarques: '',
  // Activité
  partenaire_id: '',
  nom: '',
  description: '',
  type_activite: 'AUTRE' as TypeActivite,
  tarif_client: 0,
  commission_gite: 0,
  disponible_activite: true,
  duree_heures: 2,
  // Partenaire
  partenaireTelephone: '',
  partenaireEmail: '',
  partenaireTauxCommission: 10,
  partenaireActif: true,
};

const EDITOR_LABELS: Record<EditorKind, string> = {
  velo: 'vélo',
  LOCATION_VELO: 'location',
  TRANSFERT_AEROPORT: 'transfert',
  ACTIVITE_GUIDE: 'activité',
  partenaire: 'partenaire',
};

// Classes réutilisées
const INPUT_CLASS =
  'w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 bg-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow';
const LABEL_CLASS = 'block text-xs font-semibold text-gray-800 mb-1';
const SELECT_CLASS =
  'w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow';

// ============================================================
// HELPERS — génération de codes côté client (affichage uniquement)
// ============================================================

function generateReservationCodeFront(): string {
  const chars = '0123456789';
  let result = 'RES';
  for (let i = 0; i < 3; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

function generateTransfertCodeFront(): string {
  const chars = '0123456789';
  let result = 'TRA';
  for (let i = 0; i < 3; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

// ============================================================
// COMPOSANTS UI
// ============================================================

const Spinner = () => (
  <div className="flex flex-col items-center justify-center py-24 gap-3">
    <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
    <p className="text-sm text-gray-700 animate-pulse">Chargement des services annexes...</p>
  </div>
);

const StatusBadge = ({
  status, styles, size = 'sm',
}: { status: string; styles: Record<string, any>; size?: 'sm' | 'md' }) => {
  const style = styles[status] || styles.DEFAULT;
  const sizes = { sm: 'px-2 py-0.5 text-xs gap-1', md: 'px-3 py-1 text-sm gap-1.5' };
  return (
    <span className={`inline-flex items-center rounded-full font-semibold ${sizes[size]} ${style.bg} ${style.text}`}>
      {style.icon}
      {status}
    </span>
  );
};

const StatCard = ({
  label, value, icon, color = 'emerald', subtitle, index = 0,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color?: 'emerald' | 'amber' | 'blue' | 'rose' | 'purple' | 'gray';
  subtitle?: string;
  index?: number;
}) => {
  const colors: Record<string, string> = {
    emerald: 'from-emerald-50 to-emerald-100/60 border-emerald-200',
    amber: 'from-amber-50 to-amber-100/60 border-amber-200',
    blue: 'from-blue-50 to-blue-100/60 border-blue-200',
    rose: 'from-rose-50 to-rose-100/60 border-rose-200',
    purple: 'from-purple-50 to-purple-100/60 border-purple-200',
    gray: 'from-gray-50 to-gray-100/60 border-gray-200',
  };
  return (
    <div
      className={`stat-card-enter bg-gradient-to-br ${colors[color]} rounded-xl border p-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-1`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-700">{label}</p>
          <p className="text-2xl font-bold mt-1 text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-700 mt-0.5">{subtitle}</p>}
        </div>
        <div className="p-2 rounded-lg bg-white shadow-sm">{icon}</div>
      </div>
    </div>
  );
};

const ConfirmDialog = ({
  isOpen, title, message, onConfirm, onCancel, variant = 'default', busy = false,
}: {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'default' | 'danger' | 'warning';
  busy?: boolean;
}) => {
  if (!isOpen) return null;
  const variantStyles = {
    default: 'bg-emerald-600 hover:bg-emerald-700',
    danger: 'bg-rose-600 hover:bg-rose-700',
    warning: 'bg-amber-600 hover:bg-amber-700',
  };
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 animate-slideUp">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
            variant === 'danger' ? 'bg-rose-100 text-rose-600' : variant === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
          }`}
        >
          {variant === 'danger' ? <Trash2 size={24} /> : variant === 'warning' ? <AlertCircle size={24} /> : <CheckCircle size={24} />}
        </div>
        <h3 className="text-lg font-semibold text-gray-900 text-center">{title}</h3>
        <p className="text-sm text-gray-800 mt-2 text-center">{message}</p>
        <div className="flex justify-center gap-3 mt-6">
          <button onClick={onCancel} className="px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl border border-gray-300 transition-all duration-200">
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={`px-5 py-2.5 text-sm font-medium text-white rounded-xl transition-all duration-200 hover:scale-[1.02] shadow-lg disabled:opacity-60 ${variantStyles[variant]}`}
          >
            {busy ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  );
};

const SectionHeader = ({
  icon, title, count, accent, isGerante, onAdd, addLabel, restricted, extra,
}: {
  icon: React.ReactNode;
  title: string;
  count?: string;
  accent: string;
  isGerante: boolean;
  onAdd: () => void;
  addLabel: string;
  restricted?: boolean;
  extra?: React.ReactNode;
}) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-6 py-4 border-b border-gray-200 gap-3">
    <h2 className="font-semibold text-gray-900 flex items-center gap-2">
      {icon}
      {title}
      {count && <span className="text-xs font-normal text-gray-600 ml-2">{count}</span>}
    </h2>
    <div className="flex items-center gap-2 flex-wrap">
      {extra}
      {restricted && !isGerante && (
        <span className="text-xs text-amber-800 bg-amber-50 px-2 py-1 rounded-full border border-amber-200 flex items-center gap-1">
          <Shield size={12} /> Lecture seule
        </span>
      )}
      <button
        onClick={onAdd}
        disabled={restricted && !isGerante}
        className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 hover:scale-[1.03] active:scale-95 ${
          restricted && !isGerante ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : `${accent} text-white shadow-sm`
        }`}
      >
        <Plus size={14} />
        {addLabel}
      </button>
    </div>
  </div>
);

// ============================================================
// COMPOSANT — ClientSelector (réutilisable pour locations et transferts)
// ============================================================

const ClientSelector = ({
  label = 'Client',
  required = false,
  clientSearch,
  setClientSearch,
  selectedClient,
  setSelectedClient,
  clientResults,
  showClientDropdown,
  setShowClientDropdown,
  onClientSelect,
  placeholder = 'Rechercher un client (nom, prénom, email)...',
}: {
  label?: string;
  required?: boolean;
  clientSearch: string;
  setClientSearch: (value: string) => void;
  selectedClient: ClientSimple | null;
  setSelectedClient: (client: ClientSimple | null) => void;
  clientResults: ClientSimple[];
  showClientDropdown: boolean;
  setShowClientDropdown: (show: boolean) => void;
  onClientSelect?: (client: ClientSimple) => void;
  placeholder?: string;
}) => {
  const handleSelect = (client: ClientSimple) => {
    setSelectedClient(client);
    setClientSearch(`${client.prenom} ${client.nom} (${client.email})`);
    setShowClientDropdown(false);
    if (onClientSelect) onClientSelect(client);
    notifyAjout('success', 'Client sélectionné', `${client.prenom} ${client.nom}`);
  };

  return (
    <div>
      <label className={LABEL_CLASS}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <div className="relative">
          <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={clientSearch}
            onChange={e => {
              setClientSearch(e.target.value);
              setSelectedClient(null);
              setShowClientDropdown(true);
            }}
            onFocus={() => setShowClientDropdown(true)}
            placeholder={placeholder}
            className={`${INPUT_CLASS} pl-10`}
          />
          {clientSearch && (
            <button
              type="button"
              onClick={() => {
                setClientSearch('');
                setSelectedClient(null);
                setShowClientDropdown(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
        {showClientDropdown && clientResults.length > 0 && (
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
            {clientResults.map((client) => (
              <button
                key={client.id}
                type="button"
                onClick={() => handleSelect(client)}
                className="w-full px-4 py-3 text-left hover:bg-emerald-50 transition-colors border-b border-gray-100 last:border-b-0 flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold text-xs flex-shrink-0">
                  {client.prenom?.charAt(0)}{client.nom?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{client.prenom} {client.nom}</p>
                  <p className="text-xs text-gray-500">{client.email}</p>
                </div>
                {client.vip && (
                  <span className="px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700 rounded-full">VIP</span>
                )}
                {client.nb_sejours > 0 && (
                  <span className="text-xs text-gray-400">{client.nb_sejours} séjour(s)</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      {selectedClient && (
        <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 animate-fadeIn">
          <div className="w-10 h-10 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-700 font-bold text-sm flex-shrink-0">
            {selectedClient.prenom?.charAt(0)}{selectedClient.nom?.charAt(0)}
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-900">{selectedClient.prenom} {selectedClient.nom}</p>
            <div className="flex flex-wrap gap-3 text-xs text-gray-600">
              <span className="flex items-center gap-1"><Mail size={12} /> {selectedClient.email}</span>
              {selectedClient.telephone && (
                <span className="flex items-center gap-1"><Phone size={12} /> {selectedClient.telephone}</span>
              )}
              {selectedClient.vip && <span className="text-amber-600 font-semibold">⭐ VIP</span>}
              <span>{selectedClient.nb_sejours || 0} séjour(s)</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setSelectedClient(null); setClientSearch(''); }}
            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================================
// HOOK — chargement des données §3.5
// ============================================================

function useServicesAnnexesData() {
  const [velos, setVelos] = useState<Velo[]>([]);
  const [locations, setLocations] = useState<LocationVelo[]>([]);
  const [transferts, setTransferts] = useState<TransfertAeroport[]>([]);
  const [activites, setActivites] = useState<ActiviteGuide[]>([]);
  const [partenaires, setPartenaires] = useState<Partenaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isFetching = useRef(false);

  const api = useMemo(() => ({
    get: async (url: string) => {
      const token = localStorage.getItem('palmiers_token');
      const response = await fetch(`/api${url}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      return response.json();
    },
    post: async (url: string, data: any) => {
      const token = localStorage.getItem('palmiers_token');
      const response = await fetch(`/api${url}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error((await response.json()).message || `HTTP ${response.status}`);
      return response.json();
    },
    put: async (url: string, data: any) => {
      const token = localStorage.getItem('palmiers_token');
      const response = await fetch(`/api${url}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error((await response.json()).message || `HTTP ${response.status}`);
      return response.json();
    },
    delete: async (url: string) => {
      const token = localStorage.getItem('palmiers_token');
      const response = await fetch(`/api${url}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error((await response.json()).message || `HTTP ${response.status}`);
      return response.json();
    },
  }), []);

  const fetchData = useCallback(async () => {
    if (isFetching.current) return;
    isFetching.current = true;
    setLoading(true);
    setError('');

    try {
      console.log('🔄 [ServicesAnnexesPage] fetchData');

      const [velosRes, locationsRes, transfertsRes, activitesRes, partenairesRes] = await Promise.all([
        api.get('/services-annexes/velos'),
        api.get('/services-annexes/velos/locations-en-cours'),
        api.get('/services-annexes/transferts'),
        api.get('/services-annexes/activites/catalogue'),
        api.get('/services-annexes/partenaires'),
      ]);

      setVelos(velosRes.data || []);
      setLocations(locationsRes.data || []);
      setTransferts(transfertsRes.data || []);
      setActivites(activitesRes.data || []);
      setPartenaires(partenairesRes.data || []);

      console.log('✅ [ServicesAnnexesPage] Données chargées:', {
        velos: velosRes.data?.length || 0,
        locations: locationsRes.data?.length || 0,
        transferts: transfertsRes.data?.length || 0,
        activites: activitesRes.data?.length || 0,
        partenaires: partenairesRes.data?.length || 0,
      });
    } catch (err) {
      console.error('❌ [ServicesAnnexesPage] Erreur chargement', err);
      setError('Impossible de charger les services annexes');
      notifyAjout('error', 'Erreur', 'Impossible de charger les services annexes');
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, [api]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return {
    api, velos, setVelos, locations, transferts, activites, partenaires,
    loading, error, fetchData,
  };
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function ServicesAnnexesPage() {
  const { user } = useAuth();
  const { isConnected, sendMessage, lastMessage } = useWebSocketContext();
  const {
    api, velos, setVelos, locations, transferts, activites, partenaires,
    loading, error, fetchData,
  } = useServicesAnnexesData();

  const [mounted, setMounted] = useState(false);
  const [lastRealtimeUpdate, setLastRealtimeUpdate] = useState<Date | null>(null);

  // États pour la recherche de clients (Location)
  const [clientSearch, setClientSearch] = useState('');
  const [clientResults, setClientResults] = useState<ClientSimple[]>([]);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientSimple | null>(null);

  // États pour la recherche de clients (Transfert)
  const [clientSearchTransfert, setClientSearchTransfert] = useState('');
  const [clientResultsTransfert, setClientResultsTransfert] = useState<ClientSimple[]>([]);
  const [showClientDropdownTransfert, setShowClientDropdownTransfert] = useState(false);
  const [selectedClientTransfert, setSelectedClientTransfert] = useState<ClientSimple | null>(null);

  // Éditeur
  const [editorKind, setEditorKind] = useState<EditorKind | null>(null);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [form, setForm] = useState(FORM_EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [confirmDelete, setConfirmDelete] = useState<{ kind: string; id: number; label: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isGerante = user?.role === 'GERANTE' || user?.role === 'admin';

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  // ============================================================
  // RECHERCHE DE CLIENTS (Location)
  // ============================================================

  useEffect(() => {
    if (clientSearch.length < 2) {
      setClientResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await clientService.search(clientSearch);
        const clients = res.data ?? res;
        setClientResults(clients);
        setShowClientDropdown(true);
      } catch (error) {
        console.error('❌ Erreur recherche client:', error);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [clientSearch]);

  const selectClient = (client: ClientSimple) => {
    setSelectedClient(client);
    setForm(f => ({ ...f, clientId: String(client.id) }));
    setClientSearch(`${client.prenom} ${client.nom} (${client.email})`);
    setShowClientDropdown(false);
    notifyAjout('success', 'Client sélectionné', `${client.prenom} ${client.nom}`);
  };

  // ============================================================
  // RECHERCHE DE CLIENTS (Transfert)
  // ============================================================

  useEffect(() => {
    if (clientSearchTransfert.length < 2) {
      setClientResultsTransfert([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await clientService.search(clientSearchTransfert);
        const clients = res.data ?? res;
        setClientResultsTransfert(clients);
        setShowClientDropdownTransfert(true);
      } catch (error) {
        console.error('❌ Erreur recherche client transfert:', error);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [clientSearchTransfert]);

  const selectClientTransfert = (client: ClientSimple) => {
    setSelectedClientTransfert(client);
    setForm(f => ({ ...f, clientIdTransfert: String(client.id) }));
    setClientSearchTransfert(`${client.prenom} ${client.nom} (${client.email})`);
    setShowClientDropdownTransfert(false);
    notifyAjout('success', 'Client sélectionné pour le transfert', `${client.prenom} ${client.nom}`);
  };

  // ============================================================
  // CALCUL AUTO DU MONTANT DE LOCATION
  // ============================================================

  useEffect(() => {
    if (editorKind === 'LOCATION_VELO' && form.velo_id && form.date_debut && form.date_fin) {
      const velo = velos.find(v => v.id === Number(form.velo_id));
      if (velo) {
        const debut = new Date(form.date_debut);
        const fin = new Date(form.date_fin);
        const jours = Math.max(1, Math.ceil((fin.getTime() - debut.getTime()) / (1000 * 60 * 60 * 24)));
        const prix = velo.prix || 15;
        const montantAuto = jours * prix;
        setForm(f => ({
          ...f,
          montant: Math.round(montantAuto * 100) / 100,
          nombreJours: jours
        }));
      }
    }
  }, [form.velo_id, form.date_debut, form.date_fin, velos, editorKind]);

  // ============================================================
  // WEBSOCKET — mises à jour temps réel
  // ============================================================

  useEffect(() => {
    if (!lastMessage) return;

    console.log('📡 [ServicesAnnexesPage] WebSocket message:', lastMessage);

    if (lastMessage.type === 'SERVICE_ANNEXE_UPDATED') {
      const data = lastMessage.data;
      const notifications: Record<string, [string, string, string]> = {
        VELO_CREATED: ['success', 'Nouveau vélo', `Vélo ${data.numero || ''} ajouté au parc`],
        VELO_UPDATED: ['info', 'Vélo modifié', `Vélo ${data.numero || ''} mis à jour`],
        VELO_DELETED: ['warning', 'Vélo supprimé', 'Un vélo a été retiré du parc'],
        LOCATION_CREATED: ['success', 'Nouvelle location', `Vélo ${data.veloNumero || ''} loué`],
        LOCATION_TERMINEE: ['success', 'Location terminée', `Vélo ${data.veloNumero || ''} retourné`],
        TRANSFERT_CREATED: ['success', 'Nouveau transfert', `Transfert ${data.sens || ''} planifié`],
        TRANSFERT_UPDATED: ['info', 'Transfert modifié', `Transfert ${data.sens || ''} mis à jour`],
        TRANSFERT_DELETED: ['warning', 'Transfert supprimé', 'Un transfert a été supprimé'],
        ACTIVITE_CREATED: ['success', 'Nouvelle activité', `Activité ${data.nom || ''} ajoutée`],
        ACTIVITE_UPDATED: ['info', 'Activité modifiée', `Activité ${data.nom || ''} mise à jour`],
        ACTIVITE_DELETED: ['warning', 'Activité supprimée', 'Une activité a été retirée du catalogue'],
        PARTENAIRE_CREATED: ['success', 'Nouveau partenaire', `Partenaire ${data.nom || ''} ajouté`],
        RESERVATION_ACTIVITE_CREATED: ['success', 'Réservation activité', `Commission perçue: ${formatEuro(data.commissionPercue || 0)}`],
      };
      const entry = notifications[data.type];
      if (entry) notifyAjout(entry[0] as any, entry[1], entry[2]);
      setLastRealtimeUpdate(new Date());
      fetchData();
    }

    if (lastMessage.type === 'VELO_STATUS_CHANGED') {
      const data = lastMessage.data;
      setVelos(prev => prev.map(v => (v.id === data.veloId
        ? {
          ...v,
          disponible: data.disponible,
          locationEnCours: data.locationId && !data.disponible ? {
            id: data.locationId,
            clientNom: data.clientNom || '',
            clientPrenom: data.clientPrenom || '',
            dateDebut: data.dateDebut || '',
            dateFin: data.dateFin || '',
            reservationId: data.reservationId || 0,
          } : null,
        }
        : v)));
      setLastRealtimeUpdate(new Date());
      setTimeout(fetchData, 500);
    }

    if (lastMessage.type === 'REFRESH_SERVICES') {
      setLastRealtimeUpdate(new Date());
      fetchData();
    }
  }, [lastMessage, fetchData, setVelos]);

  // ============================================================
  // STATISTIQUES
  // ============================================================

  const stats = useMemo(() => ({
    totalVelos: velos.length,
    velosDisponibles: velos.filter(v => v.disponible && v.etat !== 'HORS_SERVICE').length,
    velosEnReparation: velos.filter(v => v.etat === 'EN_REPARATION').length,
    locationsEnCours: locations.filter(l => l.statut === 'EN_COURS').length,
    transfertsPlanifies: transferts.filter(t => t.statut === 'PLANIFIE').length,
    transfertsRealises: transferts.filter(t => t.statut === 'REALISE').length,
    activitesDisponibles: activites.filter(a => a.disponible).length,
    revenusAnnexes: [...locations, ...transferts].reduce((sum, s) => sum + (s.montant || 0), 0),
    commissions: activites.reduce((sum, a) => sum + a.commission_gite, 0),
  }), [velos, locations, transferts, activites]);

  // ============================================================
  // ÉDITEUR
  // ============================================================

  const openCreate = (kind: EditorKind) => {
    setEditorKind(kind);
    setEditorMode('create');
    setForm({
      ...FORM_EMPTY,
      numero_serie: kind === 'velo' ? `VE${String(Math.floor(1000 + Math.random() * 9000))}` : '',
      reservation_id:
        kind === 'LOCATION_VELO' ? generateReservationCodeFront() :
        kind === 'TRANSFERT_AEROPORT' ? generateTransfertCodeFront() : '',
    });
    setFormError('');
    setSelectedClient(null);
    setClientSearch('');
    setSelectedClientTransfert(null);
    setClientSearchTransfert('');
  };

  const openEdit = (kind: EditorKind, item: any) => {
    setEditorKind(kind);
    setEditorMode('edit');
    setForm({
      ...FORM_EMPTY,
      ...item,
      id: item.id,
      clientId: item.clientId || item.client_id || '',
      clientIdTransfert: item.clientId || item.client_id || '',
      reservation_id: item.reservation_id || '',
      velo_id: item.velo_id || '',
      partenaire_id: item.partenaire_id || '',
      prix: item.prix || 15,
    });
    setFormError('');

    if (kind === 'LOCATION_VELO' && item.client) {
      setSelectedClient(item.client);
      setClientSearch(`${item.client.prenom} ${item.client.nom}`);
    }

    if (kind === 'TRANSFERT_AEROPORT' && item.client) {
      setSelectedClientTransfert(item.client);
      setClientSearchTransfert(`${item.client.prenom} ${item.client.nom}`);
    }
  };

  const closeEditor = () => {
    setEditorKind(null);
    setEditorMode('create');
    setForm(FORM_EMPTY);
    setFormError('');
    setSelectedClient(null);
    setClientSearch('');
    setSelectedClientTransfert(null);
    setClientSearchTransfert('');
  };

  // ============================================================
  // buildPayload — Construction du payload selon le type
  // ============================================================

  const buildPayload = (kind: EditorKind, f: typeof FORM_EMPTY) => {
    switch (kind) {
      case 'velo':
        return {
          type: f.type,
          taille: f.taille || null,
          etat: f.etat || 'BON',
          prix: Number(f.prix) || 15,
          numero_serie: f.numero_serie || `VE${String(Math.floor(1000 + Math.random() * 9000))}`,
          disponible: f.disponible ?? true,
        };

      case 'LOCATION_VELO':
        const veloIdNum = Number(f.velo_id);
        if (!f.velo_id || isNaN(veloIdNum) || veloIdNum <= 0) {
          throw new Error('Veuillez sélectionner un vélo valide');
        }
        const locReservationIdNum = Number(f.reservation_id);
        return {
          clientId: f.clientId ? Number(f.clientId) : null,
          reservation_id: (f.reservation_id && !isNaN(locReservationIdNum) && locReservationIdNum > 0) ? locReservationIdNum : null,
          velo_id: veloIdNum,
          date_debut: f.date_debut,
          date_fin: f.date_fin,
          type_tarification: f.type_tarification || 'JOURNALIERE',
          montant: Number(f.montant || 0),
          statut: f.statut || 'EN_COURS',
          nombreJours: f.nombreJours || 1,
        };

      case 'TRANSFERT_AEROPORT':
        const transfertReservationIdNum = Number(f.reservation_id);
        return {
          clientId: f.clientIdTransfert ? Number(f.clientIdTransfert) : null,
          reservation_id: (f.reservation_id && !isNaN(transfertReservationIdNum) && transfertReservationIdNum > 0) ? transfertReservationIdNum : null,
          date_heure: f.date_heure,
          sens: f.sens,
          numero_vol: f.numero_vol || null,
          nb_personnes: Number(f.nb_personnes || 1),
          nb_bagages: Number(f.nb_bagages || 0),
          montant: Number(f.montant || 0),
          statut: f.statut || 'PLANIFIE',
          remarques: f.remarques || null,
        };

      case 'ACTIVITE_GUIDE':
        return {
          partenaire_id: Number(f.partenaire_id),
          nom: f.nom,
          description: f.description || null,
          type_activite: f.type_activite || 'AUTRE',
          tarif_client: Number(f.tarif_client || 0),
          commission_gite: Number(f.commission_gite || 0),
          disponible: true,
          duree_heures: Number(f.duree_heures || 2),
        };

      case 'partenaire':
        return {
          nom: f.nom,
          telephone: f.partenaireTelephone || null,
          email: f.partenaireEmail || null,
          tauxCommissionDefaut: Number(f.partenaireTauxCommission || 0),
          actif: f.partenaireActif ?? true,
        };

      default:
        return f;
    }
  };

  // ============================================================
  // getPath — Chemin API selon le type
  // ============================================================

  const getPath = (kind: EditorKind) => {
    switch (kind) {
      case 'velo': return '/services-annexes/velos';
      case 'LOCATION_VELO': return '/services-annexes/velos/reserver';
      case 'TRANSFERT_AEROPORT': return '/services-annexes/transferts';
      case 'ACTIVITE_GUIDE': return '/services-annexes/activites';
      case 'partenaire': return '/services-annexes/partenaires';
      default: return '';
    }
  };

  // ============================================================
  // validateForm — Validation du formulaire
  // ============================================================

  const validateForm = (kind: EditorKind): string | null => {
    if (kind === 'velo' && (!form.type || !form.taille)) {
      return 'Type et taille sont obligatoires';
    }
    if (kind === 'LOCATION_VELO') {
      if (!form.velo_id || !form.date_debut || !form.date_fin) {
        return 'Vélo, date de début et date de fin sont obligatoires';
      }
      if (new Date(form.date_debut) >= new Date(form.date_fin)) {
        return 'La date de début doit être antérieure à la date de fin';
      }
    }
    if (kind === 'TRANSFERT_AEROPORT') {
      if (!form.date_heure || !form.sens) {
        return 'Date/heure et sens sont obligatoires';
      }
      if (!form.clientIdTransfert && !form.reservation_id) {
        return 'Veuillez sélectionner un client ou spécifier une réservation';
      }
    }
    if (kind === 'ACTIVITE_GUIDE' && (!form.nom || !form.partenaire_id)) {
      return 'Nom et partenaire sont obligatoires';
    }
    if (kind === 'partenaire' && !form.nom) {
      return 'Le nom du partenaire est obligatoire';
    }
    return null;
  };

  // ============================================================
  // broadcastRefresh — Envoi d'un événement WebSocket
  // ============================================================

  const broadcastRefresh = (action: string, kind: EditorKind, id?: number) => {
    if (isConnected) {
      sendMessage({
        type: 'REFRESH_SERVICES',
        data: { action, kind, id },
        timestamp: new Date().toISOString()
      });
    }
  };

  // ============================================================
  // handleSave — Enregistrement du formulaire
  // ============================================================

  const handleSave = async () => {
    if (!editorKind) {
      setFormError('Type d\'élément non défini');
      return;
    }

    const validationError = validateForm(editorKind);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSaving(true);
    setFormError('');

    try {
      const payload = buildPayload(editorKind, form);
      const path = getPath(editorKind);

      console.log('📤 Payload envoyé:', payload);

      let response;
      if (editorMode === 'create') {
        response = await api.post(path, payload);
        if (response.success) {
          notifyAjout('success', 'Création réussie', response.message || 'Élément créé avec succès');
          broadcastRefresh('create', editorKind, response.data?.id);
        }
      } else {
        let updatePath = `${path}/${form.id}`;
        if (editorKind === 'LOCATION_VELO') {
          updatePath = `/services-annexes/velos/location/${form.id}`;
        }
        if (editorKind === 'TRANSFERT_AEROPORT') {
          updatePath = `/services-annexes/transferts/${form.id}`;
        }
        response = await api.put(updatePath, payload);
        if (response.success) {
          notifyAjout('success', 'Mise à jour réussie', response.message || 'Élément mis à jour avec succès');
          broadcastRefresh('update', editorKind, form.id);
        }
      }

      await fetchData();
      closeEditor();

    } catch (err: any) {
      const message = err.message || "Erreur lors de l'enregistrement";
      setFormError(message);
      notifyAjout('error', 'Erreur', message);
      console.error('❌ Erreur handleSave:', err);
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // handleDelete — Suppression
  // ============================================================

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      let path = getPath(confirmDelete.kind as EditorKind);
      if (confirmDelete.kind === 'LOCATION_VELO') {
        path = `/services-annexes/velos/location/${confirmDelete.id}`;
      }
      if (confirmDelete.kind === 'TRANSFERT_AEROPORT') {
        path = `/services-annexes/transferts/${confirmDelete.id}`;
      }
      const response = await api.delete(`${path}`);
      if (response.success) {
        notifyAjout('success', 'Suppression réussie', response.message || 'Élément supprimé');
        broadcastRefresh('delete', confirmDelete.kind as EditorKind, confirmDelete.id);
      }
      await fetchData();
      setConfirmDelete(null);
    } catch (err: any) {
      notifyAjout('error', 'Erreur', err.message || 'Impossible de supprimer');
    } finally {
      setDeleting(false);
    }
  };

  // ============================================================
  // terminerLocation — Terminer une location
  // ============================================================

  const terminerLocation = async (locationId: number) => {
    try {
      const response = await api.put(`/services-annexes/velos/location/${locationId}/terminer`, {});
      if (response.success) {
        notifyAjout('success', 'Location terminée', 'Le vélo est à nouveau disponible');
        if (isConnected) {
          sendMessage({
            type: 'VELO_STATUS_CHANGED',
            data: { locationId, disponible: true },
            timestamp: new Date().toISOString()
          });
        }
        await fetchData();
      }
    } catch (err: any) {
      notifyAjout('error', 'Erreur', err.message || 'Impossible de terminer la location');
    }
  };

  // ============================================================
  // RENDU
  // ============================================================

  if (loading) return <Spinner />;

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-4">
        <div className="flex flex-col items-center gap-4 p-8 bg-red-50 border border-red-200 rounded-2xl max-w-md animate-fadeIn">
          <AlertCircle size={48} className="text-red-500" />
          <p className="text-red-800 text-center font-medium">{error}</p>
          <button onClick={fetchData} className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all duration-200 hover:scale-105">
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const editorTitleLabel = editorKind ? EDITOR_LABELS[editorKind] : '';
  const partenairesActifs = partenaires.filter(p => p.actif);

  return (
    <div className="space-y-6 p-4 lg:p-6 bg-gray-50 min-h-screen text-gray-900">

      {/* ============================================ */}
      {/* EN-TÊTE */}
      {/* ============================================ */}
      <div
        className={`bg-white rounded-2xl border border-gray-200 shadow-sm px-6 py-5 transition-all duration-500 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-50">
                <Box size={22} className="text-emerald-600" />
              </span>
              Services Annexes
            </h1>
            <p className="text-sm text-gray-700 mt-1 ml-1">
              {stats.totalVelos} vélos · {stats.activitesDisponibles} activités disponibles
            </p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-3">
              <span className="flex items-center gap-1.5 text-sm font-medium text-gray-800">
                <CheckCircle size={14} className="text-emerald-600" />
                {stats.velosDisponibles} vélos disponibles
              </span>
              <span className="flex items-center gap-1.5 text-sm font-medium text-gray-800">
                <Clock size={14} className="text-blue-600" />
                {stats.locationsEnCours} locations en cours
              </span>
              <span className="flex items-center gap-1.5 text-sm font-medium text-gray-800">
                <Plane size={14} className="text-amber-600" />
                {stats.transfertsPlanifies} transferts planifiés
              </span>
              <span className="flex items-center gap-1.5 text-sm font-medium text-gray-800">
                <DollarSign size={14} className="text-emerald-600" />
                {formatEuro(stats.revenusAnnexes)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-xs font-medium text-gray-800">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              {isConnected ? 'Temps réel actif' : 'Hors ligne'}
            </span>
            {lastRealtimeUpdate && (
              <span className="text-xs text-gray-500">
                · {lastRealtimeUpdate.toLocaleTimeString('fr-FR')}
              </span>
            )}
            <button
              onClick={fetchData}
              className="p-2 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-all duration-200 hover:scale-105 active:scale-95"
              title="Rafraîchir"
            >
              <RefreshCw size={18} className="text-gray-700" />
            </button>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* STATISTIQUES */}
      {/* ============================================ */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatCard index={0} label="Vélos" value={stats.totalVelos} icon={<Bike size={18} className="text-emerald-700" />} color="emerald" subtitle={`${stats.velosDisponibles} disponibles`} />
        <StatCard index={1} label="En réparation" value={stats.velosEnReparation} icon={<Clock size={18} className="text-amber-700" />} color="amber" />
        <StatCard index={2} label="Locations" value={stats.locationsEnCours} icon={<CalendarClock size={18} className="text-blue-700" />} color="blue" subtitle="en cours" />
        <StatCard index={3} label="Transferts" value={stats.transfertsPlanifies} icon={<Plane size={18} className="text-purple-700" />} color="purple" subtitle={`${stats.transfertsRealises} réalisés`} />
        <StatCard index={4} label="Activités" value={stats.activitesDisponibles} icon={<Activity size={18} className="text-emerald-700" />} color="emerald" subtitle="disponibles" />
        <StatCard index={5} label="Revenus" value={formatEuro(stats.revenusAnnexes)} icon={<DollarSign size={18} className="text-emerald-700" />} color="emerald" />
        <StatCard index={6} label="Commissions" value={formatEuro(stats.commissions)} icon={<Percent size={18} className="text-purple-700" />} color="purple" />
      </div>

      {/* ============================================ */}
      {/* SECTION: VÉLOS — §3.5.1 */}
      {/* ============================================ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden section-enter" style={{ animationDelay: '80ms' }}>
        <SectionHeader
          icon={<Bike size={18} className="text-emerald-600" />}
          title="Parc de vélos"
          count={`${stats.velosDisponibles} disponibles / ${stats.totalVelos} total`}
          accent="bg-emerald-600 hover:bg-emerald-700"
          isGerante={isGerante}
          onAdd={() => openCreate('velo')}
          addLabel="Ajouter un vélo"
          restricted
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-600 uppercase tracking-wider">
                <th className="px-4 py-3 text-left font-semibold">Type</th>
                <th className="px-4 py-3 text-left font-semibold">Taille</th>
                <th className="px-4 py-3 text-left font-semibold">État</th>
                <th className="px-4 py-3 text-left font-semibold">Prix / jour</th>
                <th className="px-4 py-3 text-left font-semibold">N° série</th>
                <th className="px-4 py-3 text-center font-semibold">Statut</th>
                <th className="px-4 py-3 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {velos.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-500">Aucun vélo dans le parc</td></tr>
              ) : (
                velos.map((velo, i) => {
                  const etatStyle = ETAT_VELO_STYLES[velo.etat];
                  const estDisponible = velo.disponible && velo.etat !== 'HORS_SERVICE';
                  return (
                    <tr key={velo.id} className="row-enter hover:bg-emerald-50/40 transition-colors" style={{ animationDelay: `${i * 35}ms` }}>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5 font-medium text-gray-900">
                          {TYPE_VELO_ICONS[velo.type]}{TYPE_VELO_LABELS[velo.type]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-900">{TAILLE_VELO_LABELS[velo.taille] || velo.taille || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${etatStyle.bg} ${etatStyle.text}`}>
                          {etatStyle.icon}{etatStyle.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{formatEuro(velo.prix || 15)}</td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-900">{velo.numero_serie || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          {estDisponible ? (
                            <span className="flex items-center gap-1 text-xs text-emerald-700 font-semibold">
                              <CircleDot size={14} className="text-emerald-500 animate-pulse" />Disponible
                            </span>
                          ) : velo.locationEnCours ? (
                            <span className="flex items-center gap-1 text-xs text-amber-700 font-semibold">
                              <CircleDot size={14} className="text-amber-500" />Occupé
                              <span className="text-gray-500 text-[10px] ml-1 font-normal">
                                par {velo.locationEnCours.clientPrenom} {velo.locationEnCours.clientNom}
                              </span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-red-700 font-semibold">
                              <XCircle size={14} className="text-red-500" />Indisponible
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {estDisponible && (
                            <button
                              onClick={() => {
                                openCreate('LOCATION_VELO');
                                setForm(f => ({ ...f, velo_id: String(velo.id), prix: velo.prix || 15 }));
                              }}
                              className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded transition-all duration-150 hover:scale-110"
                              title="Louer ce vélo"
                            >
                              <Plus size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => openEdit('velo', velo)}
                            disabled={!isGerante}
                            className={`p-1.5 rounded transition-all duration-150 hover:scale-110 ${isGerante ? 'text-gray-500 hover:text-emerald-700 hover:bg-emerald-50' : 'text-gray-300 cursor-not-allowed'}`}
                            title={!isGerante ? "Seul l'administrateur peut modifier" : 'Modifier'}
                          >
                            <Edit2 size={14} />
                          </button>
                          {velo.locationEnCours && (
                            <button
                              onClick={() => terminerLocation(velo.locationEnCours!.id)}
                              className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-all duration-150 hover:scale-110"
                              title="Terminer la location"
                            >
                              <CheckCircle size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => setConfirmDelete({ kind: 'velo', id: velo.id, label: `vélo ${velo.type}` })}
                            disabled={!isGerante || !!velo.locationEnCours}
                            className={`p-1.5 rounded transition-all duration-150 hover:scale-110 ${
                              isGerante && !velo.locationEnCours ? 'text-gray-500 hover:text-red-700 hover:bg-red-50' : 'text-gray-300 cursor-not-allowed'
                            }`}
                            title={!isGerante ? "Seul l'administrateur peut supprimer" : velo.locationEnCours ? 'Vélo en location' : 'Supprimer'}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================ */}
      {/* SECTION: LOCATIONS & TRANSFERTS */}
      {/* ============================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Locations */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden section-enter" style={{ animationDelay: '140ms' }}>
          <SectionHeader
            icon={<Clock size={18} className="text-blue-600" />}
            title="Locations"
            count={`${stats.locationsEnCours} en cours`}
            accent="bg-blue-600 hover:bg-blue-700"
            isGerante={isGerante}
            onAdd={() => openCreate('LOCATION_VELO')}
            addLabel="Nouvelle location"
          />
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50">
                <tr className="border-b border-gray-100 text-xs text-gray-600 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left font-semibold">Client</th>
                  <th className="px-4 py-3 text-left font-semibold">Vélo</th>
                  <th className="px-4 py-3 text-left font-semibold">Début</th>
                  <th className="px-4 py-3 text-left font-semibold">Fin</th>
                  <th className="px-4 py-3 text-center font-semibold">Montant</th>
                  <th className="px-4 py-3 text-center font-semibold">Statut</th>
                  <th className="px-4 py-3 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {locations.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-500">Aucune location</td></tr>
                ) : (
                  locations.map((loc, i) => (
                    <tr key={loc.id} className="row-enter hover:bg-blue-50/40 transition-colors" style={{ animationDelay: `${i * 35}ms` }}>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {loc.reservation?.client?.prenom || loc.client?.prenom || ''} {loc.reservation?.client?.nom || loc.client?.nom || ''}
                      </td>
                      <td className="px-4 py-3 text-gray-900">{loc.velo?.type} {loc.velo?.taille ? `(${TAILLE_VELO_LABELS[loc.velo.taille] || loc.velo.taille})` : ''}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{formatDateTime(loc.date_debut)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{formatDateTime(loc.date_fin)}</td>
                      <td className="px-4 py-3 text-center font-semibold text-gray-900">{formatEuro(loc.montant)}</td>
                      <td className="px-4 py-3 text-center"><StatusBadge status={loc.statut} styles={STATUT_LOCATION_STYLES} /></td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {loc.statut === 'EN_COURS' && (
                            <button
                              onClick={() => terminerLocation(loc.id)}
                              className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-all duration-150 hover:scale-110"
                              title="Terminer la location"
                            >
                              <CheckCircle size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => openEdit('LOCATION_VELO', loc)}
                            className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-all duration-150 hover:scale-110"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => setConfirmDelete({ kind: 'LOCATION_VELO', id: loc.id, label: `location ${loc.id}` })}
                            disabled={!isGerante}
                            className={`p-1.5 rounded transition-all duration-150 hover:scale-110 ${isGerante ? 'text-gray-500 hover:text-red-700 hover:bg-red-50' : 'text-gray-300 cursor-not-allowed'}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Transferts — AVEC CLIENT DANS LE TABLEAU */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden section-enter" style={{ animationDelay: '180ms' }}>
          <SectionHeader
            icon={<Plane size={18} className="text-amber-600" />}
            title="Transferts aéroport"
            count={`${stats.transfertsPlanifies} planifiés`}
            accent="bg-amber-600 hover:bg-amber-700"
            isGerante={isGerante}
            onAdd={() => openCreate('TRANSFERT_AEROPORT')}
            addLabel="Nouveau transfert"
          />
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50">
                <tr className="border-b border-gray-100 text-xs text-gray-600 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left font-semibold">Client</th>
                  <th className="px-4 py-3 text-left font-semibold">Date</th>
                  <th className="px-4 py-3 text-left font-semibold">Sens</th>
                  <th className="px-4 py-3 text-left font-semibold">Vol</th>
                  <th className="px-4 py-3 text-center font-semibold">Montant</th>
                  <th className="px-4 py-3 text-center font-semibold">Statut</th>
                  <th className="px-4 py-3 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transferts.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-500">Aucun transfert</td></tr>
                ) : (
                  transferts.map((transfert, i) => (
                    <tr key={transfert.id} className="row-enter hover:bg-amber-50/40 transition-colors" style={{ animationDelay: `${i * 35}ms` }}>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {transfert.reservation?.client?.prenom || transfert.client?.prenom || ''} {transfert.reservation?.client?.nom || transfert.client?.nom || ''}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{formatDateTime(transfert.date_heure)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{SENS_TRANSFERT_LABELS[transfert.sens]}</td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-900">{transfert.numero_vol || '—'}</td>
                      <td className="px-4 py-3 text-center font-semibold text-gray-900">{formatEuro(transfert.montant)}</td>
                      <td className="px-4 py-3 text-center"><StatusBadge status={transfert.statut} styles={STATUT_TRANSFERT_STYLES} /></td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEdit('TRANSFERT_AEROPORT', transfert)}
                            className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-all duration-150 hover:scale-110"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => setConfirmDelete({ kind: 'TRANSFERT_AEROPORT', id: transfert.id, label: `transfert ${transfert.id}` })}
                            disabled={!isGerante}
                            className={`p-1.5 rounded transition-all duration-150 hover:scale-110 ${isGerante ? 'text-gray-500 hover:text-red-700 hover:bg-red-50' : 'text-gray-300 cursor-not-allowed'}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* SECTION: ACTIVITÉS — §3.5.3 */}
      {/* ============================================ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden section-enter" style={{ animationDelay: '220ms' }}>
        <SectionHeader
          icon={<Activity size={18} className="text-emerald-600" />}
          title="Activités et guides"
          count={`${stats.activitesDisponibles} disponibles`}
          accent="bg-emerald-600 hover:bg-emerald-700"
          isGerante={isGerante}
          onAdd={() => openCreate('ACTIVITE_GUIDE')}
          addLabel="Nouvelle activité"
          restricted
          extra={
            <button
              onClick={() => openCreate('partenaire')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-all duration-200 hover:scale-[1.03] active:scale-95"
            >
              <Building size={13} /> Ajouter un partenaire
            </button>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-600 uppercase tracking-wider">
                <th className="px-4 py-3 text-left font-semibold">Activité</th>
                <th className="px-4 py-3 text-left font-semibold">Partenaire</th>
                <th className="px-4 py-3 text-left font-semibold">Type</th>
                <th className="px-4 py-3 text-center font-semibold">Tarif client</th>
                <th className="px-4 py-3 text-center font-semibold">Commission</th>
                <th className="px-4 py-3 text-center font-semibold">Durée</th>
                <th className="px-4 py-3 text-center font-semibold">Disponible</th>
                <th className="px-4 py-3 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {activites.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-500">Aucune activité</td></tr>
              ) : (
                activites.map((activite, i) => (
                  <tr key={activite.id} className="row-enter hover:bg-emerald-50/40 transition-colors" style={{ animationDelay: `${i * 35}ms` }}>
                    <td className="px-4 py-3 font-medium text-gray-900">{activite.nom_activite}</td>
                    <td className="px-4 py-3 text-gray-900">{activite.nom_partenaire}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-sm text-gray-900 font-medium">
                        {ACTIVITE_ICONS[activite.type_activite]}{ACTIVITE_LABELS[activite.type_activite]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-gray-900">{formatEuro(activite.tarif_client)}</td>
                    <td className="px-4 py-3 text-center font-semibold text-emerald-700">{formatEuro(activite.commission_gite)}</td>
                    <td className="px-4 py-3 text-center text-gray-900">{activite.duree_heures}h</td>
                    <td className="px-4 py-3 text-center">
                      {activite.disponible ? <CheckCircle size={16} className="text-green-600 mx-auto" /> : <XCircle size={16} className="text-red-600 mx-auto" />}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEdit('ACTIVITE_GUIDE', activite)}
                          disabled={!isGerante}
                          className={`p-1.5 rounded transition-all duration-150 hover:scale-110 ${isGerante ? 'text-gray-500 hover:text-emerald-700 hover:bg-emerald-50' : 'text-gray-300 cursor-not-allowed'}`}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => setConfirmDelete({ kind: 'ACTIVITE_GUIDE', id: activite.id, label: `activité ${activite.nom_activite}` })}
                          disabled={!isGerante}
                          className={`p-1.5 rounded transition-all duration-150 hover:scale-110 ${isGerante ? 'text-gray-500 hover:text-red-700 hover:bg-red-50' : 'text-gray-300 cursor-not-allowed'}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================ */}
      {/* MODAL ÉDITEUR */}
      {/* ============================================ */}
      {editorKind && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slideUp">
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white/95 backdrop-blur-sm rounded-t-2xl">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                {editorMode === 'create' ? <Plus size={18} className="text-emerald-600" /> : <Edit2 size={18} className="text-emerald-600" />}
                {editorMode === 'create' ? `Nouveau ${editorTitleLabel}` : `Modifier ${editorTitleLabel}`}
              </h2>
              <button onClick={closeEditor} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="p-6">
              {formError && (
                <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm flex items-center gap-2.5 animate-shake">
                  <AlertCircle size={16} className="text-rose-600" />
                  {formError}
                </div>
              )}

              {/* Vélo */}
              {editorKind === 'velo' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL_CLASS}>Type *</label>
                    <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as TypeVelo }))} className={SELECT_CLASS}>
                      <option value="VTT">VTT</option>
                      <option value="VILLE">Ville</option>
                      <option value="ELECTRIQUE">Électrique</option>
                    </select>
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Taille *</label>
                    <select value={form.taille} onChange={e => setForm(f => ({ ...f, taille: e.target.value }))} className={SELECT_CLASS}>
                      <option value="">Sélectionner</option>
                      {TAILLE_VELO_OPTIONS.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className={LABEL_CLASS}>Prix / jour (€) *</label>
                    <input type="number" step="0.01" min="0" value={form.prix} onChange={e => setForm(f => ({ ...f, prix: parseFloat(e.target.value) || 0 }))} className={INPUT_CLASS} />
                  </div>
                  <div className="md:col-span-2">
                    <label className={LABEL_CLASS}>Numéro de série</label>
                    <input type="text" value={form.numero_serie} onChange={e => setForm(f => ({ ...f, numero_serie: e.target.value }))} placeholder="VE1234" className={`${INPUT_CLASS} font-mono`} />
                    <p className="text-xs text-gray-500 mt-1">Auto-généré si vide (VE + 4 chiffres) · Le vélo sera automatiquement disponible dès sa création</p>
                  </div>
                </div>
              )}

              {/* Location */}
              {editorKind === 'LOCATION_VELO' && (
                <div className="space-y-4">
                  <ClientSelector
                    label="Client"
                    required={false}
                    clientSearch={clientSearch}
                    setClientSearch={setClientSearch}
                    selectedClient={selectedClient}
                    setSelectedClient={setSelectedClient}
                    clientResults={clientResults}
                    showClientDropdown={showClientDropdown}
                    setShowClientDropdown={setShowClientDropdown}
                    onClientSelect={selectClient}
                    placeholder="Rechercher un client (nom, prénom, email)..."
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={LABEL_CLASS}>Vélo *</label>
                      <select value={form.velo_id} onChange={e => setForm(f => ({ ...f, velo_id: e.target.value }))} className={SELECT_CLASS}>
                        <option value="">Sélectionner</option>
                        {velos.filter(v => v.disponible && v.etat !== 'HORS_SERVICE').map(v => (
                          <option key={v.id} value={v.id}>
                            {v.type} {v.taille ? `(${TAILLE_VELO_LABELS[v.taille] || v.taille})` : ''} - {formatEuro(v.prix || 15)}/jour
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={LABEL_CLASS}>Réservation ID</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={form.reservation_id}
                          readOnly
                          disabled
                          className={`${INPUT_CLASS} bg-gray-100 text-gray-500 cursor-not-allowed font-mono pr-9 select-none`}
                        />
                        <Lock size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Généré automatiquement, non modifiable</p>
                    </div>

                    <div className="md:col-span-2">
                      <label className={LABEL_CLASS}>Période de location *</label>
                      <div className="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-3">
                        <div className="flex-1">
                          <label className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide flex items-center gap-1 mb-1">
                            <CalendarIcon size={11} /> Début
                          </label>
                          <input
                            type="datetime-local"
                            value={form.date_debut ? form.date_debut.slice(0, 16) : ''}
                            onChange={e => setForm(f => ({ ...f, date_debut: e.target.value }))}
                            className="w-full border border-blue-200 rounded-lg px-2.5 py-2 text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none transition-shadow"
                          />
                        </div>
                        <ArrowRight size={16} className="text-blue-300 shrink-0 mt-4" />
                        <div className="flex-1">
                          <label className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide flex items-center gap-1 mb-1">
                            <CalendarIcon size={11} /> Fin
                          </label>
                          <input
                            type="datetime-local"
                            value={form.date_fin ? form.date_fin.slice(0, 16) : ''}
                            onChange={e => setForm(f => ({ ...f, date_fin: e.target.value }))}
                            className="w-full border border-blue-200 rounded-lg px-2.5 py-2 text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none transition-shadow"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className={LABEL_CLASS}>Tarification</label>
                      <select value={form.type_tarification} onChange={e => setForm(f => ({ ...f, type_tarification: e.target.value as TypeTarification }))} className={SELECT_CLASS}>
                        <option value="HORAIRE">Horaire</option>
                        <option value="JOURNALIERE">Journalière</option>
                      </select>
                    </div>
                    <div>
                      <label className={LABEL_CLASS}>Montant (€)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">€</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={form.montant}
                          onChange={e => setForm(f => ({ ...f, montant: parseFloat(e.target.value) || 0 }))}
                          className={`${INPUT_CLASS} pl-8`}
                        />
                      </div>
                      {form.velo_id && form.date_debut && form.date_fin && (
                        <p className="text-xs text-emerald-600 mt-1">
                          💰 Calculé automatiquement: {form.nombreJours || 1} jour(s) × {formatEuro(velos.find(v => v.id === Number(form.velo_id))?.prix || 15)} = {formatEuro(form.montant)}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className={LABEL_CLASS}>Statut</label>
                      <select value={form.statut} onChange={e => setForm(f => ({ ...f, statut: e.target.value as StatutLocation }))} className={SELECT_CLASS}>
                        <option value="EN_COURS">En cours</option>
                        <option value="TERMINEE">Terminée</option>
                        <option value="ANNULEE">Annulée</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <span className="text-sm text-gray-600">Nombre de jours:</span>
                      <span className="font-bold text-gray-900">{form.nombreJours || 1}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Transfert — AVEC CLIENT SELECTOR */}
              {editorKind === 'TRANSFERT_AEROPORT' && (
                <div className="space-y-4">
                  <ClientSelector
                    label="Client"
                    required={false}
                    clientSearch={clientSearchTransfert}
                    setClientSearch={setClientSearchTransfert}
                    selectedClient={selectedClientTransfert}
                    setSelectedClient={setSelectedClientTransfert}
                    clientResults={clientResultsTransfert}
                    showClientDropdown={showClientDropdownTransfert}
                    setShowClientDropdown={setShowClientDropdownTransfert}
                    onClientSelect={selectClientTransfert}
                    placeholder="Rechercher un client (nom, prénom, email)..."
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={LABEL_CLASS}>Réservation ID</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={form.reservation_id}
                          readOnly
                          disabled
                          className={`${INPUT_CLASS} bg-gray-100 text-gray-500 cursor-not-allowed font-mono tracking-wider pr-9 select-none`}
                        />
                        <Lock size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Code généré automatiquement (TRA + 3 chiffres)</p>
                    </div>

                    <div>
                      <label className={LABEL_CLASS}>Date / Heure *</label>
                      <div className="relative">
                        <Clock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 pointer-events-none" />
                        <input
                          type="datetime-local"
                          value={form.date_heure ? form.date_heure.slice(0, 16) : ''}
                          onChange={e => setForm(f => ({ ...f, date_heure: e.target.value }))}
                          className={`${INPUT_CLASS} pl-9 bg-amber-50/40 border-amber-200 focus:ring-amber-400 focus:border-amber-400`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={LABEL_CLASS}>Sens *</label>
                      <select value={form.sens} onChange={e => setForm(f => ({ ...f, sens: e.target.value as SensTransfert }))} className={SELECT_CLASS}>
                        <option value="AEROPORT_VERS_GITE">Aéroport → Gîte</option>
                        <option value="GITE_VERS_AEROPORT">Gîte → Aéroport</option>
                      </select>
                    </div>
                    <div>
                      <label className={LABEL_CLASS}>Numéro de vol</label>
                      <input type="text" value={form.numero_vol} onChange={e => setForm(f => ({ ...f, numero_vol: e.target.value }))} placeholder="AF 123" className={INPUT_CLASS} />
                    </div>
                    <div>
                      <label className={LABEL_CLASS}>Personnes</label>
                      <input type="number" min="1" value={form.nb_personnes} onChange={e => setForm(f => ({ ...f, nb_personnes: parseInt(e.target.value) || 1 }))} className={INPUT_CLASS} />
                    </div>
                    <div>
                      <label className={LABEL_CLASS}>Bagages</label>
                      <input type="number" min="0" value={form.nb_bagages} onChange={e => setForm(f => ({ ...f, nb_bagages: parseInt(e.target.value) || 0 }))} className={INPUT_CLASS} />
                    </div>
                    <div>
                      <label className={LABEL_CLASS}>Montant (€)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">€</span>
                        <input type="number" step="0.01" min="0" value={form.montant} onChange={e => setForm(f => ({ ...f, montant: parseFloat(e.target.value) || 0 }))} className={`${INPUT_CLASS} pl-8`} />
                      </div>
                    </div>
                    <div>
                      <label className={LABEL_CLASS}>Statut</label>
                      <select value={form.statut} onChange={e => setForm(f => ({ ...f, statut: e.target.value as StatutTransfert }))} className={SELECT_CLASS}>
                        <option value="PLANIFIE">Planifié</option>
                        <option value="REALISE">Réalisé</option>
                        <option value="ANNULE">Annulé</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className={LABEL_CLASS}>Remarques</label>
                      <textarea value={form.remarques} onChange={e => setForm(f => ({ ...f, remarques: e.target.value }))} rows={2} className={`${INPUT_CLASS} resize-none`} placeholder="Informations complémentaires..." />
                    </div>
                  </div>
                </div>
              )}

              {/* Activité */}
              {editorKind === 'ACTIVITE_GUIDE' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className={LABEL_CLASS}>Partenaire *</label>
                    <select value={form.partenaire_id} onChange={e => setForm(f => ({ ...f, partenaire_id: e.target.value }))} className={SELECT_CLASS}>
                      <option value="">Sélectionner</option>
                      {partenairesActifs.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
                    </select>
                    {partenairesActifs.length === 0 && (
                      <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                        <AlertCircle size={12} /> Aucun partenaire disponible. Utilisez le bouton « Ajouter un partenaire » ci-dessus.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Nom *</label>
                    <input type="text" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} className={INPUT_CLASS} />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Type d'activité</label>
                    <select value={form.type_activite} onChange={e => setForm(f => ({ ...f, type_activite: e.target.value as TypeActivite }))} className={SELECT_CLASS}>
                      <option value="CANYONING">Canyoning</option>
                      <option value="RANDONNEE">Randonnée</option>
                      <option value="VISITE_DISTILLERIE">Visite distilleries</option>
                      <option value="AUTRE">Autre</option>
                    </select>
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Durée (heures)</label>
                    <input type="number" min="0.5" step="0.5" value={form.duree_heures} onChange={e => setForm(f => ({ ...f, duree_heures: parseFloat(e.target.value) || 2 }))} className={INPUT_CLASS} />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Tarif client (€)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">€</span>
                      <input type="number" step="0.01" min="0" value={form.tarif_client} onChange={e => setForm(f => ({ ...f, tarif_client: parseFloat(e.target.value) || 0 }))} className={`${INPUT_CLASS} pl-8`} />
                    </div>
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Commission gîte (€)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">€</span>
                      <input type="number" step="0.01" min="0" value={form.commission_gite} onChange={e => setForm(f => ({ ...f, commission_gite: parseFloat(e.target.value) || 0 }))} className={`${INPUT_CLASS} pl-8`} />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className={LABEL_CLASS}>Description</label>
                    <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className={`${INPUT_CLASS} resize-none`} placeholder="Description de l'activité..." />
                  </div>
                </div>
              )}

              {/* Partenaire */}
              {editorKind === 'partenaire' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2 mb-1 p-3 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700 flex items-start gap-2">
                    <Building size={15} className="shrink-0 mt-0.5" />
                    Ce partenaire sera immédiatement disponible dans la liste déroulante du formulaire « Nouvelle activité ».
                  </div>
                  <div className="md:col-span-2">
                    <label className={LABEL_CLASS}>Nom du partenaire *</label>
                    <input
                      type="text"
                      value={form.nom}
                      onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                      className={INPUT_CLASS}
                      placeholder="Ex: Canyoning Réunion"
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Téléphone</label>
                    <input
                      type="tel"
                      value={form.partenaireTelephone}
                      onChange={e => setForm(f => ({ ...f, partenaireTelephone: e.target.value }))}
                      className={INPUT_CLASS}
                      placeholder="+262 692 00 00 00"
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Email</label>
                    <input
                      type="email"
                      value={form.partenaireEmail}
                      onChange={e => setForm(f => ({ ...f, partenaireEmail: e.target.value }))}
                      className={INPUT_CLASS}
                      placeholder="contact@partenaire.com"
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Taux commission par défaut (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={form.partenaireTauxCommission}
                      onChange={e => setForm(f => ({ ...f, partenaireTauxCommission: parseFloat(e.target.value) || 0 }))}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      checked={form.partenaireActif}
                      onChange={e => setForm(f => ({ ...f, partenaireActif: e.target.checked }))}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-400"
                    />
                    <label className="text-sm text-gray-800">Partenaire actif</label>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
              <button onClick={closeEditor} className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-sm font-medium rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-emerald-200/50 hover:scale-[1.02] active:scale-95"
              >
                {saving ? <><Loader2 size={16} className="animate-spin" />Enregistrement...</> : <><CheckCircle size={16} />{editorMode === 'create' ? 'Créer' : 'Enregistrer'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation de suppression */}
      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="Confirmer la suppression"
        message={`Êtes-vous sûr de vouloir supprimer ${confirmDelete?.label || ''} ? Cette action est irréversible et sera tracée dans le journal des actions (§4.4).`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
        variant="danger"
        busy={deleting}
      />

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-6px); }
          20%, 40%, 60%, 80% { transform: translateX(6px); }
        }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeInRow { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: translateX(0); } }

        .animate-fadeIn { animation: fadeIn 0.2s ease-out forwards; }
        .animate-slideUp { animation: slideUp 0.3s ease-out forwards; }
        .animate-shake { animation: shake 0.5s ease-in-out; }
        .stat-card-enter { opacity: 0; animation: fadeInUp 0.45s ease-out forwards; }
        .section-enter { opacity: 0; animation: fadeInUp 0.5s ease-out forwards; }
        .row-enter { opacity: 0; animation: fadeInRow 0.35s ease-out forwards; }

        @media (prefers-reduced-motion: reduce) {
          .stat-card-enter, .section-enter, .row-enter, .animate-fadeIn, .animate-slideUp, .animate-shake {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
}