// frontend/src/pages/ClientsPage.tsx
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  Users, Plus, Search, Edit2, Star, Shield, Download, X,
  User, Mail, Phone, MapPin, Calendar, Euro, Award,
  Filter, ChevronDown, ChevronUp, Eye, Trash2,
  UserCheck, UserX, Building, Globe, Clock, TrendingUp,
  AlertCircle, CheckCircle, FileText, Printer, Settings,
  Sparkles, Zap, Gift, Crown, Diamond, Heart,
  ArrowUp, ArrowDown, RefreshCw, Loader2,
  MoreHorizontal, Copy, Tag, Hash, Briefcase
} from 'lucide-react';
import { formatDate, formatEuro, initiales } from '../utils/helpers';
import api from '../services/api';
import toast from 'react-hot-toast';

// ============================================
// TYPES - Basés sur le diagramme de classes §3.3
// ============================================

type StatutClient = 'NOUVEAU' | 'REGULIER' | 'VIP';
type SegmentClient = 'TOURISTE_INDIVIDUEL' | 'COUPLE' | 'FAMILLE' | 'GROUPE' | 'VOYAGEUR_AFFAIRES';
type OrigineGeographique = 'METROPOLE' | 'ILE_MAURICE' | 'MADAGASCAR' | 'EUROPE' | 'AUTRES_DOM_TOM' | 'AUTRE';
type CanalAcquisition = 'DIRECT' | 'SITE_WEB' | 'BOOKING' | 'AGENCE_LOCALE' | 'BOUCHE_A_OREILLE';

interface Client {
  id: number;
  civilite: 'M.' | 'Mme' | 'Mlle' | 'Dr' | 'Prof';
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
  origine_geographique: OrigineGeographique;
  canal_acquisition: CanalAcquisition;
  allergies?: string;
  regime_alimentaire?: string;
  chambre_preferee?: string;
  commentaires_prives?: string;
  nb_sejours: number;
  montant_total_depense: number;
  date_creation: string;
  date_modification?: string;
  vip: boolean;
}

interface ReservationClient {
  id: number;
  numero_reservation: string;
  date_arrivee: string;
  date_depart: string;
  chambre_nom: string;
  montant_total: number;
  statut: 'CONFIRMEE' | 'TERMINEE' | 'ANNULEE' | 'NO_SHOW';
}

interface Enfant {
  id: number;
  prenom: string;
  age: number;
  necessite_lit: boolean;
  nom_parent: string;
  prenom_parent: string;
  contact_parent: string;
}

// ============================================
// CONSTANTES
// ============================================

const SEGMENT_LABELS: Record<SegmentClient, string> = {
  'TOURISTE_INDIVIDUEL': 'Touriste individuel',
  'COUPLE': 'Couple',
  'FAMILLE': 'Famille',
  'GROUPE': 'Groupe',
  'VOYAGEUR_AFFAIRES': 'Voyageur d\'affaires'
};

const SEGMENT_ICONS: Record<SegmentClient, React.ReactNode> = {
  'TOURISTE_INDIVIDUEL': <User size={12} />,
  'COUPLE': <Heart size={12} />,
  'FAMILLE': <Users size={12} />,
  'GROUPE': <Users size={12} />,
  'VOYAGEUR_AFFAIRES': <Briefcase size={12} />
};

const ORIGINE_LABELS: Record<OrigineGeographique, string> = {
  'METROPOLE': 'Métropole',
  'ILE_MAURICE': 'Île Maurice',
  'MADAGASCAR': 'Madagascar',
  'EUROPE': 'Europe',
  'AUTRES_DOM_TOM': 'Autres DOM-TOM',
  'AUTRE': 'Autre'
};

const CANAL_LABELS: Record<CanalAcquisition, string> = {
  'DIRECT': 'Direct',
  'SITE_WEB': 'Site Web',
  'BOOKING': 'Booking',
  'AGENCE_LOCALE': 'Agence locale',
  'BOUCHE_A_OREILLE': 'Bouche-à-oreille'
};

const STATUT_STYLES: Record<StatutClient, { bg: string; text: string; border: string; icon: React.ReactNode; glow: string }> = {
  'NOUVEAU': {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: <UserX size={12} />,
    glow: 'shadow-blue-200/50'
  },
  'REGULIER': {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: <UserCheck size={12} />,
    glow: 'shadow-emerald-200/50'
  },
  'VIP': {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: <Star size={12} className="fill-amber-500" />,
    glow: 'shadow-amber-200/50'
  }
};

const STATUT_ORDER: StatutClient[] = ['VIP', 'REGULIER', 'NOUVEAU'];

// ============================================
// COMPOSANTS UI RÉUTILISABLES
// ============================================

// ─── SPINNER ─────────────────────────────────
const Spinner = () => (
  <div className="flex flex-col items-center justify-center py-20 gap-4">
    <div className="relative">
      <div className="w-12 h-12 border-4 border-palmier-200 border-t-palmier-600 rounded-full animate-spin" />
      <div className="absolute inset-0 w-12 h-12 rounded-full border-4 border-transparent border-t-palmier-300 animate-pulse" />
    </div>
    <p className="text-sm text-gray-500 animate-pulse">Chargement des clients...</p>
  </div>
);

// ─── EMPTY STATE ─────────────────────────────
const EmptyState = ({ icon, title, description, action }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-2xl mb-4">
      {icon}
    </div>
    <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
    <p className="text-sm text-gray-500 mt-2 max-w-md">{description}</p>
    {action && <div className="mt-6">{action}</div>}
  </div>
);

// ─── STATUT BADGE ────────────────────────────
const ClientStatusBadge = ({ statut, size = 'sm' }: { statut: StatutClient; size?: 'sm' | 'md' }) => {
  const style = STATUT_STYLES[statut];
  const sizes = {
    sm: 'px-2.5 py-1 text-xs gap-1',
    md: 'px-3.5 py-1.5 text-sm gap-1.5'
  };
  return (
    <span className={`inline-flex items-center rounded-full border font-medium ${sizes[size]} ${style.bg} ${style.text} ${style.border} shadow-sm ${style.glow}`}>
      {style.icon}
      {statut}
    </span>
  );
};

// ─── SEGMENT BADGE ───────────────────────────
const SegmentBadge = ({ segment }: { segment: SegmentClient }) => (
  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-700 bg-gray-100/80 rounded-full border border-gray-200/60">
    {SEGMENT_ICONS[segment]}
    {SEGMENT_LABELS[segment]}
  </span>
);

// ─── STAT CARD ───────────────────────────────
const StatCard = ({ label, value, icon, color = 'palmier', subtitle }: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color?: 'palmier' | 'emerald' | 'amber' | 'rose' | 'sky' | 'purple';
  subtitle?: string;
}) => {
  const colors = {
    palmier: 'from-palmier-50 to-palmier-100/50 border-palmier-200/50 text-palmier-700',
    emerald: 'from-emerald-50 to-emerald-100/50 border-emerald-200/50 text-emerald-700',
    amber: 'from-amber-50 to-amber-100/50 border-amber-200/50 text-amber-700',
    rose: 'from-rose-50 to-rose-100/50 border-rose-200/50 text-rose-700',
    sky: 'from-sky-50 to-sky-100/50 border-sky-200/50 text-sky-700',
    purple: 'from-purple-50 to-purple-100/50 border-purple-200/50 text-purple-700',
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} rounded-xl border p-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-1`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium opacity-70">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subtitle && <p className="text-xs opacity-60 mt-0.5">{subtitle}</p>}
        </div>
        <div className={`p-2 rounded-lg bg-white/50 backdrop-blur-sm`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

// ─── CONFIRM DIALOG ──────────────────────────
const ConfirmDialog = ({ isOpen, title, message, onConfirm, onCancel, variant = 'default', icon }: {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'default' | 'danger' | 'warning' | 'success';
  icon?: React.ReactNode;
}) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (isOpen) requestAnimationFrame(() => setVisible(true));
    else setVisible(false);
  }, [isOpen]);
  if (!isOpen) return null;

  const btnClass = {
    default: 'bg-palmier-600 hover:bg-palmier-700',
    danger: 'bg-rose-600 hover:bg-rose-700',
    warning: 'bg-amber-500 hover:bg-amber-600',
    success: 'bg-emerald-600 hover:bg-emerald-700',
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${visible ? 'bg-black/40 backdrop-blur-sm' : 'bg-black/0'}`}>
      <div className={`bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transition-all duration-300 ${visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-full ${variant === 'danger' ? 'bg-rose-50 text-rose-600' : variant === 'warning' ? 'bg-amber-50 text-amber-600' : 'bg-palmier-50 text-palmier-600'}`}>
            {icon || <AlertCircle size={20} />}
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <p className="text-sm text-gray-600">{message}</p>
        <div className="flex gap-3 justify-end mt-6">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">Annuler</button>
          <button onClick={onConfirm} className={`px-4 py-2 text-sm font-medium text-white rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 ${btnClass[variant]}`}>Confirmer</button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function ClientsPage() {
  // ─── ÉTATS ──────────────────────────────────────
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState<StatutClient | 'TOUS'>('TOUS');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [mounted, setMounted] = useState(false);
  const PER_PAGE = 15;

  // ─── MODALS ─────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // ─── DÉTAIL ─────────────────────────────────────
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [clientDetail, setClientDetail] = useState<{
    client: Client;
    reservations: ReservationClient[];
    enfants: Enfant[];
  } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // ─── CONFIRMATIONS ─────────────────────────────
  const [confirmRgpd, setConfirmRgpd] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  // ─── FORMULAIRE ────────────────────────────────
  const FORM_EMPTY = {
    civilite: 'M.',
    prenom: '',
    nom: '',
    email: '',
    telephone: '',
    adresse: '',
    code_postal: '',
    ville: '',
    pays: 'France',
    segment: 'TOURISTE_INDIVIDUEL' as SegmentClient,
    origine_geographique: 'METROPOLE' as OrigineGeographique,
    canal_acquisition: 'DIRECT' as CanalAcquisition,
    allergies: '',
    regime_alimentaire: '',
    chambre_preferee: '',
    commentaires_prives: '',
    vip: false,
  };

  // ============================================
  // COMPTAGES
  // ============================================

  const counts = useMemo(() => {
    const result: Record<StatutClient | 'TOUS', number> = {
      'TOUS': clients.length,
      'NOUVEAU': 0,
      'REGULIER': 0,
      'VIP': 0
    };
    clients.forEach(c => {
      if (c.statut) result[c.statut] = (result[c.statut] || 0) + 1;
    });
    return result;
  }, [clients]);

  const stats = useMemo(() => {
    const totalSejours = clients.reduce((acc, c) => acc + (c.nb_sejours || 0), 0);
    const totalDepenses = clients.reduce((acc, c) => acc + (c.montant_total_depense || 0), 0);
    const moyenneSejours = clients.length > 0 ? (totalSejours / clients.length) : 0;
    return { totalSejours, totalDepenses, moyenneSejours };
  }, [clients]);

  // ============================================
  // CHARGEMENT
  // ============================================

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      if (filterStatut !== 'TOUS') params.statut = filterStatut;
      params.page = page;
      params.limit = PER_PAGE;

      const res = await api.get('/clients', { params });
      const data = res.data.data || res.data || [];
      setClients(Array.isArray(data) ? data : []);
      setTotal(res.data.pagination?.total ?? res.data.total ?? data.length ?? 0);
    } catch (err) {
      console.error('[ClientsPage] Erreur chargement', err);
      toast.error('Erreur lors du chargement des clients');
    } finally {
      setLoading(false);
      setTimeout(() => setMounted(true), 100);
    }
  }, [search, filterStatut, page]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // ============================================
  // CALCUL STATUT - §3.3.1
  // ============================================

  const getClientStatut = (client: Client): StatutClient => {
    if (client.vip === true || (client.nb_sejours || 0) >= 3) return 'VIP';
    if ((client.nb_sejours || 0) >= 2) return 'REGULIER';
    return 'NOUVEAU';
  };

  // ============================================
  // CRUD
  // ============================================

  const openCreate = () => {
    setEditClient(null);
    setForm(FORM_EMPTY);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (client: Client) => {
    setEditClient(client);
    setForm({
      civilite: client.civilite || 'M.',
      prenom: client.prenom,
      nom: client.nom,
      email: client.email,
      telephone: client.telephone || '',
      adresse: client.adresse || '',
      code_postal: client.code_postal || '',
      ville: client.ville || '',
      pays: client.pays || 'France',
      segment: client.segment || 'TOURISTE_INDIVIDUEL',
      origine_geographique: client.origine_geographique || 'METROPOLE',
      canal_acquisition: client.canal_acquisition || 'DIRECT',
      allergies: client.allergies || '',
      regime_alimentaire: client.regime_alimentaire || '',
      chambre_preferee: client.chambre_preferee || '',
      commentaires_prives: client.commentaires_prives || '',
      vip: client.vip || false,
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.prenom || !form.nom) {
      setFormError('Le prénom et le nom sont obligatoires');
      return;
    }
    if (!form.email) {
      setFormError('L\'email est obligatoire');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      const payload = { ...form };
      delete payload.statut;
      delete payload.nb_sejours;
      delete payload.montant_total_depense;
      delete payload.date_creation;

      if (editClient) {
        await api.put(`/clients/${editClient.id}`, payload);
        toast.success('Client mis à jour avec succès');
      } else {
        await api.post('/clients', payload);
        toast.success('Client créé avec succès');
      }
      setShowModal(false);
      fetchClients();
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Erreur lors de l\'enregistrement';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/clients/${id}`);
      toast.success('Client supprimé avec succès');
      setConfirmDelete(null);
      fetchClients();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Impossible de supprimer ce client';
      toast.error(msg);
    }
  };

  // ============================================
  // DÉTAIL CLIENT - §3.3.1
  // ============================================

  const openDetail = async (client: Client) => {
    setSelectedClient(client);
    setShowDetail(true);
    setLoadingDetail(true);
    try {
      const [detailRes, histRes] = await Promise.all([
        api.get(`/clients/${client.id}/detail`),
        api.get(`/clients/${client.id}/historique`)
      ]);

      const detailData = detailRes.data.data || detailRes.data;
      const histData = histRes.data.data || histRes.data || [];

      setClientDetail({
        client: detailData.client || detailData,
        reservations: Array.isArray(histData) ? histData.map((r: any) => ({
          id: r.id,
          numero_reservation: r.numeroReservation || r.numero_reservation || `RES-${r.id}`,
          date_arrivee: r.dateArrivee || r.date_arrivee,
          date_depart: r.dateDepart || r.date_depart,
          chambre_nom: r.chambre?.nom || r.chambre_nom || '—',
          montant_total: r.montantTotal || r.montant_total || 0,
          statut: r.statut || 'TERMINEE'
        })) : [],
        enfants: detailData.enfants || []
      });
    } catch (err) {
      console.error('Erreur chargement détail', err);
      toast.error('Erreur lors du chargement des détails');
    } finally {
      setLoadingDetail(false);
    }
  };

  // ============================================
  // EXPORT RGPD - §5.2
  // ============================================

  const handleRgpdExport = async (clientId: number) => {
    try {
      const res = await api.get(`/clients/${clientId}/export-rgpd`, {
        responseType: 'blob'
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rgpd_client_${clientId}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Export RGPD généré avec succès');
    } catch (err) {
      toast.error('Erreur lors de l\'export des données RGPD');
    } finally {
      setConfirmRgpd(null);
    }
  };

  // ============================================
  // PAGINATION
  // ============================================

  const totalPages = Math.ceil(total / PER_PAGE);

  // ============================================
  // RENDU
  // ============================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50/50 p-4 lg:p-6 space-y-6">

      {/* ── STYLES ──────────────────────────────── */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-12px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulseGlow {
          0%,100% { box-shadow: 0 0 20px rgba(42, 100, 150, 0.1); }
          50% { box-shadow: 0 0 40px rgba(42, 100, 150, 0.2); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.5s ease-out forwards;
        }
        .animate-slide-in {
          animation: slideIn 0.4s ease-out forwards;
        }
        .animate-pulse-glow {
          animation: pulseGlow 2s ease-in-out infinite;
        }
        .glass-effect {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        .glass-card {
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }
      `}</style>

      {/* ── EN-TÊTE ─────────────────────────────── */}
      <div className={`flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-palmier-100 to-palmier-200 rounded-2xl shadow-lg shadow-palmier-200/50 transition-transform duration-300 hover:scale-110 hover:rotate-3">
            <Users size={24} className="text-palmier-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              Clients
              <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full">
                {total} client{total > 1 ? 's' : ''}
              </span>
            </h1>
            <p className="text-sm text-gray-500 flex items-center gap-3 flex-wrap mt-0.5">
              <span className="flex items-center gap-1">
                <Crown size={14} className="text-amber-500" />
                {counts.VIP} VIP
              </span>
              <span className="text-gray-300">|</span>
              <span className="flex items-center gap-1">
                <UserCheck size={14} className="text-emerald-500" />
                {counts.REGULIER} réguliers
              </span>
              <span className="text-gray-300">|</span>
              <span className="flex items-center gap-1">
                <UserX size={14} className="text-blue-500" />
                {counts.NOUVEAU} nouveaux
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchClients}
            className="p-2.5 border border-gray-200 bg-white rounded-xl hover:bg-gray-50 text-gray-500 hover:text-gray-700 hover:scale-105 active:scale-95 transition-all duration-200"
            title="Rafraîchir"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-palmier-600 to-palmier-700 text-white rounded-xl hover:from-palmier-700 hover:to-palmier-800 hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg shadow-palmier-200/50"
          >
            <Plus size={18} />
            <span>Nouveau client</span>
            <Sparkles size={14} className="text-palmier-200" />
          </button>
        </div>
      </div>

      {/* ── STATS ────────────────────────────────── */}
      <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '100ms' }}>
        <StatCard
          label="Total clients"
          value={total}
          icon={<Users size={18} />}
          color="palmier"
        />
        <StatCard
          label="Séjours totaux"
          value={stats.totalSejours}
          icon={<Calendar size={18} />}
          color="sky"
        />
        <StatCard
          label="Dépenses totales"
          value={`${Math.round(stats.totalDepenses).toLocaleString('fr-FR')} €`}
          icon={<Euro size={18} />}
          color="emerald"
        />
        <StatCard
          label="Moyenne séjours"
          value={stats.moyenneSejours.toFixed(1)}
          icon={<TrendingUp size={18} />}
          color="purple"
          subtitle={`${clients.filter(c => c.nb_sejours >= 2).length} clients fidèles`}
        />
      </div>

      {/* ── BARRE DE RECHERCHE ──────────────────── */}
      <div className={`flex flex-col sm:flex-row gap-3 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '150ms' }}>
        <div className="relative flex-1">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
            <Search size={16} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Rechercher par nom, email, téléphone..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-palmier-400 focus:border-palmier-400 outline-none bg-white/80 backdrop-blur-sm transition-all duration-200 placeholder-gray-400"
          />
          {search && (
            <button
              onClick={() => { setSearch(''); setPage(1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-wrap">
          <div className="flex gap-1.5 bg-white/80 backdrop-blur-sm rounded-xl p-1 border border-gray-200/60">
            {(['TOUS', ...STATUT_ORDER] as const).map(filter => {
              const labels: Record<string, string> = {
                'TOUS': 'Tous',
                'NOUVEAU': 'Nouveaux',
                'REGULIER': 'Réguliers',
                'VIP': 'VIP'
              };
              const icons: Record<string, React.ReactNode> = {
                'TOUS': <Users size={12} />,
                'NOUVEAU': <UserX size={12} />,
                'REGULIER': <UserCheck size={12} />,
                'VIP': <Star size={12} className="fill-amber-500" />
              };
              const active = filterStatut === filter;
              return (
                <button
                  key={filter}
                  onClick={() => setFilterStatut(filter)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                    active
                      ? 'bg-palmier-600 text-white shadow-md shadow-palmier-200/50 scale-105'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {icons[filter]}
                  {labels[filter]}
                  <span className={`text-[10px] ${active ? 'text-palmier-200' : 'text-gray-400'}`}>
                    ({counts[filter] || 0})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── TABLEAU ──────────────────────────────── */}
      <div className={`bg-white/80 glass-effect rounded-2xl border border-gray-200/60 shadow-xl shadow-gray-200/30 overflow-hidden transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '200ms' }}>
        {loading ? (
          <Spinner />
        ) : clients.length === 0 ? (
          <EmptyState
            icon={<Users size={48} className="text-gray-300" />}
            title={search || filterStatut !== 'TOUS' ? 'Aucun résultat' : 'Aucun client'}
            description={search || filterStatut !== 'TOUS' ? 'Essayez de modifier vos filtres de recherche.' : 'Commencez par créer votre premier client.'}
            action={
              !search && filterStatut === 'TOUS' && (
                <button
                  onClick={openCreate}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-palmier-600 to-palmier-700 text-white rounded-xl hover:from-palmier-700 hover:to-palmier-800 transition-all duration-200 shadow-lg shadow-palmier-200/50"
                >
                  <Plus size={18} /> Créer un client
                </button>
              )
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200/60 bg-gradient-to-r from-gray-50/80 to-white/80">
                    <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Localisation</th>
                    <th className="px-5 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Séjours</th>
                    <th className="px-5 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Dépenses</th>
                    <th className="px-5 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                    <th className="px-5 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Segment</th>
                    <th className="px-5 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100/60">
                  {clients.map((client, index) => {
                    const statut = getClientStatut(client);
                    return (
                      <tr
                        key={client.id}
                        className="group hover:bg-palmier-50/30 transition-all duration-300 cursor-pointer"
                        onClick={() => openDetail(client)}
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`relative w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-xs transition-transform duration-300 group-hover:scale-110 ${
                              statut === 'VIP' ? 'bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-200/50' :
                              statut === 'REGULIER' ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-200/50' :
                              'bg-gradient-to-br from-palmier-400 to-palmier-600 shadow-lg shadow-palmier-200/50'
                            }`}>
                              {initiales(client.prenom, client.nom)}
                              {statut === 'VIP' && (
                                <div className="absolute -top-0.5 -right-0.5">
                                  <Star size={10} className="text-amber-400 fill-amber-400" />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 flex items-center gap-1.5">
                                {client.civilite} {client.prenom} {client.nom}
                                {client.vip && (
                                  <Star size={12} className="text-amber-500 fill-amber-500" />
                                )}
                              </p>
                              <p className="text-xs text-gray-400">
                                {client.canal_acquisition && CANAL_LABELS[client.canal_acquisition as CanalAcquisition]}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="space-y-0.5">
                            <p className="text-xs text-gray-600 flex items-center gap-1.5">
                              <Mail size={12} className="text-gray-400" />
                              {client.email}
                            </p>
                            {client.telephone && (
                              <p className="text-xs text-gray-600 flex items-center gap-1.5">
                                <Phone size={12} className="text-gray-400" />
                                {client.telephone}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="space-y-0.5">
                            <p className="text-xs text-gray-600 flex items-center gap-1.5">
                              <MapPin size={12} className="text-gray-400" />
                              {client.ville || '—'}
                            </p>
                            <p className="text-xs text-gray-400">
                              {client.pays || 'France'}
                            </p>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className="inline-flex items-center justify-center min-w-[32px] px-2 py-1 text-sm font-bold text-palmier-700 bg-palmier-50 rounded-lg">
                            {client.nb_sejours || 0}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="font-semibold text-emerald-600">
                            {client.montant_total_depense ? formatEuro(client.montant_total_depense) : '—'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <ClientStatusBadge statut={statut} size="sm" />
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <SegmentBadge segment={client.segment} />
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); openEdit(client); }}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-palmier-600 hover:bg-palmier-50 transition-all duration-200"
                              title="Modifier"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setConfirmRgpd(client.id); }}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200"
                              title="Export RGPD §5.2"
                            >
                              <Shield size={15} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setConfirmDelete(client.id); }}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-all duration-200"
                              title="Supprimer"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── FOOTER TABLEAU ─────────────────── */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-t border-gray-200/60 bg-gradient-to-r from-gray-50/60 to-white/60">
              <span className="text-sm text-gray-500">
                <span className="font-semibold text-gray-700">{total}</span> client{total > 1 ? 's' : ''} · Page {page} sur {totalPages || 1}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3.5 py-1.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 hover:scale-105 active:scale-95 transition-all duration-200"
                >
                  <ChevronDown size={14} className="rotate-90" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = page;
                  if (totalPages > 5) {
                    if (page <= 3) pageNum = i + 1;
                    else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                    else pageNum = page - 2 + i;
                  } else {
                    pageNum = i + 1;
                  }
                  if (pageNum < 1 || pageNum > totalPages) return null;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`min-w-[36px] h-[36px] text-sm font-medium rounded-lg transition-all duration-200 ${
                        pageNum === page
                          ? 'bg-palmier-600 text-white shadow-md shadow-palmier-200/50 scale-105'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3.5 py-1.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 hover:scale-105 active:scale-95 transition-all duration-200"
                >
                  <ChevronDown size={14} className="-rotate-90" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── MODAL CRÉATION/ÉDITION ────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fade-in-up">
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white/95 backdrop-blur-sm rounded-t-2xl">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                {editClient ? (
                  <>
                    <Edit2 size={18} className="text-palmier-600" />
                    Modifier {editClient.prenom} {editClient.nom}
                  </>
                ) : (
                  <>
                    <Plus size={18} className="text-palmier-600" />
                    Nouveau client
                  </>
                )}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="p-6">
              {formError && (
                <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center gap-2.5 animate-slide-in">
                  <AlertCircle size={16} className="text-rose-500" />
                  {formError}
                </div>
              )}

              <div className="space-y-4">
                {/* Identité */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Civilité</label>
                    <select
                      value={form.civilite}
                      onChange={e => setForm((f: any) => ({ ...f, civilite: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-palmier-400 focus:border-palmier-400 outline-none transition-shadow"
                    >
                      <option value="M.">M.</option>
                      <option value="Mme">Mme</option>
                      <option value="Mlle">Mlle</option>
                      <option value="Dr">Dr</option>
                      <option value="Prof">Prof</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Prénom *</label>
                    <input
                      type="text"
                      value={form.prenom}
                      onChange={e => setForm((f: any) => ({ ...f, prenom: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-palmier-400 focus:border-palmier-400 outline-none transition-shadow"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nom *</label>
                    <input
                      type="text"
                      value={form.nom}
                      onChange={e => setForm((f: any) => ({ ...f, nom: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-palmier-400 focus:border-palmier-400 outline-none transition-shadow"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => setForm((f: any) => ({ ...f, email: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-palmier-400 focus:border-palmier-400 outline-none transition-shadow"
                    />
                  </div>
                </div>

                {/* Contact */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Téléphone</label>
                    <input
                      type="tel"
                      value={form.telephone}
                      onChange={e => setForm((f: any) => ({ ...f, telephone: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-palmier-400 focus:border-palmier-400 outline-none transition-shadow"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Adresse</label>
                    <input
                      type="text"
                      value={form.adresse}
                      onChange={e => setForm((f: any) => ({ ...f, adresse: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-palmier-400 focus:border-palmier-400 outline-none transition-shadow"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Code postal</label>
                    <input
                      type="text"
                      value={form.code_postal}
                      onChange={e => setForm((f: any) => ({ ...f, code_postal: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-palmier-400 focus:border-palmier-400 outline-none transition-shadow"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Ville</label>
                    <input
                      type="text"
                      value={form.ville}
                      onChange={e => setForm((f: any) => ({ ...f, ville: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-palmier-400 focus:border-palmier-400 outline-none transition-shadow"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Pays</label>
                    <input
                      type="text"
                      value={form.pays}
                      onChange={e => setForm((f: any) => ({ ...f, pays: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-palmier-400 focus:border-palmier-400 outline-none transition-shadow"
                    />
                  </div>
                </div>

                {/* Classification */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Segment</label>
                    <select
                      value={form.segment}
                      onChange={e => setForm((f: any) => ({ ...f, segment: e.target.value as SegmentClient }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-palmier-400 focus:border-palmier-400 outline-none bg-white"
                    >
                      {Object.entries(SEGMENT_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Origine</label>
                    <select
                      value={form.origine_geographique}
                      onChange={e => setForm((f: any) => ({ ...f, origine_geographique: e.target.value as OrigineGeographique }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-palmier-400 focus:border-palmier-400 outline-none bg-white"
                    >
                      {Object.entries(ORIGINE_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Canal d'acquisition</label>
                    <select
                      value={form.canal_acquisition}
                      onChange={e => setForm((f: any) => ({ ...f, canal_acquisition: e.target.value as CanalAcquisition }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-palmier-400 focus:border-palmier-400 outline-none bg-white"
                    >
                      {Object.entries(CANAL_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Préférences */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Allergies</label>
                    <input
                      type="text"
                      value={form.allergies}
                      onChange={e => setForm((f: any) => ({ ...f, allergies: e.target.value }))}
                      placeholder="Ex: Arachides, Lactose..."
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-palmier-400 focus:border-palmier-400 outline-none transition-shadow"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Régime alimentaire</label>
                    <input
                      type="text"
                      value={form.regime_alimentaire}
                      onChange={e => setForm((f: any) => ({ ...f, regime_alimentaire: e.target.value }))}
                      placeholder="Ex: Végétarien, Sans gluten..."
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-palmier-400 focus:border-palmier-400 outline-none transition-shadow"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Chambre préférée</label>
                    <input
                      type="text"
                      value={form.chambre_preferee}
                      onChange={e => setForm((f: any) => ({ ...f, chambre_preferee: e.target.value }))}
                      placeholder="Ex: Chambre Vanille..."
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-palmier-400 focus:border-palmier-400 outline-none transition-shadow"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Commentaires privés</label>
                    <input
                      type="text"
                      value={form.commentaires_prives}
                      onChange={e => setForm((f: any) => ({ ...f, commentaires_prives: e.target.value }))}
                      placeholder="Informations internes..."
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-palmier-400 focus:border-palmier-400 outline-none transition-shadow"
                    />
                  </div>
                </div>

                {/* VIP */}
                <label className="flex items-center gap-2.5 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={form.vip}
                    onChange={e => setForm((f: any) => ({ ...f, vip: e.target.checked }))}
                    className="w-4.5 h-4.5 text-palmier-600 rounded focus:ring-palmier-400"
                  />
                  <span className="text-sm text-gray-700 flex items-center gap-1.5">
                    <Star size={14} className="text-amber-500" />
                    Client VIP — accès aux meilleurs tarifs et services exclusifs
                  </span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50/80 rounded-b-2xl">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 bg-gradient-to-r from-palmier-600 to-palmier-700 text-white text-sm font-medium rounded-xl hover:from-palmier-700 hover:to-palmier-800 transition-all duration-200 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-palmier-200/50"
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    {editClient ? 'Enregistrer' : 'Créer'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DÉTAIL CLIENT ────────────────── */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fade-in-up">
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white/95 backdrop-blur-sm rounded-t-2xl">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-xs ${
                  selectedClient && getClientStatut(selectedClient) === 'VIP'
                    ? 'bg-gradient-to-br from-amber-400 to-amber-600'
                    : selectedClient && getClientStatut(selectedClient) === 'REGULIER'
                    ? 'bg-gradient-to-br from-emerald-400 to-emerald-600'
                    : 'bg-gradient-to-br from-palmier-400 to-palmier-600'
                }`}>
                  {selectedClient ? initiales(selectedClient.prenom, selectedClient.nom) : '??'}
                </div>
                {selectedClient?.prenom} {selectedClient?.nom}
                {selectedClient?.vip && (
                  <Star size={16} className="text-amber-500 fill-amber-500" />
                )}
              </h2>
              <button onClick={() => { setShowDetail(false); setClientDetail(null); }} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="p-6">
              {loadingDetail ? (
                <div className="flex items-center justify-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-palmier-200 border-t-palmier-600 rounded-full animate-spin" />
                    <span className="text-sm text-gray-500">Chargement des détails...</span>
                  </div>
                </div>
              ) : clientDetail ? (
                <div className="space-y-6">
                  {/* Informations générales */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-xl p-3.5">
                      <p className="text-xs text-gray-400">Email</p>
                      <p className="font-medium text-gray-900 mt-0.5 flex items-center gap-1.5">
                        <Mail size={14} className="text-gray-400" />
                        {clientDetail.client.email}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3.5">
                      <p className="text-xs text-gray-400">Téléphone</p>
                      <p className="font-medium text-gray-900 mt-0.5 flex items-center gap-1.5">
                        <Phone size={14} className="text-gray-400" />
                        {clientDetail.client.telephone || '—'}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3.5">
                      <p className="text-xs text-gray-400">Adresse</p>
                      <p className="font-medium text-gray-900 mt-0.5 flex items-center gap-1.5">
                        <MapPin size={14} className="text-gray-400" />
                        {clientDetail.client.adresse || '—'}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3.5">
                      <p className="text-xs text-gray-400">Ville / Pays</p>
                      <p className="font-medium text-gray-900 mt-0.5">
                        {clientDetail.client.ville || '—'}, {clientDetail.client.pays || 'France'}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3.5">
                      <p className="text-xs text-gray-400">Client depuis</p>
                      <p className="font-medium text-gray-900 mt-0.5 flex items-center gap-1.5">
                        <Calendar size={14} className="text-gray-400" />
                        {formatDate(clientDetail.client.date_creation)}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3.5">
                      <p className="text-xs text-gray-400">Statut</p>
                      <div className="mt-0.5">
                        <ClientStatusBadge statut={getClientStatut(clientDetail.client)} size="md" />
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3.5">
                      <p className="text-xs text-gray-400">Segment</p>
                      <p className="font-medium text-gray-900 mt-0.5">
                        {clientDetail.client.segment && SEGMENT_LABELS[clientDetail.client.segment]}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3.5">
                      <p className="text-xs text-gray-400">Canal d'acquisition</p>
                      <p className="font-medium text-gray-900 mt-0.5">
                        {clientDetail.client.canal_acquisition && CANAL_LABELS[clientDetail.client.canal_acquisition]}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3.5">
                      <p className="text-xs text-gray-400">Nombre de séjours</p>
                      <p className="font-medium text-palmier-700 text-lg mt-0.5">{clientDetail.client.nb_sejours || 0}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3.5">
                      <p className="text-xs text-gray-400">Dépenses totales</p>
                      <p className="font-medium text-emerald-600 text-lg mt-0.5">
                        {clientDetail.client.montant_total_depense ? formatEuro(clientDetail.client.montant_total_depense) : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Préférences */}
                  {(clientDetail.client.allergies || clientDetail.client.regime_alimentaire || clientDetail.client.chambre_preferee) && (
                    <div className="bg-amber-50/50 rounded-xl p-4 border border-amber-200/50">
                      <p className="text-xs font-medium text-amber-700 uppercase tracking-wider mb-2">Préférences</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {clientDetail.client.allergies && (
                          <div><span className="text-gray-500">Allergies:</span> <span className="font-medium">{clientDetail.client.allergies}</span></div>
                        )}
                        {clientDetail.client.regime_alimentaire && (
                          <div><span className="text-gray-500">Régime:</span> <span className="font-medium">{clientDetail.client.regime_alimentaire}</span></div>
                        )}
                        {clientDetail.client.chambre_preferee && (
                          <div className="col-span-2"><span className="text-gray-500">Chambre préférée:</span> <span className="font-medium">{clientDetail.client.chambre_preferee}</span></div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Enfants */}
                  {clientDetail.enfants && clientDetail.enfants.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
                        <Users size={14} className="text-palmier-500" />
                        Enfants accompagnants ({clientDetail.enfants.length})
                      </p>
                      <div className="space-y-1.5">
                        {clientDetail.enfants.map((enfant: Enfant) => (
                          <div key={enfant.id} className="flex items-center justify-between text-sm p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <span className="font-medium">{enfant.prenom}</span>
                            <span className="text-gray-500">{enfant.age} ans</span>
                            {enfant.necessite_lit && (
                              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Lit bébé</span>
                            )}
                            <span className="text-xs text-gray-400">
                              Parent: {enfant.prenom_parent} {enfant.nom_parent}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Historique des séjours */}
                  {clientDetail.reservations && clientDetail.reservations.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
                        <Calendar size={14} className="text-palmier-500" />
                        Historique des séjours ({clientDetail.reservations.length})
                      </p>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {clientDetail.reservations.map((r: ReservationClient) => (
                          <div key={r.id} className="flex items-center justify-between text-sm p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-palmier-200 transition-all duration-200">
                            <div>
                              <span className="font-medium text-gray-900">{r.chambre_nom}</span>
                              <span className="text-gray-400 mx-2">•</span>
                              <span className="text-gray-600">{formatDate(r.date_arrivee)} → {formatDate(r.date_depart)}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-emerald-600">{formatEuro(r.montant_total)}</span>
                              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                                r.statut === 'TERMINEE' ? 'bg-emerald-100 text-emerald-700' :
                                r.statut === 'CONFIRMEE' ? 'bg-blue-100 text-blue-700' :
                                r.statut === 'ANNULEE' ? 'bg-rose-100 text-rose-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {r.statut}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
                    <button
                      onClick={() => { setShowDetail(false); openEdit(clientDetail.client); }}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-palmier-700 bg-palmier-50 rounded-xl hover:bg-palmier-100 transition-colors"
                    >
                      <Edit2 size={14} /> Modifier
                    </button>
                    <button
                      onClick={() => { setConfirmRgpd(clientDetail.client.id); setShowDetail(false); }}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
                    >
                      <Shield size={14} /> Export RGPD
                    </button>
                    <button
                      onClick={() => { setConfirmDelete(clientDetail.client.id); setShowDetail(false); }}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-rose-700 bg-rose-50 rounded-xl hover:bg-rose-100 transition-colors"
                    >
                      <Trash2 size={14} /> Supprimer
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRMATIONS ───────────────────────── */}
      <ConfirmDialog
        isOpen={!!confirmRgpd}
        title="Export des données RGPD"
        message="Exporter toutes les données personnelles de ce client au format PDF."
        onConfirm={() => confirmRgpd && handleRgpdExport(confirmRgpd)}
        onCancel={() => setConfirmRgpd(null)}
        variant="default"
        icon={<Shield size={20} className="text-blue-500" />}
      />

      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="Supprimer le client"
        message="Êtes-vous sûr de vouloir supprimer ce client ? Cette action est irréversible et sera tracée dans le journal des actions (§4.4)."
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
        variant="danger"
        icon={<AlertCircle size={20} className="text-rose-500" />}
      />

    </div>
  );
}
