// frontend/src/pages/CalendrierPage.tsx
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon,
  BedDouble, Users, Clock, Filter, Eye,
  Building, X, Grid, RefreshCw, Home,
  Loader2, Sparkles, TrendingUp, User,
  CalendarRange, Coffee, Save, Bookmark,
  BookmarkCheck, LayoutGrid, LayoutList,
  Sun as SunIcon, Moon as MoonIcon,
  Wifi as WifiIcon, WifiOff, AlertCircle,
  ChevronDown, ChevronUp, Phone, Mail,
  History, Star, Award, UserCheck,
  Search, ChevronRight as ChevronRightIcon,
  UserCircle, Euro, Calendar as CalendarIcon2,
  MapPin, Link2, ExternalLink, Clock as ClockIcon,
  Heart // ✅ AJOUTÉ : Heart importé
} from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isToday, parseISO, isSameDay,
  addMonths, subMonths, startOfWeek, endOfWeek,
  getWeek, differenceInDays,
  isWithinInterval, addDays, subDays, isWeekend,
  addWeeks, subWeeks, startOfDay, endOfDay,
  differenceInCalendarDays, formatDistanceToNow
} from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../services/api';
import { useWebSocketContext } from '../context/WebSocketContext';

// ============================================================
// TYPES
// ============================================================

type StatutReservation = 'EN_ATTENTE_ACOMPTE' | 'CONFIRMEE' | 'ANNULEE' | 'TERMINEE' | 'NO_SHOW';
type StatutChambre = 'DISPONIBLE' | 'EN_MAINTENANCE' | 'HORS_SERVICE' | 'BLOQUEE';
type VueCalendrier = 'month' | 'week' | 'chambre' | 'trimestre';
type PlageHoraire = 'matin' | 'apres-midi' | 'soir' | 'toute';

interface Chambre {
  id: number;
  numero: string;
  nom: string;
  capaciteAdultes: number;
  nbLitsSimples: number;
  nbLitsDoubles: number;
  surfaceM2: number;
  vue: string;
  accessiblePMR: boolean;
  statut: StatutChambre;
  equipements: string[];
  tarif_base: number;
}

interface Client {
  id: number;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  statut?: string;
  nb_sejours?: number;
  nbSejoursRealises?: number;
  vip?: boolean;
  ville?: string;
  pays?: string;
  montant_total_depense?: number;
  montantTotalPaye?: number;
  civilite?: string;
  code_postal?: string;
  adresse?: string;
  dateCreation?: string;
  date_creation?: string;
}

interface Reservation {
  id: number;
  numero: string;
  dateArrivee: string;
  dateDepart: string;
  nbAdultes: number;
  nbEnfants: number;
  statut: StatutReservation;
  heureArrivee?: string;
  heureDepart?: string;
  client?: Client;
  chambre?: Chambre;
  chambreId?: number;
  nbNuits?: number;
  clientPrenom?: string;
  clientNom?: string;
  clientId?: number;
  chambreNom?: string;
  chambreNumero?: string;
  montantTotal?: number;
}

interface Blockage {
  id: number;
  chambreId: number;
  dateDebut: string;
  dateFin: string;
  motif?: string;
  type?: string;
}

interface EvenementCalendrier {
  id: number;
  type: 'RESERVATION' | 'BLOQUE' | 'MAINTENANCE';
  dateDebut: string;
  dateFin: string;
  statut?: StatutReservation;
  motif?: string;
  reservationId?: number;
  clientPrenom?: string;
  clientNom?: string;
  clientId?: number;
  chambreId: number;
  chambreNom: string;
  chambreNumero?: string;
  nbNuits?: number;
  nbAdultes?: number;
  nbEnfants?: number;
  heureArrivee?: string;
  heureDepart?: string;
  plageHoraire?: PlageHoraire;
  montantTotal?: number;
}

interface ClientAvecReservations extends Client {
  reservations: EvenementCalendrier[];
  nbReservations: number;
  totalNuits: number;
  totalDepense: number;
  dernierSejour?: Date;
  premierSejour?: Date;
  chambresFavorites: string[];
}

interface FiltresSauvegardes {
  nom: string;
  chambreId?: number | null;
  statut?: string;
  vue?: VueCalendrier;
  date?: string;
}

// ============================================================
// CONSTANTES COULEURS
// ============================================================

const STATUT_COLORS: Record<StatutReservation, { bg: string; text: string; dot: string; pill: string; border: string }> = {
  EN_ATTENTE_ACOMPTE: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    dot: 'bg-amber-400',
    pill: 'bg-amber-100 text-amber-800 border-amber-200',
    border: 'border-amber-200',
  },
  CONFIRMEE: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    dot: 'bg-emerald-500',
    pill: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    border: 'border-emerald-200',
  },
  ANNULEE: {
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    dot: 'bg-rose-400',
    pill: 'bg-rose-100 text-rose-800 border-rose-200',
    border: 'border-rose-200',
  },
  TERMINEE: {
    bg: 'bg-gray-50',
    text: 'text-gray-600',
    dot: 'bg-gray-400',
    pill: 'bg-gray-100 text-gray-600 border-gray-200',
    border: 'border-gray-200',
  },
  NO_SHOW: {
    bg: 'bg-rose-50',
    text: 'text-rose-900',
    dot: 'bg-rose-600',
    pill: 'bg-rose-200 text-rose-900 border-rose-300',
    border: 'border-rose-300',
  },
};

const STATUT_LABELS: Record<StatutReservation, string> = {
  EN_ATTENTE_ACOMPTE: 'En attente',
  CONFIRMEE: 'Confirmée',
  ANNULEE: 'Annulée',
  TERMINEE: 'Terminée',
  NO_SHOW: 'No-show',
};

const STATUT_CHAMBRE_COLORS: Record<StatutChambre, string> = {
  DISPONIBLE: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  EN_MAINTENANCE: 'bg-orange-100 text-orange-800 border-orange-200',
  HORS_SERVICE: 'bg-rose-100 text-rose-800 border-rose-200',
  BLOQUEE: 'bg-slate-100 text-slate-700 border-slate-200',
};

const STATUT_CHAMBRE_LABELS: Record<StatutChambre, string> = {
  DISPONIBLE: 'Disponible',
  EN_MAINTENANCE: 'Maintenance',
  HORS_SERVICE: 'Hors service',
  BLOQUEE: 'Bloquée',
};

const STATUT_CLIENT_LABELS: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  VIP: { label: '⭐ VIP', className: 'bg-purple-100 text-purple-800 border-purple-200', icon: <Award size={12} className="text-purple-500" /> },
  REGULIER: { label: '🔄 Régulier', className: 'bg-blue-100 text-blue-800 border-blue-200', icon: <UserCheck size={12} className="text-blue-500" /> },
  FIDELE: { label: '❤️ Fidèle', className: 'bg-rose-100 text-rose-800 border-rose-200', icon: <Heart size={12} className="text-rose-500" /> },
  NOUVEAU: { label: '🆕 Nouveau', className: 'bg-gray-100 text-gray-800 border-gray-200', icon: <User size={12} className="text-gray-500" /> },
};

// ============================================================
// SOUS-COMPOSANTS
// ============================================================

const PageSpinner = () => (
  <div className="flex flex-col items-center justify-center py-20 gap-4">
    <div className="relative w-12 h-12">
      <div className="absolute inset-0 rounded-full border-4 border-emerald-100" />
      <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-emerald-500 animate-spin" />
    </div>
    <p className="text-sm text-gray-400 tracking-wide">Chargement du calendrier...</p>
  </div>
);

const StatPill = ({
  label, value, icon, accent = 'emerald', sub,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: 'emerald' | 'amber' | 'rose' | 'sky' | 'slate' | 'purple';
  sub?: string;
}) => {
  const accents = {
    emerald: 'text-emerald-600 bg-emerald-50 ring-emerald-200/60',
    amber: 'text-amber-600 bg-amber-50 ring-amber-200/60',
    rose: 'text-rose-600 bg-rose-50 ring-rose-200/60',
    sky: 'text-sky-600 bg-sky-50 ring-sky-200/60',
    slate: 'text-slate-600 bg-slate-50 ring-slate-200/60',
    purple: 'text-purple-600 bg-purple-50 ring-purple-200/60',
  };
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl ring-1 ${accents[accent]} transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md bg-white`}>
      <div className="shrink-0 opacity-70">{icon}</div>
      <div className="min-w-0">
        <div className="text-[11px] font-medium opacity-60 uppercase tracking-wider truncate">{label}</div>
        <div className="text-xl font-bold leading-tight text-gray-900">{value}</div>
        {sub && <div className="text-[10px] opacity-50 truncate">{sub}</div>}
      </div>
    </div>
  );
};

const VueTabs = ({ value, onChange }: { value: VueCalendrier; onChange: (v: VueCalendrier) => void }) => {
  const tabs: { value: VueCalendrier; label: string; icon: React.ReactNode }[] = [
    { value: 'month', label: 'Mois', icon: <LayoutGrid size={14} /> },
    { value: 'week', label: 'Semaine', icon: <LayoutList size={14} /> },
    { value: 'chambre', label: 'Chambres', icon: <Building size={14} /> },
    { value: 'trimestre', label: '3 mois', icon: <CalendarRange size={14} /> },
  ];
  return (
    <div className="flex items-center gap-1 bg-gray-100/80 rounded-2xl p-1">
      {tabs.map(t => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
            value === t.value
              ? 'bg-white text-emerald-700 shadow-sm shadow-emerald-100/60 ring-1 ring-emerald-100/80'
              : 'text-gray-500 hover:text-gray-800 hover:bg-white/60'
          }`}
          title={t.label}
        >
          {t.icon}
          <span className="hidden sm:inline">{t.label}</span>
        </button>
      ))}
    </div>
  );
};

const EventChip = ({
  evt, onClick, size = 'normal',
}: {
  evt: EvenementCalendrier;
  onClick: () => void;
  size?: 'normal' | 'compact';
}) => {
  const isRes = evt.type === 'RESERVATION';
  const colorSet = isRes && evt.statut ? STATUT_COLORS[evt.statut] : null;
  const chipClass = colorSet
    ? `${colorSet.bg} ${colorSet.text} ${colorSet.border}`
    : evt.type === 'MAINTENANCE'
    ? 'bg-orange-50 border border-orange-200 text-orange-800'
    : 'bg-slate-100 border border-slate-200 text-slate-700';

  const label = evt.clientNom
    ? size === 'compact'
      ? `${evt.clientPrenom?.charAt(0) || ''}. ${evt.clientNom}`
      : `${evt.clientPrenom || ''} ${evt.clientNom}`
    : evt.motif || evt.type;

  return (
    <button
      onClick={onClick}
      className={`group w-full text-left rounded-lg px-2 py-1 text-[11px] font-medium truncate transition-all duration-150 hover:shadow-sm hover:brightness-95 border ${chipClass}`}
      title={label}
    >
      <span className="flex items-center gap-1.5 truncate">
        {colorSet && (
          <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${colorSet.dot}`} />
        )}
        <span className="truncate">{label}</span>
        {evt.nbNuits && evt.nbNuits > 0 && size !== 'compact' && (
          <span className="shrink-0 opacity-50 ml-auto text-[10px]">{evt.nbNuits}n</span>
        )}
      </span>
    </button>
  );
};

// ============================================================
// SECTION CLIENTS
// ============================================================

const ClientsSection = ({
  clients,
  evenements,
  loading,
  onSelectClient,
  selectedClientId
}: {
  clients: Client[];
  evenements: EvenementCalendrier[];
  loading: boolean;
  onSelectClient: (clientId: number | null) => void;
  selectedClientId: number | null;
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClientData, setSelectedClientData] = useState<ClientAvecReservations | null>(null);
  const [expandedClientId, setExpandedClientId] = useState<number | null>(null);

  // Construire les données clients avec leurs réservations
  const clientsAvecReservations = useMemo(() => {
    const map = new Map<number, ClientAvecReservations>();

    // Initialiser avec tous les clients
    clients.forEach(client => {
      map.set(client.id, {
        ...client,
        reservations: [],
        nbReservations: 0,
        totalNuits: 0,
        totalDepense: 0,
        chambresFavorites: [],
      });
    });

    // Ajouter les réservations
    evenements.forEach(evt => {
      if (evt.type === 'RESERVATION' && evt.clientId) {
        const clientData = map.get(evt.clientId);
        if (clientData) {
          clientData.reservations.push(evt);
          clientData.nbReservations++;
          clientData.totalNuits += evt.nbNuits || 0;
          clientData.totalDepense += evt.montantTotal || 0;

          // Suivi des chambres favorites
          if (evt.chambreNom && !clientData.chambresFavorites.includes(evt.chambreNom)) {
            clientData.chambresFavorites.push(evt.chambreNom);
          }

          // Dernier séjour
          const dateArrivee = parseISO(evt.dateDebut);
          if (!clientData.dernierSejour || dateArrivee > clientData.dernierSejour) {
            clientData.dernierSejour = dateArrivee;
          }
          if (!clientData.premierSejour || dateArrivee < clientData.premierSejour) {
            clientData.premierSejour = dateArrivee;
          }
        }
      }
    });

    // Filtrer les clients sans réservation si un filtre est actif
    const filtered = Array.from(map.values());

    return filtered.sort((a, b) => b.nbReservations - a.nbReservations);
  }, [clients, evenements]);

  // Filtrer par recherche
  const filteredClients = useMemo(() => {
    if (!searchTerm.trim()) return clientsAvecReservations;
    const q = searchTerm.toLowerCase().trim();
    return clientsAvecReservations.filter(c =>
      c.nom.toLowerCase().includes(q) ||
      c.prenom.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.telephone?.includes(q)
    );
  }, [clientsAvecReservations, searchTerm]);

  // Sélectionner un client pour afficher ses détails
  const handleSelectClient = (client: ClientAvecReservations) => {
    setSelectedClientData(client);
    setExpandedClientId(client.id);
    onSelectClient(client.id);
  };

  // Désélectionner
  const handleDeselectClient = () => {
    setSelectedClientData(null);
    setExpandedClientId(null);
    onSelectClient(null);
  };

  // Formater la date
  const formatDate = (date: Date) => {
    return format(date, 'dd MMM yyyy', { locale: fr });
  };

  // Obtenir le statut du client
  const getClientStatut = (client: ClientAvecReservations) => {
    if (client.vip || client.statut === 'VIP') return 'VIP';
    if (client.nbReservations >= 3) return 'FIDELE';
    if (client.nbReservations >= 2) return 'REGULIER';
    return 'NOUVEAU';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="animate-spin text-emerald-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* En-tête */}
      <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-xl">
            <Users size={18} className="text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">Clients</h3>
            <p className="text-xs text-gray-400">
              {clientsAvecReservations.filter(c => c.nbReservations > 0).length} clients actifs · {clients.length} total
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none text-gray-800 placeholder-gray-400 bg-gray-50 hover:bg-white transition-colors"
            />
          </div>
          {selectedClientData && (
            <button
              onClick={handleDeselectClient}
              className="px-3 py-2 text-xs font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Liste des clients */}
      <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
        {filteredClients.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Users size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aucun client trouvé</p>
          </div>
        ) : (
          filteredClients.map((client) => {
            const statut = getClientStatut(client);
            const statutConfig = STATUT_CLIENT_LABELS[statut] || STATUT_CLIENT_LABELS.NOUVEAU;
            const isExpanded = expandedClientId === client.id;

            return (
              <div
                key={client.id}
                className={`transition-all duration-200 ${
                  isExpanded ? 'bg-emerald-50/40' : 'hover:bg-gray-50/60'
                }`}
              >
                {/* Ligne client */}
                <div
                  className="px-5 py-3 flex items-center gap-4 cursor-pointer"
                  onClick={() => {
                    if (isExpanded) {
                      setExpandedClientId(null);
                      setSelectedClientData(null);
                      onSelectClient(null);
                    } else {
                      handleSelectClient(client);
                    }
                  }}
                >
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0 ${
                    statut === 'VIP' ? 'bg-gradient-to-br from-purple-500 to-purple-700' :
                    statut === 'FIDELE' ? 'bg-gradient-to-br from-rose-400 to-rose-600' :
                    statut === 'REGULIER' ? 'bg-gradient-to-br from-blue-400 to-blue-600' :
                    'bg-gradient-to-br from-gray-400 to-gray-600'
                  }`}>
                    {client.prenom?.charAt(0)}{client.nom?.charAt(0)}
                  </div>

                  {/* Infos client */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 text-sm">
                        {client.prenom} {client.nom}
                      </span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statutConfig.className}`}>
                        {statutConfig.icon}
                        {statutConfig.label}
                      </span>
                      {client.nbReservations > 0 && (
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                          {client.nbReservations} séjour{client.nbReservations > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5 flex-wrap">
                      {client.email && (
                        <span className="flex items-center gap-1">
                          <Mail size={11} className="text-gray-400" />
                          {client.email}
                        </span>
                      )}
                      {client.telephone && (
                        <span className="flex items-center gap-1">
                          <Phone size={11} className="text-gray-400" />
                          {client.telephone}
                        </span>
                      )}
                      {client.ville && (
                        <span className="flex items-center gap-1">
                          <MapPin size={11} className="text-gray-400" />
                          {client.ville}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stats rapides */}
                  {client.nbReservations > 0 && (
                    <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <CalendarIcon2 size={12} className="text-gray-400" />
                        {client.totalNuits} nuits
                      </span>
                      {client.totalDepense > 0 && (
                        <span className="flex items-center gap-1 font-medium text-emerald-600">
                          <Euro size={12} />
                          {client.totalDepense}€
                        </span>
                      )}
                    </div>
                  )}

                  <ChevronDown
                    size={16}
                    className={`text-gray-400 transition-transform duration-200 ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </div>

                {/* Détails étendus */}
                {isExpanded && (
                  <div className="px-5 pb-4 pt-1 border-t border-gray-100/60 animate-fadeIn">
                    {/* Informations détaillées */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                      <div className="bg-white rounded-xl p-3 border border-gray-100">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Contact</p>
                        <p className="text-sm text-gray-800 flex items-center gap-2 mt-1">
                          <Mail size={14} className="text-gray-400" />
                          {client.email || 'Non renseigné'}
                        </p>
                        <p className="text-sm text-gray-800 flex items-center gap-2">
                          <Phone size={14} className="text-gray-400" />
                          {client.telephone || 'Non renseigné'}
                        </p>
                        {client.adresse && (
                          <p className="text-sm text-gray-800 flex items-center gap-2">
                            <MapPin size={14} className="text-gray-400" />
                            {client.adresse}, {client.code_postal} {client.ville}
                          </p>
                        )}
                      </div>

                      <div className="bg-white rounded-xl p-3 border border-gray-100">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Statistiques</p>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <div>
                            <p className="text-[10px] text-gray-400">Séjours</p>
                            <p className="text-lg font-bold text-gray-900">{client.nbReservations}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400">Nuits totales</p>
                            <p className="text-lg font-bold text-gray-900">{client.totalNuits}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400">Dépenses</p>
                            <p className="text-lg font-bold text-emerald-600">{client.totalDepense}€</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400">Moyenne/séjour</p>
                            <p className="text-lg font-bold text-gray-700">
                              {client.nbReservations > 0 ? Math.round(client.totalDepense / client.nbReservations) : 0}€
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl p-3 border border-gray-100">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Activité</p>
                        {client.premierSejour && (
                          <p className="text-sm text-gray-700 flex items-center gap-2">
                            <History size={14} className="text-gray-400" />
                            Client depuis {formatDate(client.premierSejour)}
                          </p>
                        )}
                        {client.dernierSejour && (
                          <p className="text-sm text-gray-700 flex items-center gap-2">
                            <ClockIcon size={14} className="text-gray-400" />
                            Dernier séjour : {formatDistanceToNow(client.dernierSejour, { locale: fr, addSuffix: true })}
                          </p>
                        )}
                        {client.chambresFavorites.length > 0 && (
                          <p className="text-sm text-gray-700 flex items-center gap-2">
                            <BedDouble size={14} className="text-gray-400" />
                            Chambres favorites : {client.chambresFavorites.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Réservations du client */}
                    {client.reservations.length > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                          <CalendarIcon size={13} className="text-emerald-500" />
                          Historique des réservations
                        </p>
                        <div className="space-y-1.5">
                          {client.reservations
                            .sort((a, b) => new Date(b.dateDebut).getTime() - new Date(a.dateDebut).getTime())
                            .map((res) => {
                              const colorSet = res.statut ? STATUT_COLORS[res.statut] : null;
                              return (
                                <div
                                  key={res.id}
                                  className={`flex items-center justify-between p-2.5 rounded-xl border ${colorSet ? colorSet.border : 'border-gray-100'} ${
                                    colorSet ? colorSet.bg : 'bg-gray-50'
                                  } cursor-pointer hover:shadow-sm transition-all duration-200`}
                                  onClick={() => {
                                    if (res.reservationId) {
                                      window.location.href = `/reservations/${res.reservationId}`;
                                    }
                                  }}
                                >
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className={`w-2 h-2 rounded-full ${colorSet ? colorSet.dot : 'bg-gray-400'}`} />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium text-sm text-gray-800">
                                          {res.chambreNom || 'Chambre'}
                                        </span>
                                        {res.statut && (
                                          <span className={`text-[10px] font-medium ${colorSet ? colorSet.text : 'text-gray-500'}`}>
                                            · {STATUT_LABELS[res.statut] || res.statut}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-xs text-gray-500">
                                        {format(parseISO(res.dateDebut), 'dd MMM yyyy', { locale: fr })}
                                        {' → '}
                                        {format(parseISO(res.dateFin), 'dd MMM yyyy', { locale: fr })}
                                        {res.nbNuits && ` · ${res.nbNuits} nuits`}
                                        {res.nbAdultes && ` · ${res.nbAdultes} pers.`}
                                      </p>
                                    </div>
                                  </div>
                                  {res.montantTotal && res.montantTotal > 0 && (
                                    <span className="text-sm font-semibold text-emerald-600">
                                      {res.montantTotal}€
                                    </span>
                                  )}
                                  <ExternalLink size={14} className="text-gray-400 ml-2 shrink-0" />
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => {
                          if (client.id) {
                            window.location.href = `/clients/${client.id}`;
                          }
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-1.5"
                      >
                        <Eye size={12} /> Voir la fiche client
                      </button>
                      <button
                        onClick={() => {
                          if (client.id) {
                            window.location.href = `/communication?clientId=${client.id}`;
                          }
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1.5"
                      >
                        <Mail size={12} /> Envoyer un message
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.25s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function CalendrierPage() {
  const navigate = useNavigate();

  // ✅ WebSocket
  const { isConnected, subscribeToChannel } = useWebSocketContext();

  // ─── ÉTAT ────────────────────────────────────────────────
  const [currentDate, setCurrentDate] = useState(new Date());
  const [vue, setVue] = useState<VueCalendrier>('month');
  const [chambres, setChambres] = useState<Chambre[]>([]);
  const [evenements, setEvenements] = useState<EvenementCalendrier[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [filterChambre, setFilterChambre] = useState<number | null>(null);
  const [filterStatut, setFilterStatut] = useState<string>('');
  const [filterClient, setFilterClient] = useState<number | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EvenementCalendrier | null>(null);
  const [filtresSauvegardes, setFiltresSauvegardes] = useState<FiltresSauvegardes[]>([]);
  const [filtreActif, setFiltreActif] = useState<string | null>(null);
  const [showSaveFilter, setShowSaveFilter] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [plageHoraire, setPlageHoraire] = useState<PlageHoraire>('toute');
  const [showFilters, setShowFilters] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const scrollRef = useRef<HTMLDivElement>(null);
  const isFetching = useRef(false);

  // ─── FILTRES SAUVEGARDÉS ──────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem('calendrier_filtres');
      if (saved) {
        const parsed = JSON.parse(saved);
        setFiltresSauvegardes(Array.isArray(parsed) ? parsed : []);
      }
    } catch { /* noop */ }
  }, []);

  const saveFilters = () => {
    if (!filterName.trim()) { toast.error('Donnez un nom à ce filtre'); return; }
    const newFilter: FiltresSauvegardes = {
      nom: filterName.trim(),
      chambreId: filterChambre,
      statut: filterStatut || undefined,
      vue,
      date: format(currentDate, 'yyyy-MM-dd'),
    };
    const updated = [...filtresSauvegardes, newFilter];
    setFiltresSauvegardes(updated);
    localStorage.setItem('calendrier_filtres', JSON.stringify(updated));
    setShowSaveFilter(false);
    setFilterName('');
    toast.success('✅ Filtre sauvegardé');
  };

  const applySavedFilter = (f: FiltresSauvegardes) => {
    setFilterChambre(f.chambreId || null);
    setFilterStatut(f.statut || '');
    if (f.vue) setVue(f.vue);
    if (f.date) { const d = new Date(f.date); if (!isNaN(d.getTime())) setCurrentDate(d); }
    setFiltreActif(f.nom);
    toast.success(`📋 Filtre « ${f.nom} » appliqué`);
  };

  const deleteSavedFilter = (nom: string) => {
    const updated = filtresSauvegardes.filter(f => f.nom !== nom);
    setFiltresSauvegardes(updated);
    localStorage.setItem('calendrier_filtres', JSON.stringify(updated));
    if (filtreActif === nom) setFiltreActif(null);
    toast.success('🗑️ Filtre supprimé');
  };

  const resetFilters = () => {
    setFilterChambre(null);
    setFilterStatut('');
    setFilterClient(null);
    setPlageHoraire('toute');
    setFiltreActif(null);
    toast.success('🔄 Filtres réinitialisés');
  };

  // ─── DONNÉES ─────────────────────────────────────────────

  const generateEvenements = useCallback((
    chambresData: Chambre[],
    reservationsData: Reservation[],
    blockagesData: Blockage[]
  ): EvenementCalendrier[] => {
    const events: EvenementCalendrier[] = [];
    
    reservationsData.forEach((r: any) => {
      const heureArrivee = r.heureArrivee || r.horaireArriveeTardive || '';
      let plage: PlageHoraire = 'toute';
      if (heureArrivee) {
        const h = parseInt(heureArrivee.split(':')[0]);
        plage = h < 12 ? 'matin' : h < 18 ? 'apres-midi' : 'soir';
      }
      
      let nbNuits = r.nbNuits || 0;
      if (!nbNuits && r.dateArrivee && r.dateDepart) {
        const arrivee = new Date(r.dateArrivee);
        const depart = new Date(r.dateDepart);
        nbNuits = Math.max(1, Math.ceil((depart.getTime() - arrivee.getTime()) / (1000 * 60 * 60 * 24)));
      }
      
      const client = r.client || {};
      const chambre = r.chambre || {};
      
      events.push({
        id: r.id,
        type: 'RESERVATION',
        dateDebut: r.dateArrivee,
        dateFin: r.dateDepart,
        statut: r.statut,
        reservationId: r.id,
        clientPrenom: client.prenom || r.clientPrenom || '',
        clientNom: client.nom || r.clientNom || '',
        clientId: client.id || r.clientId || 0,
        chambreId: r.chambreId || chambre.id || 0,
        chambreNom: chambre.nom || r.chambreNom || '',
        chambreNumero: chambre.numero || r.chambreNumero || '',
        nbNuits: nbNuits,
        nbAdultes: r.nbAdultes || 2,
        nbEnfants: r.nbEnfants || 0,
        heureArrivee: heureArrivee || '15:00',
        heureDepart: r.heureDepart || '11:00',
        plageHoraire: plage,
        montantTotal: r.montantTotal || 0,
      });
    });
    
    blockagesData.forEach((b: any) => {
      const chambre = chambresData.find(c => c.id === b.chambreId);
      events.push({
        id: b.id + 10000,
        type: b.type === 'MAINTENANCE' ? 'MAINTENANCE' : 'BLOQUE',
        dateDebut: b.dateDebut,
        dateFin: b.dateFin,
        motif: b.motif,
        chambreId: b.chambreId,
        chambreNom: chambre?.nom || `Chambre ${b.chambreId}`,
        chambreNumero: chambre?.numero || '',
      });
    });
    
    return events;
  }, []);

  const loadData = useCallback(async () => {
    if (isFetching.current) return;
    isFetching.current = true;
    setLoading(true);

    try {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const startStr = format(monthStart, 'yyyy-MM-dd');
      const endStr = format(monthEnd, 'yyyy-MM-dd');

      const [chambresRes, reservationsRes, blockagesRes, clientsRes] = await Promise.all([
        api.get('/chambres'),
        api.get('/reservations', { 
          params: { 
            dateDebut: startStr, 
            dateFin: endStr,
            limit: 500 
          } 
        }).catch(() => ({ data: { data: [] } })),
        api.get('/chambres/blockages', { 
          params: { dateDebut: startStr, dateFin: endStr } 
        }).catch(() => ({ data: { data: [] } })),
        api.get('/clients?limit=200').catch(() => ({ data: { data: [] } })),
      ]);

      const chambresData = chambresRes.data?.data ?? chambresRes.data ?? [];
      const reservationsData = reservationsRes.data?.data ?? reservationsRes.data ?? [];
      const blockagesData = blockagesRes.data?.data ?? [];
      const clientsData = clientsRes.data?.data ?? [];

      setChambres(Array.isArray(chambresData) ? chambresData : []);
      setClients(Array.isArray(clientsData) ? clientsData : []);
      setEvenements(generateEvenements(
        Array.isArray(chambresData) ? chambresData : [],
        Array.isArray(reservationsData) ? reservationsData : [],
        Array.isArray(blockagesData) ? blockagesData : [],
      ));
      setLastRefresh(new Date());

    } catch (error) {
      console.error('[Calendrier] Erreur chargement:', error);
      toast.error('Erreur lors du chargement du calendrier');
    } finally {
      setLoading(false);
      isFetching.current = false;
      setTimeout(() => setMounted(true), 150);
    }
  }, [currentDate, generateEvenements]);

  // ─── WEBSOCKET ────────────────────────────────────────────

  useEffect(() => {
    if (isConnected) {
      subscribeToChannel('calendrier');
      subscribeToChannel('reservations');
      subscribeToChannel('chambres');
    }

    // Écouter les événements DOM
    const handleRefresh = () => {
      console.log('🔄 [Calendrier] Refresh via DOM event');
      loadData();
    };

    // ✅ Écouter les événements WebSocket via l'API
    const handleWebSocketMessage = (event: Event) => {
      const customEvent = event as CustomEvent;
      const data = customEvent.detail;
      
      if (data?.type === 'RESERVATION_CREATED' || 
          data?.type === 'RESERVATION_UPDATED' || 
          data?.type === 'RESERVATION_CANCELLED' ||
          data?.type === 'RESERVATION_DELETED' ||
          data?.type === 'REFRESH_CHAMBRES') {
        console.log('🔄 [WS] Mise à jour du calendrier:', data.type);
        loadData();
      }
    };

    // Ajouter les écouteurs d'événements DOM (pour le WebSocket)
    window.addEventListener('refresh-chambres', handleRefresh);
    window.addEventListener('chambre-updated', handleRefresh);
    window.addEventListener('reservation-created', handleRefresh);
    window.addEventListener('reservation-updated', handleRefresh);
    window.addEventListener('reservation-cancelled', handleRefresh);
    window.addEventListener('reservation-deleted', handleRefresh);
    
    // Écouter les messages WebSocket via CustomEvent
    window.addEventListener('websocket-message', handleWebSocketMessage);

    // Polling de secours
    const interval = setInterval(() => {
      if (!isConnected) {
        loadData();
      }
    }, 30000);

    return () => {
      window.removeEventListener('refresh-chambres', handleRefresh);
      window.removeEventListener('chambre-updated', handleRefresh);
      window.removeEventListener('reservation-created', handleRefresh);
      window.removeEventListener('reservation-updated', handleRefresh);
      window.removeEventListener('reservation-cancelled', handleRefresh);
      window.removeEventListener('reservation-deleted', handleRefresh);
      window.removeEventListener('websocket-message', handleWebSocketMessage);
      clearInterval(interval);
    };
  }, [subscribeToChannel, isConnected, loadData]);

  // ─── CHARGEMENT INITIAL ───────────────────────────────────

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [vue, currentDate]);

  // ─── NAVIGATION ───────────────────────────────────────────

  const prevPeriod = () => {
    if (vue === 'week') setCurrentDate(d => subWeeks(d, 1));
    else if (vue === 'trimestre') setCurrentDate(d => subMonths(d, 3));
    else setCurrentDate(d => subMonths(d, 1));
  };

  const nextPeriod = () => {
    if (vue === 'week') setCurrentDate(d => addWeeks(d, 1));
    else if (vue === 'trimestre') setCurrentDate(d => addMonths(d, 3));
    else setCurrentDate(d => addMonths(d, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // ─── CALCULS ─────────────────────────────────────────────

  const daysInMonth = useMemo(() => {
    return eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) });
  }, [currentDate]);

  const firstDayOffset = useMemo(() => (daysInMonth[0]?.getDay() + 6) % 7 || 0, [daysInMonth]);

  const filteredEvents = useMemo(() => {
    let evts = evenements;
    if (filterChambre) evts = evts.filter(e => e.chambreId === filterChambre);
    if (filterStatut) evts = evts.filter(e => e.statut === filterStatut);
    if (filterClient) evts = evts.filter(e => e.clientId === filterClient);
    if (plageHoraire !== 'toute') evts = evts.filter(e => e.plageHoraire === plageHoraire || !e.plageHoraire);
    return evts;
  }, [evenements, filterChambre, filterStatut, filterClient, plageHoraire]);

  const filteredChambres = useMemo(
    () => chambres.filter(c => !filterChambre || c.id === filterChambre),
    [chambres, filterChambre]
  );

  const getEventsForDay = useCallback((day: Date, chambreId?: number): EvenementCalendrier[] => {
    return filteredEvents.filter(evt => {
      const debut = parseISO(evt.dateDebut);
      const fin = parseISO(evt.dateFin);
      return isWithinInterval(day, { start: debut, end: subDays(fin, 1) })
        && (!chambreId || evt.chambreId === chambreId);
    });
  }, [filteredEvents]);

  const getDayStats = useCallback((day: Date) => {
    const events = getEventsForDay(day);
    const reservations = events.filter(e => e.type === 'RESERVATION' && e.statut !== 'ANNULEE' && e.statut !== 'NO_SHOW');
    const chambresOccupees = new Set(reservations.map(e => e.chambreId)).size;
    const totalChambres = chambres.filter(c => c.statut === 'DISPONIBLE' || c.statut === 'BLOQUEE').length;
    const tauxOccupation = totalChambres > 0 ? (chambresOccupees / totalChambres) * 100 : 0;
    return { 
      reservations: reservations.length, 
      chambresOccupees, 
      totalChambres, 
      tauxOccupation, 
      events,
      totalEvents: events.length
    };
  }, [getEventsForDay, chambres]);

  const globalStats = useMemo(() => {
    let totalOccupied = 0, totalReservations = 0, totalBlockages = 0;
    daysInMonth.forEach(day => {
      const s = getDayStats(day);
      totalOccupied += s.chambresOccupees;
      totalReservations += s.reservations;
      totalBlockages += s.events.filter(e => e.type !== 'RESERVATION').length;
    });
    const maxOcc = chambres.filter(c => c.statut === 'DISPONIBLE' || c.statut === 'BLOQUEE').length * daysInMonth.length;
    return {
      totalReservations,
      totalBlockages,
      tauxOccupation: maxOcc > 0 ? (totalOccupied / maxOcc) * 100 : 0,
      chambresDisponibles: chambres.filter(c => c.statut === 'DISPONIBLE').length,
      chambresTotal: chambres.length,
      totalNuits: daysInMonth.reduce((sum, d) => sum + getDayStats(d).chambresOccupees, 0),
    };
  }, [daysInMonth, chambres, getDayStats]);

  // ─── LABEL PÉRIODE ───────────────────────────────────────

  const periodeLabel = useMemo(() => {
    if (vue === 'week') return `Semaine ${getWeek(currentDate, { weekStartsOn: 1 })} · ${format(currentDate, 'MMMM yyyy', { locale: fr })}`;
    if (vue === 'trimestre') return `${format(currentDate, 'MMMM', { locale: fr })} – ${format(addMonths(currentDate, 2), 'MMMM yyyy', { locale: fr })}`;
    return format(currentDate, 'MMMM yyyy', { locale: fr });
  }, [vue, currentDate]);

  const hasActiveFilters = !!(filterChambre || filterStatut || filterClient || plageHoraire !== 'toute');

  // ──────────────────────────────────────────────────────────
  // VUES
  // ──────────────────────────────────────────────────────────

  const renderMonthView = () => (
    <div className="grid grid-cols-7">
      {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(j => (
        <div
          key={j}
          className={`py-3 text-center text-[11px] font-semibold uppercase tracking-widest border-b border-gray-100 ${
            ['Sam', 'Dim'].includes(j) ? 'text-gray-300' : 'text-gray-500'
          }`}
        >
          {j}
        </div>
      ))}

      {Array.from({ length: firstDayOffset }).map((_, i) => (
        <div key={`e-${i}`} className="min-h-[110px] border-r border-b border-gray-50 bg-gray-50/40" />
      ))}

      {daysInMonth.map(day => {
        const stats = getDayStats(day);
        const weekend = isWeekend(day);
        const today = isToday(day);
        const hasEvents = stats.events.length > 0;

        return (
          <div
            key={day.toISOString()}
            onClick={() => navigate(`/reservations?date=${format(day, 'yyyy-MM-dd')}`)}
            className={`group min-h-[110px] border-r border-b border-gray-100/80 p-2 cursor-pointer transition-all duration-200 hover:bg-emerald-50/40 hover:z-10 relative ${
              weekend ? 'bg-gray-50/30' : ''
            } ${today ? 'ring-2 ring-inset ring-emerald-400/60 bg-emerald-50/20' : ''}`}
          >
            <div className="flex items-start justify-between mb-1.5">
              <span
                className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-semibold transition-all duration-200 ${
                  today
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                    : weekend
                    ? 'text-gray-300'
                    : 'text-gray-700 group-hover:bg-gray-100'
                }`}
              >
                {format(day, 'd')}
              </span>
              {hasEvents && stats.totalChambres > 0 && (
                <span className="text-[10px] font-medium text-gray-400 tabular-nums">
                  {Math.round(stats.tauxOccupation)}%
                </span>
              )}
            </div>

            <div className="space-y-0.5">
              {stats.events.slice(0, 3).map(evt => {
                const isStart = isSameDay(day, parseISO(evt.dateDebut));
                if (!isStart) {
                  const colorSet = evt.type === 'RESERVATION' && evt.statut ? STATUT_COLORS[evt.statut] : null;
                  return (
                    <div
                      key={evt.id}
                      className={`h-5 rounded-sm opacity-30 ${
                        colorSet ? colorSet.bg : 'bg-gray-200'
                      }`}
                    />
                  );
                }
                return (
                  <EventChip
                    key={evt.id}
                    evt={evt}
                    size="normal"
                    onClick={() => {
                      if (evt.type === 'RESERVATION' && evt.reservationId) {
                        navigate(`/reservations/${evt.reservationId}`);
                      } else {
                        setSelectedEvent(evt);
                      }
                    }}
                  />
                );
              })}
              {stats.events.length > 3 && (
                <p className="text-[10px] text-gray-400 font-medium pl-1">
                  +{stats.events.length - 3} autre{stats.events.length - 3 > 1 ? 's' : ''}
                </p>
              )}
            </div>

            {stats.tauxOccupation > 0 && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-100">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-700"
                  style={{ width: `${Math.min(stats.tauxOccupation, 100)}%` }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const plages = [
      { key: 'matin' as PlageHoraire, label: 'Matin', heures: '8h – 12h', icon: <SunIcon size={13} />, color: 'text-amber-500' },
      { key: 'apres-midi' as PlageHoraire, label: 'Après-midi', heures: '12h – 18h', icon: <Coffee size={13} />, color: 'text-sky-500' },
      { key: 'soir' as PlageHoraire, label: 'Soir', heures: '18h – 22h', icon: <MoonIcon size={13} />, color: 'text-violet-500' },
    ];
    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="w-28 px-4 py-3 text-left" />
              {weekDays.map(day => (
                <th key={day.toISOString()} className={`px-2 py-3 text-center ${isToday(day) ? 'bg-emerald-50/60' : ''}`}>
                  <div className={`text-[11px] font-semibold uppercase tracking-widest ${isWeekend(day) ? 'text-gray-300' : 'text-gray-500'}`}>
                    {format(day, 'EEE', { locale: fr })}
                  </div>
                  <div className={`inline-flex items-center justify-center w-8 h-8 mx-auto mt-0.5 rounded-full text-sm font-bold ${
                    isToday(day)
                      ? 'bg-emerald-600 text-white'
                      : isWeekend(day)
                      ? 'text-gray-300'
                      : 'text-gray-800'
                  }`}>
                    {format(day, 'd')}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {plages.map(plage => (
              <tr key={plage.key} className="hover:bg-gray-50/60 transition-colors">
                <td className="px-4 py-4 border-r border-gray-100/80">
                  <div className={`flex items-center gap-2 ${plage.color}`}>{plage.icon}</div>
                  <div className="mt-1">
                    <p className="text-xs font-semibold text-gray-700">{plage.label}</p>
                    <p className="text-[10px] text-gray-400">{plage.heures}</p>
                  </div>
                </td>
                {weekDays.map(day => {
                  const events = getEventsForDay(day).filter(
                    e => e.plageHoraire === plage.key || e.plageHoraire === 'toute'
                  );
                  return (
                    <td key={day.toISOString()} className={`px-1.5 py-2 align-top ${isToday(day) ? 'bg-emerald-50/30' : ''}`}>
                      <div className="space-y-0.5 min-h-[40px]">
                        {events.slice(0, 3).map(evt => (
                          <EventChip
                            key={evt.id}
                            evt={evt}
                            size="compact"
                            onClick={() => evt.type === 'RESERVATION' && evt.reservationId
                              ? navigate(`/reservations/${evt.reservationId}`)
                              : setSelectedEvent(evt)
                            }
                          />
                        ))}
                        {events.length > 3 && (
                          <p className="text-[10px] text-gray-400 pl-1">+{events.length - 3}</p>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderChambreView = () => {
    const days = daysInMonth.slice(0, 21);
    return (
      <div className="overflow-x-auto" ref={scrollRef}>
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-white/95 backdrop-blur-md z-10 shadow-sm">
            <tr className="border-b border-gray-100">
              <th className="px-4 py-3 text-left sticky left-0 bg-white/95 min-w-[160px] z-20 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Chambre</th>
              <th className="px-3 py-3 text-left min-w-[100px] font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Statut</th>
              {days.map(day => (
                <th key={day.toISOString()} className={`px-0 py-3 text-center min-w-[34px] ${isWeekend(day) ? 'text-gray-300 bg-gray-50/60' : ''} ${isToday(day) ? 'bg-emerald-50' : ''}`}>
                  <div className={`text-[11px] font-bold ${isToday(day) ? 'text-emerald-600' : isWeekend(day) ? 'text-gray-300' : 'text-gray-600'}`}>
                    {format(day, 'd')}
                  </div>
                  <div className={`text-[9px] ${isWeekend(day) ? 'text-gray-200' : 'text-gray-300'}`}>
                    {format(day, 'EEE', { locale: fr })}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredChambres.map(chambre => (
              <tr key={chambre.id} className="hover:bg-emerald-50/20 transition-colors group">
                <td className="px-4 py-2.5 sticky left-0 bg-white group-hover:bg-emerald-50/20 border-r border-gray-50 z-10">
                  <div className="font-semibold text-gray-800 text-sm">{chambre.nom}</div>
                  <div className="text-[10px] text-gray-400">N°{chambre.numero}</div>
                </td>
                <td className="px-3 py-2.5">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium border ${STATUT_CHAMBRE_COLORS[chambre.statut]}`}>
                    {STATUT_CHAMBRE_LABELS[chambre.statut]}
                  </span>
                </td>
                {days.map(day => {
                  const evts = getEventsForDay(day, chambre.id);
                  const evt = evts[0];
                  if (!evt) return <td key={day.toISOString()} className={`px-0 py-2.5 ${isWeekend(day) ? 'bg-gray-50/30' : ''}`} />;
                  const isStart = isSameDay(day, parseISO(evt.dateDebut));
                  const colorSet = evt.type === 'RESERVATION' && evt.statut ? STATUT_COLORS[evt.statut] : null;
                  const bg = colorSet ? colorSet.dot : 'bg-slate-300';
                  return (
                    <td key={day.toISOString()} className="px-0.5 py-2.5">
                      <button
                        onClick={() => evt.type === 'RESERVATION' && evt.reservationId
                          ? navigate(`/reservations/${evt.reservationId}`)
                          : setSelectedEvent(evt)
                        }
                        className={`w-full h-6 rounded transition-all duration-150 hover:brightness-90 ${bg} ${isStart ? 'opacity-100' : 'opacity-60'}`}
                        title={evt.clientNom ? `${evt.clientPrenom} ${evt.clientNom}` : evt.motif || evt.type}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderTrimestreView = () => {
    const mois = [currentDate, addMonths(currentDate, 1), addMonths(currentDate, 2)];
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-2">
        {mois.map((moisDate, idx) => {
          const jours = eachDayOfInterval({ start: startOfMonth(moisDate), end: endOfMonth(moisDate) });
          const offset = (startOfMonth(moisDate).getDay() + 6) % 7;
          return (
            <div key={idx} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50 bg-gradient-to-r from-gray-50 to-white">
                <h3 className="font-bold text-gray-800 capitalize text-sm">
                  {format(moisDate, 'MMMM yyyy', { locale: fr })}
                </h3>
              </div>
              <div className="p-3">
                <div className="grid grid-cols-7 gap-0 mb-1">
                  {['L','M','M','J','V','S','D'].map((j, i) => (
                    <div key={i} className={`text-center text-[9px] font-semibold py-1 ${i >= 5 ? 'text-gray-300' : 'text-gray-400'}`}>{j}</div>
                  ))}
                  {Array.from({ length: offset }).map((_, i) => <div key={`e-${i}`} />)}
                  {jours.map(day => {
                    const stats = getDayStats(day);
                    const today = isToday(day);
                    const weekend = isWeekend(day);
                    return (
                      <div
                        key={day.toISOString()}
                        className={`relative flex items-center justify-center aspect-square text-[11px] rounded-md m-0.5 cursor-pointer transition-all ${
                          today ? 'bg-emerald-600 text-white font-bold' :
                          stats.chambresOccupees > 0 ? 'bg-emerald-50 text-emerald-800 font-medium' :
                          weekend ? 'text-gray-300' : 'text-gray-600 hover:bg-gray-100'
                        }`}
                        onClick={() => navigate(`/reservations?date=${format(day, 'yyyy-MM-dd')}`)}
                      >
                        {format(day, 'd')}
                        {stats.chambresOccupees > 0 && !today && (
                          <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-400" />
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="pt-2 border-t border-gray-50 flex justify-between text-[10px] text-gray-400">
                  <span>{jours.reduce((s, d) => s + getDayStats(d).reservations, 0)} réservations</span>
                  <span>{jours.reduce((s, d) => s + getDayStats(d).chambresOccupees, 0)} nuits occupées</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ──────────────────────────────────────────────────────────
  // RENDU PRINCIPAL
  // ──────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 lg:p-6 space-y-4">

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }
        .anim-slide { animation: slideUp 0.45s cubic-bezier(.22,1,.36,1) both; }
        .anim-fade  { animation: fadeIn 0.35s ease both; }
        .anim-scale { animation: scaleIn 0.35s cubic-bezier(.22,1,.36,1) both; }
        .delay-1 { animation-delay: 60ms; }
        .delay-2 { animation-delay: 120ms; }
        .delay-3 { animation-delay: 180ms; }
        .delay-4 { animation-delay: 240ms; }
      `}</style>

      {/* ══ EN-TÊTE ══════════════════════════════════════ */}
      <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${mounted ? 'anim-slide' : 'opacity-0'}`}>
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-300/40">
            <CalendarIcon size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">Calendrier</h1>
            <div className="flex items-center gap-3 mt-0.5 text-[12px] text-gray-400 flex-wrap">
              <span className="flex items-center gap-1">
                <BedDouble size={12} className="text-emerald-500" />
                {globalStats.chambresDisponibles}/{globalStats.chambresTotal} disponibles
              </span>
              <span className="w-px h-3 bg-gray-200" />
              <span className="flex items-center gap-1">
                <TrendingUp size={12} className="text-emerald-500" />
                {globalStats.tauxOccupation.toFixed(0)}% occupation
              </span>
              <span className="w-px h-3 bg-gray-200" />
              <span>{globalStats.totalReservations} réservations</span>
              <span className="w-px h-3 bg-gray-200" />
              {isConnected ? (
                <span className="flex items-center gap-1 text-emerald-500 text-[11px]">
                  <WifiIcon size={11} className="animate-pulse" /> Temps réel
                </span>
              ) : (
                <span className="flex items-center gap-1 text-gray-400 text-[11px]">
                  <WifiOff size={11} /> Hors ligne
                </span>
              )}
              {filtreActif && (
                <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[11px] font-medium border border-emerald-100">
                  <BookmarkCheck size={10} /> {filtreActif}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={loadData}
            disabled={loading}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-all duration-150"
            title="Rafraîchir"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => navigate('/reservations/nouvelle')}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-emerald-300/40 hover:from-emerald-700 hover:to-emerald-800 hover:shadow-lg transition-all duration-200 active:scale-95"
          >
            <Plus size={16} />
            Nouvelle réservation
          </button>
        </div>
      </div>

      {/* ══ STATS ════════════════════════════════════════ */}
      <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 ${mounted ? 'anim-slide delay-1' : 'opacity-0'}`}>
        <StatPill 
          label="Chambres" 
          value={`${globalStats.chambresDisponibles}/${globalStats.chambresTotal}`} 
          icon={<BedDouble size={16} />} 
          accent="emerald" 
          sub="disponibles" 
        />
        <StatPill
          label="Occupation"
          value={`${globalStats.tauxOccupation.toFixed(0)}%`}
          icon={<TrendingUp size={16} />}
          accent={globalStats.tauxOccupation > 70 ? 'emerald' : globalStats.tauxOccupation > 40 ? 'amber' : 'rose'}
          sub={`${globalStats.totalNuits} nuits occupées`}
        />
        <StatPill 
          label="Réservations" 
          value={globalStats.totalReservations} 
          icon={<Users size={16} />} 
          accent="sky" 
          sub="sur la période" 
        />
        <StatPill 
          label="Blocages" 
          value={globalStats.totalBlockages} 
          icon={<Clock size={16} />} 
          accent="slate" 
          sub="Maintenance / Indispo" 
        />
      </div>

      {/* ══ BARRE NAVIGATION ═════════════════════════════ */}
      <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${mounted ? 'anim-slide delay-2' : 'opacity-0'}`}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 flex-wrap">
          {/* Navigation période */}
          <div className="flex items-center gap-1">
            <button
              onClick={prevPeriod}
              className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
            >
              Aujourd'hui
            </button>
            <button
              onClick={nextPeriod}
              className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <h2 className="text-base font-bold text-gray-900 capitalize min-w-0 truncate flex-1">
            {periodeLabel}
          </h2>

          <VueTabs value={vue} onChange={setVue} />

          {/* Bouton filtres */}
          <button
            onClick={() => setShowFilters(f => !f)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
              hasActiveFilters || showFilters
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Filter size={13} />
            Filtres
            {hasActiveFilters && (
              <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] font-bold flex items-center justify-center">
                {[filterChambre, filterStatut, filterClient !== null && filterClient, plageHoraire !== 'toute'].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {/* Panneau filtres */}
        {showFilters && (
          <div className="px-4 py-3 bg-gray-50/60 border-b border-gray-100 flex flex-wrap gap-3 items-end anim-fade">
            <div className="flex flex-col gap-1 min-w-[140px]">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Chambre</label>
              <select
                value={filterChambre || ''}
                onChange={e => setFilterChambre(e.target.value ? Number(e.target.value) : null)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-400 outline-none text-gray-800"
              >
                <option value="">Toutes</option>
                {chambres.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1 min-w-[140px]">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Statut</label>
              <select
                value={filterStatut}
                onChange={e => setFilterStatut(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-400 outline-none text-gray-800"
              >
                <option value="">Tous</option>
                {Object.entries(STATUT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1 min-w-[140px]">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Client</label>
              <select
                value={filterClient || ''}
                onChange={e => setFilterClient(e.target.value ? Number(e.target.value) : null)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-400 outline-none text-gray-800"
              >
                <option value="">Tous</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>)}
              </select>
            </div>

            {vue === 'week' && (
              <div className="flex flex-col gap-1 min-w-[140px]">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Plage horaire</label>
                <select
                  value={plageHoraire}
                  onChange={e => setPlageHoraire(e.target.value as PlageHoraire)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-400 outline-none text-gray-800"
                >
                  <option value="toute">Toute la journée</option>
                  <option value="matin">🌅 Matin</option>
                  <option value="apres-midi">☕ Après-midi</option>
                  <option value="soir">🌙 Soir</option>
                </select>
              </div>
            )}

            <div className="flex items-end gap-2 ml-auto">
              {hasActiveFilters && (
                <button 
                  onClick={resetFilters} 
                  className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl bg-white transition-colors hover:bg-gray-50"
                >
                  Réinitialiser
                </button>
              )}
              <button
                onClick={() => setShowSaveFilter(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-600 border border-emerald-200 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition-colors"
              >
                <Save size={12} /> Sauvegarder
              </button>
            </div>
          </div>
        )}

        {/* Filtres sauvegardés */}
        {filtresSauvegardes.length > 0 && (
          <div className="px-4 py-2 flex items-center gap-2 flex-wrap border-b border-gray-50">
            <span className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider shrink-0">Sauvegardés :</span>
            {filtresSauvegardes.map(f => (
              <span
                key={f.nom}
                onClick={() => applySavedFilter(f)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-full border cursor-pointer transition-all ${
                  filtreActif === f.nom
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-gray-100 text-gray-600 border-gray-200 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700'
                }`}
              >
                <BookmarkCheck size={10} />
                {f.nom}
                <button
                  onClick={e => { e.stopPropagation(); deleteSavedFilter(f.nom); }}
                  className="opacity-60 hover:opacity-100 ml-0.5"
                >
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* ═══ CALENDRIER ═══════════════════════════════════ */}
        <div>
          {loading ? (
            <PageSpinner />
          ) : (
            <div className={mounted ? 'anim-fade' : 'opacity-0'}>
              {vue === 'month' && renderMonthView()}
              {vue === 'week' && renderWeekView()}
              {vue === 'chambre' && renderChambreView()}
              {vue === 'trimestre' && renderTrimestreView()}
            </div>
          )}
        </div>
      </div>

      {/* ═══ SECTION CLIENTS ═══════════════════════════════════ */}
      <ClientsSection
        clients={clients}
        evenements={evenements}
        loading={loading}
        onSelectClient={setFilterClient}
        selectedClientId={filterClient}
      />

      {/* ══ MODALE DÉTAILS ════════════════════════════════ */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm anim-fade"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden anim-scale"
            onClick={e => e.stopPropagation()}
          >
            {(() => {
              const colorSet = selectedEvent.type === 'RESERVATION' && selectedEvent.statut
                ? STATUT_COLORS[selectedEvent.statut] : null;
              return (
                <div className={`px-6 py-4 flex items-center justify-between border-b ${colorSet ? colorSet.bg : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">
                      {selectedEvent.type === 'RESERVATION' ? '📅' : selectedEvent.type === 'BLOQUE' ? '🔒' : '🔧'}
                    </span>
                    <div>
                      <h3 className="font-bold text-gray-900 text-base leading-tight">
                        {selectedEvent.type === 'RESERVATION'
                          ? `${selectedEvent.clientPrenom || ''} ${selectedEvent.clientNom || ''}`.trim() || 'Réservation'
                          : selectedEvent.motif || selectedEvent.type}
                      </h3>
                      {selectedEvent.chambreNom && (
                        <p className="text-xs text-gray-500">{selectedEvent.chambreNom}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-black/10 text-gray-500 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              );
            })()}

            <div className="p-6 space-y-3">
              {selectedEvent.type === 'RESERVATION' && selectedEvent.statut && (
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border ${STATUT_COLORS[selectedEvent.statut].pill}`}>
                    <span className={`w-2 h-2 rounded-full ${STATUT_COLORS[selectedEvent.statut].dot}`} />
                    {STATUT_LABELS[selectedEvent.statut]}
                  </span>
                  {selectedEvent.nbNuits && selectedEvent.nbNuits > 0 && (
                    <span className="text-sm text-gray-500">{selectedEvent.nbNuits} nuit{selectedEvent.nbNuits > 1 ? 's' : ''}</span>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Arrivée</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {format(parseISO(selectedEvent.dateDebut), 'dd MMM yyyy', { locale: fr })}
                  </p>
                  {selectedEvent.heureArrivee && (
                    <p className="text-xs text-emerald-600">{selectedEvent.heureArrivee}</p>
                  )}
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Départ</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {format(parseISO(selectedEvent.dateFin), 'dd MMM yyyy', { locale: fr })}
                  </p>
                  {selectedEvent.heureDepart && (
                    <p className="text-xs text-gray-400">{selectedEvent.heureDepart}</p>
                  )}
                </div>
              </div>

              {selectedEvent.type === 'RESERVATION' && (
                <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
                  <Users size={14} className="text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-700">
                    {selectedEvent.nbAdultes || 2} adulte{(selectedEvent.nbAdultes || 2) > 1 ? 's' : ''}
                    {selectedEvent.nbEnfants ? ` · ${selectedEvent.nbEnfants} enfant${selectedEvent.nbEnfants > 1 ? 's' : ''}` : ''}
                  </span>
                </div>
              )}

              {selectedEvent.motif && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Motif</p>
                  <p className="text-sm text-gray-700">{selectedEvent.motif}</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-50 flex justify-end gap-2">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Fermer
              </button>
              {selectedEvent.type === 'RESERVATION' && selectedEvent.reservationId && (
                <button
                  onClick={() => { setSelectedEvent(null); navigate(`/reservations/${selectedEvent.reservationId}`); }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-xl hover:from-emerald-700 hover:to-emerald-800 shadow-md shadow-emerald-200/50 transition-all active:scale-95"
                >
                  <Eye size={14} /> Voir la réservation
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ MODALE SAUVEGARDE FILTRE ══════════════════════ */}
      {showSaveFilter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm anim-fade">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden anim-scale">
            <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2 bg-gradient-to-r from-emerald-50 to-transparent">
              <Save size={16} className="text-emerald-600" />
              <h3 className="font-bold text-gray-900">Sauvegarder le filtre</h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-500 mb-4">Nommez ce filtre pour le retrouver facilement.</p>
              <input
                type="text"
                value={filterName}
                onChange={e => setFilterName(e.target.value)}
                placeholder="Ex : Été 2026, Chambres VIP…"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && saveFilters()}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-400 outline-none text-gray-800 placeholder-gray-300 transition-shadow"
              />
            </div>
            <div className="px-6 py-4 border-t border-gray-50 flex justify-end gap-2">
              <button 
                onClick={() => { setShowSaveFilter(false); setFilterName(''); }} 
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Annuler
              </button>
              <button 
                onClick={saveFilters} 
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-md shadow-emerald-200/50"
              >
                <Bookmark size={14} /> Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ BOUTON FLOATING POUR NOUVELLE RÉSERVATION ══════ */}
      <button
        onClick={() => navigate('/reservations/nouvelle')}
        className="fixed bottom-6 right-6 z-30 flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-2xl shadow-lg shadow-emerald-300/50 hover:from-emerald-700 hover:to-emerald-800 hover:shadow-xl transition-all duration-200 active:scale-95 lg:hidden"
      >
        <Plus size={18} />
        <span className="text-sm font-semibold">Réservation</span>
      </button>
    </div>
  );
}