// frontend/src/pages/ReservationsPage.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Plus, Search, Filter, CalendarDays,
  Eye, CheckCircle, XCircle,
  User, Euro, Mail, Phone, AlertCircle,
  RefreshCw, Trash2, Clock, Users,
  DollarSign, Building, MapPin, Star, Calendar as CalendarIcon,
  Bike, Plane, Wifi, Coffee, Wind, Snowflake, Tv,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { reservationService } from '../services/api';
import { useWebSocketContext } from '../context/WebSocketContext';
import { notifyAjout } from '../components/ui/AjoutNotification';

// ============================================
// TYPES
// ============================================

type StatutReservation = 'EN_ATTENTE_ACOMPTE' | 'CONFIRMEE' | 'ANNULEE' | 'TERMINEE' | 'NO_SHOW';
type StatutPaiement = 'COMPLET' | 'PARTIEL' | 'EN_ATTENTE' | 'IMPREVU';
type ModePaiement = 'ESPECES' | 'CARTE' | 'VIREMENT' | 'CHEQUE';

interface Chambre {
  id: number;
  nom: string;
  numero: string;
  capaciteAdultes: number;
  nbLitsSimples: number;
  nbLitsDoubles: number;
  nbLitsBebe: number;
  surfaceM2: number;
  vue: string;
  accessiblePMR: boolean;
  statut: string;
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
  statut: string;
  segment: string;
  vip: boolean;
  nb_sejours: number;
  montant_total_depense: number;
  allergies?: string;
  regime_alimentaire?: string;
  chambre_preferee?: string;
}

interface ServiceAnnexe {
  id: number;
  type: string;
  libelle: string;
  montant: number;
  dateHeureDebut: string;
  dateHeureFin: string;
  statut: string;
  quantite: number;
  details?: any;
}

interface Paiement {
  id: number;
  montant: number;
  mode: ModePaiement;
  typeVersement: string;
  dateHeure: string;
  reference: string;
}

interface Reservation {
  id: number;
  numeroReservation: string;
  dateArrivee: string;
  dateDepart: string;
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
  dateCreation: string;
  motifAnnulation?: string;
  client_prenom: string;
  client_nom: string;
  client_email: string;
  client_telephone: string;
  client_id: number;
  chambre_nom: string;
  chambre_numero: string;
  chambre_id: number;
  statut_paiement: StatutPaiement;
  groupe: boolean;
  canalAcquisition?: string;
  commentaire?: string;
  nbVelos?: number;
  client?: Client;
  chambre?: Chambre;
  chambres?: Chambre[];
  chambresChoisies?: Chambre[];
  services: ServiceAnnexe[];
  paiements: Paiement[];
}

// ============================================
// UTILITAIRES
// ============================================

const toNumber = (value: any): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value) || 0;
  return 0;
};

const safeFormat = (value: any, decimals: number = 0): string => {
  const num = toNumber(value);
  return num.toFixed(decimals);
};

const normalizeChambre = (chambre: any): Chambre | null => {
  if (!chambre) return null;
  return {
    id: chambre.id || chambre.chambreId || 0,
    nom: chambre.nom || chambre.chambre_nom || '',
    numero: chambre.numero || chambre.chambre_numero || '',
    capaciteAdultes: chambre.capaciteAdultes || chambre.capacite_adultes || 2,
    nbLitsSimples: chambre.nbLitsSimples || chambre.nb_lits_simples || 0,
    nbLitsDoubles: chambre.nbLitsDoubles || chambre.nb_lits_doubles || 0,
    nbLitsBebe: chambre.nbLitsBebe || chambre.nb_lits_bebe || 0,
    surfaceM2: chambre.surfaceM2 || chambre.surface_m2 || 0,
    vue: chambre.vue || 'JARDIN',
    accessiblePMR: chambre.accessiblePMR || chambre.accessible_pmr || false,
    statut: chambre.statut || 'DISPONIBLE',
    equipements: chambre.equipements || [],
  };
};

const getReservationChambres = (reservation: Reservation | null): Chambre[] => {
  if (!reservation) return [];
  const candidates = Array.isArray(reservation.chambresChoisies) && reservation.chambresChoisies.length > 0
    ? reservation.chambresChoisies
    : Array.isArray(reservation.chambres) && reservation.chambres.length > 0
      ? reservation.chambres
      : reservation.chambre
        ? [reservation.chambre]
        : [];

  const seen = new Set<number>();
  return candidates
    .map(normalizeChambre)
    .filter((chambre): chambre is Chambre => !!chambre && !seen.has(chambre.id) && seen.add(chambre.id));
};

// ============================================
// BADGE COMPOSANT
// ============================================

const Badge = ({ variant, label, className = '', icon }: { variant: string; label: string; className?: string; icon?: React.ReactNode }) => {
  const variants: Record<string, string> = {
    success: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    warning: 'bg-amber-100 text-amber-800 border-amber-300',
    danger: 'bg-rose-100 text-rose-800 border-rose-300',
    info: 'bg-sky-100 text-sky-800 border-sky-300',
    default: 'bg-gray-100 text-gray-700 border-gray-300',
    purple: 'bg-violet-100 text-violet-800 border-violet-300',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-full border ${variants[variant] || variants.default} ${className}`}>
      {icon}
      {label}
    </span>
  );
};

// ============================================
// SPINNER
// ============================================

const Spinner = () => (
  <div className="flex justify-center items-center py-8">
    <div className="animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent"></div>
  </div>
);

// ============================================
// EMPTY STATE
// ============================================

const EmptyState = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <div className="text-center py-12">
    <div className="text-gray-400 mb-3">{icon}</div>
    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
    <p className="text-sm text-gray-600 mt-1">{description}</p>
  </div>
);

// ============================================
// CONFIRM DIALOG
// ============================================

const ConfirmDialog = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  variant = 'default'
}: {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'default' | 'danger' | 'warning';
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
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
          variant === 'danger' ? 'bg-rose-100 text-rose-600' : 
          variant === 'warning' ? 'bg-amber-100 text-amber-600' : 
          'bg-emerald-100 text-emerald-600'
        }`}>
          {variant === 'danger' ? <Trash2 size={24} /> : 
           variant === 'warning' ? <AlertCircle size={24} /> : 
           <CheckCircle size={24} />}
        </div>
        <h3 className="text-lg font-semibold text-gray-900 text-center">{title}</h3>
        <p className="text-sm text-gray-700 mt-2 text-center">{message}</p>
        <div className="flex justify-center gap-3 mt-6">
          <button onClick={onCancel} className="px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl border border-gray-300 transition-all duration-200">
            Annuler
          </button>
          <button onClick={onConfirm} className={`px-5 py-2.5 text-sm font-medium text-white rounded-xl transition-all duration-200 hover:scale-[1.02] shadow-lg ${variantStyles[variant] || variantStyles.default}`}>
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// PAGINATION
// ============================================

const PAGE_SIZE = 10;

const Pagination = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
}: {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalItems === 0) return null;

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  // Build a compact list of page numbers with ellipses
  const pages: (number | 'ellipsis')[] = [];
  for (let page = 1; page <= totalPages; page++) {
    if (page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1) {
      pages.push(page);
    } else if (pages[pages.length - 1] !== 'ellipsis') {
      pages.push('ellipsis');
    }
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 bg-gray-50/60">
      <span className="text-xs text-gray-500">
        Affichage <span className="font-medium text-gray-700">{start}</span>–<span className="font-medium text-gray-700">{end}</span> sur{' '}
        <span className="font-medium text-gray-700">{totalItems}</span>
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="p-1.5 rounded-lg border border-gray-300 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition-all duration-200"
          aria-label="Page précédente"
        >
          <ChevronLeft size={16} />
        </button>

        {pages.map((page, idx) =>
          page === 'ellipsis' ? (
            <span key={`ellipsis-${idx}`} className="px-2 text-gray-400 text-xs select-none">…</span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`min-w-[32px] px-2 py-1.5 text-xs rounded-lg border transition-all duration-200 ${
                page === currentPage
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                  : 'border-gray-300 hover:bg-gray-100 text-gray-700'
              }`}
            >
              {page}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-lg border border-gray-300 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition-all duration-200"
          aria-label="Page suivante"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

// ============================================
// PAGE PRINCIPALE
// ============================================

export default function ReservationsPage() {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statut, setStatut] = useState<StatutReservation | ''>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ 
    id: number; 
    action: 'CONFIRMEE' | 'ANNULEE' | 'NO_SHOW' | 'SUPPRIMER'; 
    label: string;
    montantPenalite?: number;
  } | null>(null);

  const { isConnected, refreshChambres } = useWebSocketContext();

  // ============================================
  // TRANSFORMER UNE RÉSERVATION
  // ============================================

  const transformReservation = (r: any): Reservation => {
    const arrivee = new Date(r.dateArrivee);
    const depart = new Date(r.dateDepart);
    const nbNuits = Math.max(1, Math.ceil((depart.getTime() - arrivee.getTime()) / (1000 * 60 * 60 * 24)));

    const clientData = r.client || {};
    const chambreData = r.chambre || {};
    const chambresSelectionnees = (Array.isArray(r.chambresChoisies) && r.chambresChoisies.length > 0
      ? r.chambresChoisies
      : Array.isArray(r.chambres) && r.chambres.length > 0
        ? r.chambres
        : r.chambre
          ? [r.chambre]
          : []
    ).map(normalizeChambre).filter((chambre: Chambre | null): chambre is Chambre => !!chambre);

    return {
      id: r.id,
      numeroReservation: r.numero || r.numeroReservation || `RES-${String(r.id).padStart(4, '0')}`,
      dateArrivee: r.dateArrivee,
      dateDepart: r.dateDepart,
      nbAdultes: r.nbAdultes || 2,
      nbEnfants: r.nbEnfants || 0,
      nbNuits: nbNuits || 1,
      statut: r.statut || 'CONFIRMEE',
      petitDejeunerInclus: r.petitDejeunerInclus || false,
      montantTotal: toNumber(r.montantTotal),
      montantAcompte: toNumber(r.montantAcompte),
      montantSolde: toNumber(r.montantSolde),
      montantRestantDu: toNumber(r.montantRestantDu) || Math.max(0, toNumber(r.montantTotal) - toNumber(r.montantAcompte) - toNumber(r.montantSolde)),
      demandeSpeciale: r.demandesSpeciales || r.demandeSpeciale,
      heureArriveePrevisionnelle: r.horaireArriveeTardive || r.heureArriveePrevisionnelle,
      litBebe: r.litBebe || false,
      arriveeTardive: r.arriveeTardive || !!r.horaireArriveeTardive,
      dateCreation: r.createdAt || r.dateCreation || new Date().toISOString(),
      motifAnnulation: r.motifAnnulation,
      client_prenom: clientData.prenom || r.client_prenom || '',
      client_nom: clientData.nom || r.client_nom || '',
      client_email: clientData.email || r.client_email || '',
      client_telephone: clientData.telephone || r.client_telephone || '',
      client_id: r.clientId || r.client_id || 0,
      chambre_nom: chambreData.nom || r.chambre_nom || '',
      chambre_numero: chambreData.numero || r.chambre_numero || '',
      chambre_id: r.chambreId || r.chambre_id || 0,
      statut_paiement: r.statutPaiement || 'EN_ATTENTE',
      groupe: r.groupe || false,
      canalAcquisition: r.canalAcquisition || r.canal_acquisition || '',
      commentaire: r.commentaire || r.notesInternes || '',
      nbVelos: r.nbVelos || r.nb_velos || 0,
      client: clientData.id ? {
        id: clientData.id,
        civilite: clientData.civilite || '',
        nom: clientData.nom || '',
        prenom: clientData.prenom || '',
        email: clientData.email || '',
        telephone: clientData.telephone || '',
        adresse: clientData.adresse || '',
        code_postal: clientData.code_postal || '',
        ville: clientData.ville || '',
        pays: clientData.pays || 'France',
        statut: clientData.statut || 'NOUVEAU',
        segment: clientData.segment || 'TOURISTE_INDIVIDUEL',
        vip: clientData.vip || false,
        nb_sejours: clientData.nb_sejours || 0,
        montant_total_depense: clientData.montant_total_depense || 0,
        allergies: clientData.allergies,
        regime_alimentaire: clientData.regime_alimentaire,
        chambre_preferee: clientData.chambre_preferee
      } : undefined,
      chambre: chambresSelectionnees[0] || (chambreData.id ? normalizeChambre(chambreData) || undefined : undefined),
      chambres: chambresSelectionnees,
      chambresChoisies: chambresSelectionnees,
      services: (r.services || []).map((s: any) => ({
        id: s.id || 0,
        type: s.type || 'SERVICE',
        libelle: s.libelle || s.nom || 'Service',
        montant: toNumber(s.montant),
        dateHeureDebut: s.dateHeureDebut || s.dateDebut || new Date().toISOString(),
        dateHeureFin: s.dateHeureFin || s.dateFin || new Date().toISOString(),
        statut: s.statut || 'CONFIRME',
        quantite: s.quantite || 1,
        details: s.details || {}
      })),
      paiements: (r.paiements || []).map((p: any) => ({
        id: p.id || 0,
        montant: toNumber(p.montant),
        mode: p.mode || 'CARTE',
        typeVersement: p.typeVersement || 'ACOMPTE',
        dateHeure: p.dateHeure || p.date || new Date().toISOString(),
        reference: p.reference || ''
      }))
    };
  };

  // ============================================
  // CHARGEMENT DES DONNÉES
  // ============================================

  const loadReservations = useCallback(async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (statut) filters.statut = statut;
      if (search) filters.search = search;
      filters.include = ['client', 'chambre', 'paiements', 'services'];

      const response = await reservationService.getAll(filters);

      if (response?.success && response.data) {
        const transformed = response.data.map(transformReservation);
        setReservations(transformed);
      } else {
        setReservations([]);
      }
    } catch (error) {
      console.error('Erreur loadReservations:', error);
      notifyAjout('error', 'Erreur', 'Erreur lors du chargement des réservations');
      setReservations([]);
    } finally {
      setLoading(false);
    }
  }, [search, statut]);

  // ============================================
  // STATUTS
  // ============================================
  
  const statutReservationColor: Record<StatutReservation, string> = {
    'EN_ATTENTE_ACOMPTE': 'warning',
    'CONFIRMEE': 'success',
    'ANNULEE': 'danger',
    'TERMINEE': 'default',
    'NO_SHOW': 'danger'
  };

  const statutReservationIcon: Record<StatutReservation, React.ReactNode> = {
    'EN_ATTENTE_ACOMPTE': <Clock size={12} className="text-amber-600" />,
    'CONFIRMEE': <CheckCircle size={12} className="text-emerald-600" />,
    'ANNULEE': <XCircle size={12} className="text-rose-600" />,
    'TERMINEE': <CheckCircle size={12} className="text-gray-600" />,
    'NO_SHOW': <XCircle size={12} className="text-rose-600" />
  };

  const statutReservationLabel: Record<StatutReservation, string> = {
    'EN_ATTENTE_ACOMPTE': 'En attente',
    'CONFIRMEE': 'Confirmée',
    'ANNULEE': 'Annulée',
    'TERMINEE': 'Terminée',
    'NO_SHOW': 'No-show'
  };

  const statutPaiementColor: Record<StatutPaiement, string> = {
    'COMPLET': 'success',
    'PARTIEL': 'warning',
    'EN_ATTENTE': 'warning',
    'IMPREVU': 'danger'
  };

  const statutPaiementLabel: Record<StatutPaiement, string> = {
    'COMPLET': 'Complet',
    'PARTIEL': 'Partiel',
    'EN_ATTENTE': 'En attente',
    'IMPREVU': 'Imprévu'
  };

  const statutPaiementIcon: Record<StatutPaiement, React.ReactNode> = {
    'COMPLET': <CheckCircle size={12} className="text-emerald-600" />,
    'PARTIEL': <Clock size={12} className="text-amber-600" />,
    'EN_ATTENTE': <Clock size={12} className="text-amber-600" />,
    'IMPREVU': <AlertCircle size={12} className="text-rose-600" />
  };

  // ============================================
  // ACTIONS AVEC WEBSOCKET
  // ============================================

  const handleConfirmReservation = async (id: number) => {
    try {
      const response = await reservationService.update(id, { statut: 'CONFIRMEE' });
      if (response?.success) {
        notifyAjout('success', 'Réservation confirmée', 'La réservation a été confirmée avec succès');
        loadReservations();
        refreshChambres();
        try { localStorage.removeItem('chambres_cache'); } catch (e) { /* ignore */ }
      } else {
        notifyAjout('error', 'Erreur', response?.message || 'Erreur lors de la confirmation');
      }
    } catch (error: any) {
      notifyAjout('error', 'Erreur', error.response?.data?.message || 'Erreur lors de la confirmation');
    }
    setConfirmAction(null);
  };

  const handleAnnulerReservation = async (id: number) => {
    try {
      const reservation = reservations.find(r => r.id === id);
      if (!reservation) return;

      const response = await reservationService.cancel(id, reservation.motifAnnulation || 'Annulation par le client');
      if (response?.success) {
        const penalite = toNumber(response.data?.penalite);
        if (penalite > 0) {
          notifyAjout('success', 'Réservation annulée', `Pénalité: ${safeFormat(penalite, 2)}€`);
        } else {
          notifyAjout('success', 'Réservation annulée', 'Annulation gratuite');
        }
        loadReservations();
        refreshChambres();
        try { localStorage.removeItem('chambres_cache'); } catch (e) { /* ignore */ }
      } else {
        notifyAjout('error', 'Erreur', response?.message || 'Erreur lors de l\'annulation');
      }
    } catch (error: any) {
      notifyAjout('error', 'Erreur', error.response?.data?.message || 'Erreur lors de l\'annulation');
    }
    setConfirmAction(null);
  };

  const handleSupprimerReservation = async (id: number) => {
    try {
      const response = await reservationService.delete(id);
      if (response?.success) {
        notifyAjout('success', 'Réservation supprimée', 'La réservation a été supprimée définitivement');
        loadReservations();
        refreshChambres();
        try { localStorage.removeItem('chambres_cache'); } catch (e) { /* ignore */ }
      } else {
        notifyAjout('error', 'Erreur', response?.message || 'Erreur lors de la suppression');
      }
    } catch (error: any) {
      notifyAjout('error', 'Erreur', error.response?.data?.message || 'Erreur lors de la suppression');
    }
    setConfirmAction(null);
  };

  const handleAction = async () => {
    if (!confirmAction) return;
    if (confirmAction.action === 'CONFIRMEE') {
      await handleConfirmReservation(confirmAction.id);
    } else if (confirmAction.action === 'ANNULEE') {
      await handleAnnulerReservation(confirmAction.id);
    } else if (confirmAction.action === 'SUPPRIMER') {
      await handleSupprimerReservation(confirmAction.id);
    } else {
      setConfirmAction(null);
    }
  };

  const handleAnnulationClick = (reservation: Reservation) => {
    const arrivee = new Date(reservation.dateArrivee);
    const now = new Date();
    const daysToArrival = Math.ceil((arrivee.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    let penalite = 0;
    let message = 'Annuler cette réservation ?';
    
    if (daysToArrival > 7) {
      message = '✅ Annulation gratuite (plus de 7 jours avant l\'arrivée). Confirmer ?';
    } else if (daysToArrival >= 2 && daysToArrival <= 7) {
      penalite = toNumber(reservation.montantTotal) * 0.5;
      message = `⚠️ Annulation avec pénalité de 50% (${safeFormat(penalite, 2)}€). Confirmer ?`;
    } else if (daysToArrival < 2 && daysToArrival >= 0) {
      penalite = toNumber(reservation.montantTotal);
      message = `⚠️ Annulation avec pénalité de 100% (${safeFormat(penalite, 2)}€). Confirmer ?`;
    } else {
      message = 'Annuler cette réservation (déjà passée) ?';
    }

    setConfirmAction({ 
      id: reservation.id, 
      action: 'ANNULEE', 
      label: message,
      montantPenalite: penalite
    });
  };

  const handleSupprimerClick = (reservation: Reservation) => {
    setConfirmAction({ 
      id: reservation.id, 
      action: 'SUPPRIMER', 
      label: `⚠️ Supprimer définitivement la réservation ${reservation.numeroReservation} de ${reservation.client_prenom} ${reservation.client_nom} ? Cette action est irréversible !`
    });
  };

  // ============================================
  // STATISTIQUES
  // ============================================
  
  const stats = {
    total: reservations.length,
    confirmes: reservations.filter(r => r.statut === 'CONFIRMEE').length,
    enAttente: reservations.filter(r => r.statut === 'EN_ATTENTE_ACOMPTE').length,
    termines: reservations.filter(r => r.statut === 'TERMINEE').length,
    annules: reservations.filter(r => r.statut === 'ANNULEE').length,
    noShow: reservations.filter(r => r.statut === 'NO_SHOW').length,
    montantTotal: reservations.reduce((sum, r) => sum + toNumber(r.montantTotal), 0)
  };

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  // Revenir à la page 1 dès que la recherche ou le filtre changent
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statut]);

  // Éviter de rester bloqué sur une page vide (ex: après suppression)
  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(reservations.length / PAGE_SIZE));
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [reservations.length, currentPage]);

  const paginatedReservations = reservations.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const openDetails = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setShowDetails(true);
  };

  const chambresSelectionnees = getReservationChambres(selectedReservation);
  const chambrePrincipale = chambresSelectionnees[0] || selectedReservation?.chambre || null;

  return (
    <div className="space-y-5 p-4 lg:p-6">
      {/* En-tête avec indicateur WebSocket */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarDays size={24} className="text-emerald-600" />
            Gestion des réservations
            <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {stats.total}
            </span>
          </h1>
          <p className="text-sm text-gray-600 mt-0.5 flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1"><CheckCircle size={14} className="text-emerald-600" /> {stats.confirmes} confirmée{stats.confirmes !== 1 ? 's' : ''}</span>
            <span className="flex items-center gap-1"><Clock size={14} className="text-amber-600" /> {stats.enAttente} en attente</span>
            {stats.annules > 0 && <span className="flex items-center gap-1"><XCircle size={14} className="text-rose-600" /> {stats.annules} annulée{stats.annules !== 1 ? 's' : ''}</span>}
            {stats.noShow > 0 && <span className="flex items-center gap-1"><AlertCircle size={14} className="text-rose-600" /> {stats.noShow} no-show</span>}
            <span className="flex items-center gap-1 text-emerald-700 font-medium"><Euro size={14} /> {safeFormat(stats.montantTotal, 0)}€</span>
            <span className="flex items-center gap-1 text-xs">
              <span className={`inline-block w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-gray-400">{isConnected ? '🔗 Temps réel' : '📡 Hors ligne'}</span>
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => navigate('/reservations/nouvelle')} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all duration-200 text-sm font-medium shadow-lg hover:scale-[1.02]">
            <Plus size={16} /> Nouvelle réservation
          </button>
          <button onClick={loadReservations} className="p-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200" title="Rafraîchir">
            <RefreshCw size={16} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, chambre, n° réservation..."
              value={search}
              onChange={e => { setSearch(e.target.value); }}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-gray-900 placeholder-gray-500 transition-all duration-200"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-600" />
            <select
              value={statut}
              onChange={e => { setStatut(e.target.value as StatutReservation | ''); }}
              className="border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-gray-900 transition-all duration-200"
            >
              <option value="">Tous les statuts</option>
              <option value="EN_ATTENTE_ACOMPTE">⏳ En attente d'acompte</option>
              <option value="CONFIRMEE">✅ Confirmée</option>
              <option value="TERMINEE">✓ Terminée</option>
              <option value="ANNULEE">✕ Annulée</option>
              <option value="NO_SHOW">🚫 No-show</option>
            </select>
          </div>
          <button onClick={() => { setSearch(''); setStatut(''); }} className="text-sm text-gray-600 hover:text-gray-900 transition-colors duration-200">
            Réinitialiser
          </button>
          <span className="text-sm text-gray-600 ml-auto">{reservations.length} résultat{reservations.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-200">
          <button onClick={() => setStatut('')} className={`px-3 py-1.5 text-xs rounded-xl border transition-all duration-200 ${statut === '' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'border-gray-300 hover:bg-gray-50 text-gray-700'}`}>
            Tous ({stats.total})
          </button>
          <button onClick={() => setStatut('EN_ATTENTE_ACOMPTE')} className={`px-3 py-1.5 text-xs rounded-xl border transition-all duration-200 ${statut === 'EN_ATTENTE_ACOMPTE' ? 'bg-amber-500 text-white border-amber-500 shadow-md' : 'border-gray-300 hover:bg-gray-50 text-gray-700'}`}>
            ⏳ En attente ({stats.enAttente})
          </button>
          <button onClick={() => setStatut('CONFIRMEE')} className={`px-3 py-1.5 text-xs rounded-xl border transition-all duration-200 ${statut === 'CONFIRMEE' ? 'bg-emerald-500 text-white border-emerald-500 shadow-md' : 'border-gray-300 hover:bg-gray-50 text-gray-700'}`}>
            ✅ Confirmée ({stats.confirmes})
          </button>
          <button onClick={() => setStatut('TERMINEE')} className={`px-3 py-1.5 text-xs rounded-xl border transition-all duration-200 ${statut === 'TERMINEE' ? 'bg-gray-500 text-white border-gray-500 shadow-md' : 'border-gray-300 hover:bg-gray-50 text-gray-700'}`}>
            ✓ Terminée ({stats.termines})
          </button>
          <button onClick={() => setStatut('ANNULEE')} className={`px-3 py-1.5 text-xs rounded-xl border transition-all duration-200 ${statut === 'ANNULEE' ? 'bg-rose-500 text-white border-rose-500 shadow-md' : 'border-gray-300 hover:bg-gray-50 text-gray-700'}`}>
            ✕ Annulée ({stats.annules})
          </button>
          {stats.noShow > 0 && (
            <button onClick={() => setStatut('NO_SHOW')} className={`px-3 py-1.5 text-xs rounded-xl border transition-all duration-200 ${statut === 'NO_SHOW' ? 'bg-rose-500 text-white border-rose-500 shadow-md' : 'border-gray-300 hover:bg-gray-50 text-gray-700'}`}>
              🚫 No-show ({stats.noShow})
            </button>
          )}
        </div>
      </div>

      {/* Liste des réservations */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="py-16"><Spinner /></div>
        ) : reservations.length === 0 ? (
          <EmptyState icon={<CalendarDays size={48} className="text-gray-300" />} title="Aucune réservation trouvée" description={search || statut ? "Ajustez vos filtres pour voir plus de résultats" : "Créez votre première réservation"} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80 text-xs text-gray-500 font-semibold uppercase tracking-wider">
                    <th className="px-4 py-3 text-left">N°</th>
                    <th className="px-4 py-3 text-left">Client</th>
                    <th className="px-4 py-3 text-left">Chambre</th>
                    <th className="px-4 py-3 text-left">Arrivée</th>
                    <th className="px-4 py-3 text-left">Départ</th>
                    <th className="px-4 py-3 text-center">Pers.</th>
                    <th className="px-4 py-3 text-left">Montant</th>
                    <th className="px-4 py-3 text-left">Paiement</th>
                    <th className="px-4 py-3 text-left">Statut</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedReservations.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50/60 transition-colors cursor-pointer group" onClick={() => openDetails(r)}>
                      <td className="px-4 py-3"><span className="font-mono text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg">{r.numeroReservation}</span></td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 flex items-center gap-1.5">
                          {r.client_prenom} {r.client_nom}
                          {r.groupe && <Badge variant="purple" label="Groupe" icon={<Users size={10} />} />}
                          {r.client?.vip && <Star size={12} className="text-yellow-500 fill-yellow-500" />}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-1"><Mail size={12} className="text-gray-400" /> {r.client_email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{r.chambre_nom}</div>
                        <div className="text-xs text-gray-500">N° {r.chambre_numero}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {new Date(r.dateArrivee).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                        <span className="block text-xs text-gray-400">{new Date(r.dateArrivee).toLocaleDateString('fr-FR', { weekday: 'short' })}</span>
                        {r.arriveeTardive && <span className="inline-flex items-center gap-0.5 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full mt-0.5"><Clock size={10} /> Tardive</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {new Date(r.dateDepart).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                        <span className="block text-xs text-gray-400">{r.nbNuits} nuit{r.nbNuits > 1 ? 's' : ''}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-700">
                        <span className="font-medium">{r.nbAdultes + r.nbEnfants}</span>
                        {r.nbEnfants > 0 && <span className="block text-xs text-gray-400">dont {r.nbEnfants} enf.</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{safeFormat(r.montantTotal, 0)}€</div>
                        {toNumber(r.montantRestantDu) > 0 ? <span className="text-xs font-medium text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-full">Restant: {safeFormat(r.montantRestantDu, 0)}€</span> : <span className="text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">Payé</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statutPaiementColor[r.statut_paiement] || 'default'} label={statutPaiementLabel[r.statut_paiement] || r.statut_paiement} icon={statutPaiementIcon[r.statut_paiement]} />
                        {r.services.length > 0 && <span className="block text-xs text-sky-600 mt-0.5">+ {r.services.length} service{r.services.length > 1 ? 's' : ''}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statutReservationColor[r.statut] || 'default'} label={statutReservationLabel[r.statut] || r.statut} icon={statutReservationIcon[r.statut]} />
                        {r.statut === 'ANNULEE' && r.motifAnnulation && <div className="text-xs text-gray-400 mt-0.5 truncate max-w-[100px]">{r.motifAnnulation}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center justify-center gap-1.5">
                          {r.statut === 'EN_ATTENTE_ACOMPTE' && (
                            <button onClick={(e) => { e.stopPropagation(); setConfirmAction({ id: r.id, action: 'CONFIRMEE', label: 'Confirmer cette réservation après réception de l\'acompte ?' }); }} className="p-1.5 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-all duration-200 hover:scale-110" title="Confirmer (RG3)">
                              <CheckCircle size={16} className="text-emerald-700" />
                            </button>
                          )}
                          {(r.statut === 'EN_ATTENTE_ACOMPTE' || r.statut === 'CONFIRMEE') && (
                            <button onClick={(e) => { e.stopPropagation(); handleAnnulationClick(r); }} className="p-1.5 bg-rose-100 hover:bg-rose-200 rounded-lg transition-all duration-200 hover:scale-110" title="Annuler (RG5)">
                              <XCircle size={16} className="text-rose-700" />
                            </button>
                          )}
                          {(r.statut === 'ANNULEE' || r.statut === 'TERMINEE' || r.statut === 'NO_SHOW') && (
                            <button onClick={(e) => { e.stopPropagation(); handleSupprimerClick(r); }} className="p-1.5 bg-rose-100 hover:bg-rose-200 rounded-lg transition-all duration-200 hover:scale-110" title="Supprimer définitivement">
                              <Trash2 size={16} className="text-rose-700" />
                            </button>
                          )}
                          <button onClick={(e) => { e.stopPropagation(); navigate(`/reservations/${r.id}`); }} className="p-1.5 bg-violet-100 hover:bg-violet-200 rounded-lg transition-all duration-200 hover:scale-110" title="Voir détails">
                            <Eye size={16} className="text-violet-700" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalItems={reservations.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog isOpen={!!confirmAction} title={confirmAction?.action === 'SUPPRIMER' ? '🗑️ Suppression définitive' : confirmAction?.action === 'ANNULEE' ? '❌ Annulation' : '✅ Confirmation'} message={confirmAction?.label ?? ''} onConfirm={handleAction} onCancel={() => setConfirmAction(null)} variant={confirmAction?.action === 'ANNULEE' || confirmAction?.action === 'SUPPRIMER' ? 'danger' : 'default'} />

      {/* Modal Détails Réservation */}
      {showDetails && selectedReservation && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-2xl">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <CalendarDays size={20} className="text-emerald-600" />
                Détails de la réservation
                <Badge variant={statutReservationColor[selectedReservation.statut]} label={statutReservationLabel[selectedReservation.statut]} icon={statutReservationIcon[selectedReservation.statut]} />
              </h3>
              <button onClick={() => { setShowDetails(false); setSelectedReservation(null); }} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500 hover:text-gray-700">✕</button>
            </div>

            <div className="p-6 space-y-5">
              {/* En-tête */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Numéro</p>
                  <p className="font-mono font-bold text-emerald-700">{selectedReservation.numeroReservation}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Création</p>
                  <p className="font-medium text-gray-900">{new Date(selectedReservation.dateCreation).toLocaleString('fr-FR')}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Canal</p>
                  <p className="font-medium text-gray-900">{selectedReservation.canalAcquisition || 'DIRECT'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Groupe</p>
                  <p className="font-medium text-gray-900">{selectedReservation.groupe ? '👥 Oui' : 'Non'}</p>
                </div>
              </div>

              {/* CHAMBRE - DÉTAILS COMPLETS */}
              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                <h4 className="text-sm font-semibold text-emerald-800 flex items-center gap-2 mb-3">
                  <Building size={16} className="text-emerald-600" />
                  {chambresSelectionnees.length > 1 ? 'Chambres réservées' : 'Chambre réservée'}
                  <span className="ml-auto text-xs font-normal text-emerald-600 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                    {chambrePrincipale?.statut || 'Disponible'}
                  </span>
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-white rounded-lg p-3 border border-emerald-100">
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Nom</p>
                    <p className="font-bold text-gray-900 text-lg">{chambrePrincipale?.nom || selectedReservation.chambre_nom}</p>
                    <p className="text-xs text-gray-500">N° {chambrePrincipale?.numero || selectedReservation.chambre_numero || '—'}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-emerald-100">
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Capacité</p>
                    <p className="font-medium text-gray-900">{chambrePrincipale?.capaciteAdultes || 2} adultes</p>
                    <p className="text-xs text-gray-500">
                      {chambrePrincipale?.nbLitsSimples || 0} lit simple · {chambrePrincipale?.nbLitsDoubles || 0} lit double
                      {chambrePrincipale?.nbLitsBebe ? ` · ${chambrePrincipale.nbLitsBebe} lit bébé` : ''}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-emerald-100">
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Surface / Vue</p>
                    <p className="font-medium text-gray-900">{chambrePrincipale?.surfaceM2 || 0} m²</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Eye size={12} className="text-gray-400" />
                      {chambrePrincipale?.vue || 'Jardin'}
                    </p>
                    {chambrePrincipale?.accessiblePMR && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full inline-block mt-0.5">♿ Accessible PMR</span>
                    )}
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-emerald-100 col-span-2 md:col-span-1">
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Équipements</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {chambrePrincipale?.equipements?.map((eq: string, i: number) => {
                        const eqIcon: Record<string, React.ReactNode> = {
                          'climatisation': <Snowflake size={12} className="text-blue-500" />,
                          'ventilateur': <Wind size={12} className="text-gray-500" />,
                          'sèche-cheveux': <Wind size={12} className="text-purple-500" />,
                          'bouilloire': <Coffee size={12} className="text-amber-600" />,
                          'mini-réfrigérateur': <Coffee size={12} className="text-emerald-600" />,
                          'wifi': <Wifi size={12} className="text-sky-500" />,
                          'tv': <Tv size={12} className="text-gray-500" />,
                        };
                        return (
                          <span key={i} className="inline-flex items-center gap-0.5 text-xs bg-white px-1.5 py-0.5 rounded-full border border-gray-200 text-gray-700">
                            {eqIcon[eq] || null}
                            {eq}
                          </span>
                        );
                      })}
                      {!chambrePrincipale?.equipements?.length && (
                        <span className="text-xs text-gray-400">Aucun équipement</span>
                      )}
                    </div>
                  </div>
                </div>
                {chambresSelectionnees.length > 1 && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {chambresSelectionnees.map((chambre) => (
                      <div key={chambre.id} className="bg-white rounded-lg p-3 border border-emerald-100">
                        <p className="font-semibold text-gray-900">{chambre.nom}</p>
                        <p className="text-xs text-gray-500">N° {chambre.numero || '—'} · {chambre.surfaceM2 || 0} m²</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {chambre.capaciteAdultes || 0} adultes
                          {chambre.accessiblePMR ? ' · PMR' : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* CLIENT - DÉTAILS COMPLETS */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <h4 className="text-sm font-semibold text-blue-800 flex items-center gap-2 mb-3">
                  <User size={16} className="text-blue-600" />
                  Client
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-900 text-lg">
                        {selectedReservation.client_prenom} {selectedReservation.client_nom}
                      </p>
                      {selectedReservation.client?.vip && <Star size={16} className="text-yellow-500 fill-yellow-500" />}
                      {selectedReservation.client?.statut && (
                        <Badge variant={selectedReservation.client.statut === 'VIP' ? 'warning' : selectedReservation.client.statut === 'REGULIER' ? 'success' : 'default'} label={selectedReservation.client.statut} />
                      )}
                    </div>
                    <p className="text-sm text-gray-700 flex items-center gap-1"><Mail size={14} className="text-gray-400" /> {selectedReservation.client_email}</p>
                    <p className="text-sm text-gray-700 flex items-center gap-1"><Phone size={14} className="text-gray-400" /> {selectedReservation.client_telephone}</p>
                    {selectedReservation.client?.adresse && (
                      <p className="text-sm text-gray-700 flex items-center gap-1">
                        <MapPin size={14} className="text-gray-400" /> 
                        {selectedReservation.client.adresse}, {selectedReservation.client.ville} ({selectedReservation.client.code_postal})
                      </p>
                    )}
                  </div>
                  <div>
                    <div className="grid grid-cols-2 gap-2 bg-white rounded-lg p-3 border border-blue-100">
                      <div>
                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Segment</p>
                        <p className="font-medium text-gray-900">{selectedReservation.client?.segment || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Séjours</p>
                        <p className="font-medium text-gray-900">{selectedReservation.client?.nb_sejours || 0}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Dépenses totales</p>
                        <p className="font-medium text-emerald-700">{safeFormat(selectedReservation.client?.montant_total_depense || 0, 2)}€</p>
                      </div>
                    </div>
                    {(selectedReservation.client?.allergies || selectedReservation.client?.regime_alimentaire || selectedReservation.client?.chambre_preferee) && (
                      <div className="mt-2 bg-amber-50 rounded-lg p-2 border border-amber-200 text-xs">
                        {selectedReservation.client.allergies && <p><span className="font-semibold">Allergies:</span> {selectedReservation.client.allergies}</p>}
                        {selectedReservation.client.regime_alimentaire && <p><span className="font-semibold">Régime:</span> {selectedReservation.client.regime_alimentaire}</p>}
                        {selectedReservation.client.chambre_preferee && <p><span className="font-semibold">Chambre préférée:</span> {selectedReservation.client.chambre_preferee}</p>}
                      </div>
                    )}
                  </div>
                </div>
                {selectedReservation.demandeSpeciale && (
                  <div className="mt-3 bg-amber-50 rounded-lg p-2 border border-amber-200 text-sm">
                    <span className="font-semibold">📝 Demande spéciale:</span> {selectedReservation.demandeSpeciale}
                  </div>
                )}
                {selectedReservation.commentaire && (
                  <div className="mt-2 bg-gray-50 rounded-lg p-2 border border-gray-200 text-sm text-gray-700">
                    <span className="font-semibold">📌 Commentaire interne:</span> {selectedReservation.commentaire}
                  </div>
                )}
              </div>

              {/* SÉJOUR */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-3">
                  <CalendarIcon size={16} className="text-slate-600" />
                  Séjour
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Arrivée</p>
                    <p className="font-medium text-gray-900">{new Date(selectedReservation.dateArrivee).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                    {selectedReservation.heureArriveePrevisionnelle && <p className="text-xs text-amber-600">🕐 {selectedReservation.heureArriveePrevisionnelle}</p>}
                    {selectedReservation.arriveeTardive && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Arrivée tardive</span>}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Départ</p>
                    <p className="font-medium text-gray-900">{new Date(selectedReservation.dateDepart).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                    <p className="text-xs text-gray-500">{selectedReservation.nbNuits} nuits</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Adultes</p>
                    <p className="font-medium text-gray-900">{selectedReservation.nbAdultes}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Enfants</p>
                    <p className="font-medium text-gray-900">{selectedReservation.nbEnfants}</p>
                    {selectedReservation.litBebe && <span className="text-xs text-sky-600">🛏️ Lit bébé</span>}
                  </div>
                </div>
              </div>

              {/* TARIFS ET PAIEMENTS */}
              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                <h4 className="text-sm font-semibold text-emerald-800 flex items-center gap-2 mb-3">
                  <DollarSign size={16} className="text-emerald-600" />
                  Tarifs & Paiements
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div className="bg-white rounded-lg p-3 text-center border border-emerald-100">
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Total</p>
                    <p className="font-bold text-lg text-gray-900">{safeFormat(selectedReservation.montantTotal, 2)}€</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center border border-emerald-200 bg-emerald-50/30">
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Acompte</p>
                    <p className="font-bold text-lg text-emerald-700">{safeFormat(selectedReservation.montantAcompte, 2)}€</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center border border-gray-200">
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Solde</p>
                    <p className="font-bold text-lg text-gray-900">{safeFormat(selectedReservation.montantSolde, 2)}€</p>
                  </div>
                  <div className={`bg-white rounded-lg p-3 text-center border ${toNumber(selectedReservation.montantRestantDu) > 0 ? 'border-rose-200 bg-rose-50/30' : 'border-emerald-200 bg-emerald-50/30'}`}>
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Restant dû</p>
                    <p className={`font-bold text-lg ${toNumber(selectedReservation.montantRestantDu) > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                      {safeFormat(selectedReservation.montantRestantDu, 2)}€
                    </p>
                  </div>
                </div>

                {selectedReservation.services.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Services annexes</p>
                    <div className="space-y-1">
                      {selectedReservation.services.map((s: ServiceAnnexe) => (
                        <div key={s.id} className="flex justify-between items-center bg-white rounded-lg px-3 py-2 border border-gray-100">
                          <div className="flex items-center gap-2">
                            {s.type === 'LOCATION_VELO' && <Bike size={14} className="text-emerald-600" />}
                            {s.type === 'TRANSFERT_AEROPORT' && <Plane size={14} className="text-blue-600" />}
                            <span className="font-medium text-sm text-gray-900">{s.libelle || s.type}</span>
                            {s.quantite > 1 && <span className="text-xs text-gray-400">x{s.quantite}</span>}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-gray-900">{safeFormat(s.montant, 2)}€</span>
                            <Badge variant={s.statut === 'CONFIRME' ? 'success' : 'warning'} label={s.statut} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedReservation.paiements.length > 0 && (
                  <div className="mt-3 border-t border-emerald-200 pt-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Historique des paiements</p>
                    <div className="space-y-1">
                      {selectedReservation.paiements.map((p: Paiement) => (
                        <div key={p.id} className="flex justify-between text-sm bg-white rounded-lg px-3 py-2 border border-gray-100">
                          <span className="font-medium">{p.typeVersement}</span>
                          <span className="text-emerald-700 font-bold">{safeFormat(p.montant, 2)}€</span>
                          <span className="text-xs text-gray-500">{new Date(p.dateHeure).toLocaleDateString('fr-FR')} · {p.mode}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ANNULATION */}
              {selectedReservation.statut === 'ANNULEE' && selectedReservation.motifAnnulation && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                  <p className="text-sm font-semibold text-rose-700 flex items-center gap-2">
                    <AlertCircle size={16} className="text-rose-600" />
                    Motif d'annulation
                  </p>
                  <p className="text-sm text-gray-800 mt-1">{selectedReservation.motifAnnulation}</p>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3 rounded-b-2xl">
              <button onClick={() => { setShowDetails(false); setSelectedReservation(null); }} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl border border-gray-300 transition-all duration-200">
                Fermer
              </button>
              <button onClick={() => { navigate(`/reservations/${selectedReservation.id}`); }} className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center gap-2 transition-all duration-200 hover:scale-[1.02] shadow-lg">
                <Eye size={16} /> Modifier
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out forwards;
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out forwards;
        }
        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}