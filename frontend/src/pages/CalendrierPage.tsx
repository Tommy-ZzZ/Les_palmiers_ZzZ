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
} from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isToday, parseISO, isSameDay,
  addMonths, subMonths, startOfWeek, endOfWeek,
  eachWeekOfInterval, getWeek, differenceInDays,
  isWithinInterval, addDays, subDays, isWeekend,
  addWeeks, subWeeks, startOfDay, endOfDay
} from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../services/api';

// ============================================================
// TYPES
// ============================================================

type StatutReservation = 'EN_ATTENTE_ACOMPTE' | 'CONFIRMEE' | 'ANNULEE' | 'TERMINEE' | 'NO_SHOW';
type StatutChambre = 'DISPONIBLE' | 'EN_MAINTENANCE' | 'HORS_SERVICE' | 'BLOQUEE';
type VueCalendrier = 'month' | 'week' | 'chambre' | 'client' | 'trimestre';
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
  client?: { prenom: string; nom: string; id: number };
  chambre?: { id: number; nom: string; numero: string };
  chambreId?: number;
  clientPrenom?: string;
  clientNom?: string;
  clientId?: number;
  chambreNom?: string;
  chambreNumero?: string;
  nbNuits?: number;
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

const STATUT_COLORS: Record<StatutReservation, { bg: string; text: string; dot: string; pill: string }> = {
  EN_ATTENTE_ACOMPTE: {
    bg: 'bg-amber-50 border border-amber-200',
    text: 'text-amber-800',
    dot: 'bg-amber-400',
    pill: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  CONFIRMEE: {
    bg: 'bg-emerald-50 border border-emerald-200',
    text: 'text-emerald-800',
    dot: 'bg-emerald-500',
    pill: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  ANNULEE: {
    bg: 'bg-rose-50 border border-rose-200',
    text: 'text-rose-800',
    dot: 'bg-rose-400',
    pill: 'bg-rose-100 text-rose-800 border-rose-200',
  },
  TERMINEE: {
    bg: 'bg-gray-50 border border-gray-200',
    text: 'text-gray-600',
    dot: 'bg-gray-400',
    pill: 'bg-gray-100 text-gray-600 border-gray-200',
  },
  NO_SHOW: {
    bg: 'bg-rose-50 border border-rose-300',
    text: 'text-rose-900',
    dot: 'bg-rose-600',
    pill: 'bg-rose-200 text-rose-900 border-rose-300',
  },
};

const STATUT_LABELS: Record<StatutReservation, string> = {
  EN_ATTENTE_ACOMPTE: 'En attente',
  CONFIRMEE: 'Confirmée',
  ANNULEE: 'Annulée',
  TERMINEE: 'Terminée',
  NO_SHOW: 'No-show',
};

const TYPE_COLORS: Record<string, string> = {
  BLOQUE: 'bg-slate-100 border border-slate-200 text-slate-700',
  MAINTENANCE: 'bg-orange-50 border border-orange-200 text-orange-800',
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

// ============================================================
// SOUS-COMPOSANTS
// ============================================================

const PageSpinner = () => (
  <div className="flex flex-col items-center justify-center py-20 gap-4">
    <div className="relative w-12 h-12">
      <div className="absolute inset-0 rounded-full border-4 border-palmier-100" />
      <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-palmier-500 animate-spin" />
    </div>
    <p className="text-sm text-gray-400 tracking-wide">Chargement...</p>
  </div>
);

const StatPill = ({
  label, value, icon, accent = 'palmier', sub,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: 'palmier' | 'emerald' | 'amber' | 'rose' | 'sky' | 'slate';
  sub?: string;
}) => {
  const accents = {
    palmier: 'text-palmier-600 bg-palmier-50 ring-palmier-200/60',
    emerald: 'text-emerald-600 bg-emerald-50 ring-emerald-200/60',
    amber: 'text-amber-600 bg-amber-50 ring-amber-200/60',
    rose: 'text-rose-600 bg-rose-50 ring-rose-200/60',
    sky: 'text-sky-600 bg-sky-50 ring-sky-200/60',
    slate: 'text-slate-600 bg-slate-50 ring-slate-200/60',
  };
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl ring-1 ${accents[accent]} transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md`}>
      <div className="shrink-0 opacity-70">{icon}</div>
      <div className="min-w-0">
        <div className="text-[11px] font-medium opacity-60 uppercase tracking-wider truncate">{label}</div>
        <div className="text-xl font-bold leading-tight">{value}</div>
        {sub && <div className="text-[10px] opacity-50 truncate">{sub}</div>}
      </div>
    </div>
  );
};

const VueTabs = ({ value, onChange }: { value: VueCalendrier; onChange: (v: VueCalendrier) => void }) => {
  const tabs: { value: VueCalendrier; label: string; icon: React.ReactNode }[] = [
    { value: 'month', label: 'Mois', icon: <LayoutGrid size={13} /> },
    { value: 'week', label: 'Semaine', icon: <LayoutList size={13} /> },
    { value: 'chambre', label: 'Chambres', icon: <Building size={13} /> },
    { value: 'client', label: 'Clients', icon: <User size={13} /> },
    { value: 'trimestre', label: '3 mois', icon: <CalendarRange size={13} /> },
  ];
  return (
    <div className="flex items-center gap-1 bg-gray-100/80 rounded-2xl p-1">
      {tabs.map(t => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
            value === t.value
              ? 'bg-white text-palmier-700 shadow-sm shadow-palmier-100/60 ring-1 ring-palmier-100/80'
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
    ? `${colorSet.bg} ${colorSet.text}`
    : evt.type === 'MAINTENANCE'
    ? TYPE_COLORS.MAINTENANCE
    : TYPE_COLORS.BLOQUE;

  const label = evt.clientNom
    ? size === 'compact'
      ? `${evt.clientPrenom?.charAt(0)}. ${evt.clientNom}`
      : `${evt.clientPrenom} ${evt.clientNom}`
    : evt.motif || evt.type;

  return (
    <button
      onClick={onClick}
      className={`group w-full text-left rounded-lg px-2 py-1 text-[11px] font-medium truncate transition-all duration-150 hover:shadow-sm hover:brightness-95 ${chipClass}`}
      title={label}
    >
      <span className="flex items-center gap-1.5 truncate">
        {colorSet && (
          <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${colorSet.dot}`} />
        )}
        <span className="truncate">{label}</span>
        {evt.nbNuits && evt.nbNuits > 0 && size !== 'compact' && (
          <span className="shrink-0 opacity-50 ml-auto">{evt.nbNuits}n</span>
        )}
      </span>
    </button>
  );
};

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function CalendrierPage() {
  const navigate = useNavigate();

  // ─── ÉTAT ────────────────────────────────────────────────
  const [currentDate, setCurrentDate] = useState(new Date());
  const [vue, setVue] = useState<VueCalendrier>('month');
  const [chambres, setChambres] = useState<Chambre[]>([]);
  const [evenements, setEvenements] = useState<EvenementCalendrier[]>([]);
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
  const [clientsList, setClientsList] = useState<{ id: number; prenom: string; nom: string }[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

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
    toast.success('Filtre sauvegardé');
  };

  const applySavedFilter = (f: FiltresSauvegardes) => {
    setFilterChambre(f.chambreId || null);
    setFilterStatut(f.statut || '');
    if (f.vue) setVue(f.vue);
    if (f.date) { const d = new Date(f.date); if (!isNaN(d.getTime())) setCurrentDate(d); }
    setFiltreActif(f.nom);
    toast.success(`Filtre « ${f.nom} » appliqué`);
  };

  const deleteSavedFilter = (nom: string) => {
    const updated = filtresSauvegardes.filter(f => f.nom !== nom);
    setFiltresSauvegardes(updated);
    localStorage.setItem('calendrier_filtres', JSON.stringify(updated));
    if (filtreActif === nom) setFiltreActif(null);
  };

  const resetFilters = () => {
    setFilterChambre(null);
    setFilterStatut('');
    setFilterClient(null);
    setPlageHoraire('toute');
    setFiltreActif(null);
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
      events.push({
        id: r.id,
        type: 'RESERVATION',
        dateDebut: r.dateArrivee,
        dateFin: r.dateDepart,
        statut: r.statut,
        reservationId: r.id,
        clientPrenom: r.client?.prenom ?? r.clientPrenom ?? '',
        clientNom: r.client?.nom ?? r.clientNom ?? '',
        clientId: r.client?.id ?? r.clientId ?? 0,
        chambreId: r.chambreId ?? r.chambre?.id ?? 0,
        chambreNom: r.chambre?.nom ?? r.chambreNom ?? '',
        chambreNumero: r.chambre?.numero ?? r.chambreNumero ?? '',
        nbNuits: r.nbNuits || 0,
        nbAdultes: r.nbAdultes || 2,
        nbEnfants: r.nbEnfants || 0,
        heureArrivee: heureArrivee || '15:00',
        heureDepart: r.heureDepart || '11:00',
        plageHoraire: plage,
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
    setLoading(true);
    try {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const [chambresRes, reservationsRes, blockagesRes, clientsRes] = await Promise.all([
        api.get('/chambres'),
        api.get('/reservations', { params: { dateDebut: format(monthStart, 'yyyy-MM-dd'), dateFin: format(monthEnd, 'yyyy-MM-dd') } }),
        api.get('/chambres/blockages', { params: { dateDebut: format(monthStart, 'yyyy-MM-dd'), dateFin: format(monthEnd, 'yyyy-MM-dd') } }).catch(() => ({ data: { data: [] } })),
        api.get('/clients?limit=100').catch(() => ({ data: { data: [] } })),
      ]);
      const chambresData = chambresRes.data.data ?? chambresRes.data;
      const reservationsData = reservationsRes.data.data ?? reservationsRes.data;
      const blockagesData = blockagesRes.data?.data ?? [];
      const clientsData = clientsRes.data?.data ?? [];
      setChambres(Array.isArray(chambresData) ? chambresData : []);
      setClientsList(Array.isArray(clientsData) ? clientsData : []);
      setEvenements(generateEvenements(
        Array.isArray(chambresData) ? chambresData : [],
        Array.isArray(reservationsData) ? reservationsData : [],
        Array.isArray(blockagesData) ? blockagesData : [],
      ));
    } catch {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
      setTimeout(() => setMounted(true), 100);
    }
  }, [currentDate, generateEvenements]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [vue, currentDate]);

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
    const reservations = events.filter(e => e.type === 'RESERVATION' && e.statut !== 'ANNULEE');
    const chambresOccupees = new Set(reservations.map(e => e.chambreId)).size;
    const totalChambres = chambres.filter(c => c.statut === 'DISPONIBLE' || c.statut === 'BLOQUEE').length;
    const tauxOccupation = totalChambres > 0 ? (chambresOccupees / totalChambres) * 100 : 0;
    return { reservations: reservations.length, chambresOccupees, totalChambres, tauxOccupation, events };
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
    };
  }, [daysInMonth, chambres, getDayStats]);

  // ─── LABEL PÉRIODE ───────────────────────────────────────
  const periodeLabel = useMemo(() => {
    if (vue === 'week') return `Semaine ${getWeek(currentDate, { weekStartsOn: 1 })} · ${format(currentDate, 'MMMM yyyy', { locale: fr })}`;
    if (vue === 'trimestre') return `${format(currentDate, 'MMMM', { locale: fr })} – ${format(addMonths(currentDate, 2), 'MMMM yyyy', { locale: fr })}`;
    return format(currentDate, 'MMMM yyyy', { locale: fr });
  }, [vue, currentDate]);

  // ──────────────────────────────────────────────────────────
  // VUES
  // ──────────────────────────────────────────────────────────

  const renderMonthView = () => (
    <div className="grid grid-cols-7">
      {/* Header jours */}
      {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(j => (
        <div
          key={j}
          className={`py-3 text-center text-[11px] font-semibold uppercase tracking-widest border-b border-gray-100 ${
            ['Sam', 'Dim'].includes(j) ? 'text-gray-300' : 'text-gray-400'
          }`}
        >
          {j}
        </div>
      ))}

      {/* Jours vides */}
      {Array.from({ length: firstDayOffset }).map((_, i) => (
        <div key={`e-${i}`} className="min-h-[110px] border-r border-b border-gray-50 bg-gray-50/40" />
      ))}

      {/* Jours du mois */}
      {daysInMonth.map(day => {
        const stats = getDayStats(day);
        const weekend = isWeekend(day);
        const today = isToday(day);
        const hasEvents = stats.events.length > 0;

        return (
          <div
            key={day.toISOString()}
            onClick={() => navigate(`/reservations?date=${format(day, 'yyyy-MM-dd')}`)}
            className={`group min-h-[110px] border-r border-b border-gray-100/80 p-2 cursor-pointer transition-all duration-200 hover:bg-palmier-50/40 hover:z-10 relative ${
              weekend ? 'bg-gray-50/30' : ''
            } ${today ? 'ring-2 ring-inset ring-palmier-400/60 bg-palmier-50/20' : ''}`}
          >
            {/* Numéro du jour */}
            <div className="flex items-start justify-between mb-1.5">
              <span
                className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-semibold transition-all duration-200 ${
                  today
                    ? 'bg-palmier-600 text-white shadow-md shadow-palmier-200'
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

            {/* Événements */}
            <div className="space-y-0.5">
              {stats.events.slice(0, 3).map(evt => {
                const isStart = isSameDay(day, parseISO(evt.dateDebut));
                if (!isStart) {
                  // Continuation bar
                  const colorSet = evt.type === 'RESERVATION' && evt.statut ? STATUT_COLORS[evt.statut] : null;
                  return (
                    <div
                      key={evt.id}
                      className={`h-5 rounded-sm opacity-30 ${
                        colorSet ? colorSet.bg.split(' ')[0] : 'bg-gray-200'
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

            {/* Barre d'occupation */}
            {stats.tauxOccupation > 0 && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-100">
                <div
                  className="h-full bg-gradient-to-r from-palmier-400 to-palmier-500 transition-all duration-700"
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
                <th key={day.toISOString()} className={`px-2 py-3 text-center ${isToday(day) ? 'bg-palmier-50/60' : ''}`}>
                  <div className={`text-[11px] font-semibold uppercase tracking-widest ${isWeekend(day) ? 'text-gray-300' : 'text-gray-400'}`}>
                    {format(day, 'EEE', { locale: fr })}
                  </div>
                  <div className={`inline-flex items-center justify-center w-8 h-8 mx-auto mt-0.5 rounded-full text-sm font-bold ${
                    isToday(day)
                      ? 'bg-palmier-600 text-white'
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
                    <td key={day.toISOString()} className={`px-1.5 py-2 align-top ${isToday(day) ? 'bg-palmier-50/30' : ''}`}>
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
    const days = daysInMonth.slice(0, 21); // montrer 3 semaines max pour lisibilité
    return (
      <div className="overflow-x-auto" ref={scrollRef}>
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-white/95 backdrop-blur-md z-10 shadow-sm">
            <tr className="border-b border-gray-100">
              <th className="px-4 py-3 text-left sticky left-0 bg-white/95 min-w-[160px] z-20 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Chambre</th>
              <th className="px-3 py-3 text-left min-w-[100px] font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Statut</th>
              {days.map(day => (
                <th key={day.toISOString()} className={`px-0 py-3 text-center min-w-[34px] ${isWeekend(day) ? 'text-gray-300 bg-gray-50/60' : ''} ${isToday(day) ? 'bg-palmier-50' : ''}`}>
                  <div className={`text-[11px] font-bold ${isToday(day) ? 'text-palmier-600' : isWeekend(day) ? 'text-gray-300' : 'text-gray-600'}`}>
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
              <tr key={chambre.id} className="hover:bg-palmier-50/20 transition-colors group">
                <td className="px-4 py-2.5 sticky left-0 bg-white group-hover:bg-palmier-50/20 border-r border-gray-50 z-10">
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

  const renderClientView = () => {
    const clientMap = new Map<number, { nom: string; prenom: string; events: EvenementCalendrier[] }>();
    filteredEvents.forEach(evt => {
      if (evt.type === 'RESERVATION' && evt.clientId && evt.clientNom) {
        if (!clientMap.has(evt.clientId)) clientMap.set(evt.clientId, { nom: evt.clientNom, prenom: evt.clientPrenom || '', events: [] });
        clientMap.get(evt.clientId)!.events.push(evt);
      }
    });
    const list = Array.from(clientMap.entries()).sort((a, b) => a[1].nom.localeCompare(b[1].nom));

    if (list.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-gray-400">
          <User size={40} strokeWidth={1.5} />
          <p className="text-sm">Aucune réservation sur cette période</p>
        </div>
      );
    }

    return (
      <div>
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100">
            <tr className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              <th className="px-5 py-3 text-left">Client</th>
              <th className="px-4 py-3 text-left">Chambre</th>
              <th className="px-4 py-3 text-left">Statut</th>
              <th className="px-4 py-3 text-left">Arrivée</th>
              <th className="px-4 py-3 text-left">Départ</th>
              <th className="px-4 py-3 text-right">Nuits</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {list.map(([clientId, data]) => {
              const evt = data.events[0];
              const colorSet = evt.statut ? STATUT_COLORS[evt.statut] : null;
              return (
                <tr
                  key={clientId}
                  onClick={() => evt.reservationId && navigate(`/reservations/${evt.reservationId}`)}
                  className="hover:bg-palmier-50/30 transition-colors cursor-pointer group"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-palmier-100 to-palmier-200 flex items-center justify-center text-palmier-700 font-bold text-sm shrink-0">
                        {data.prenom.charAt(0)}{data.nom.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{data.prenom} {data.nom}</div>
                        {data.events.length > 1 && (
                          <div className="text-[11px] text-gray-400">{data.events.length} réservations</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="font-medium text-gray-800">{evt.chambreNom || '—'}</div>
                    {evt.chambreNumero && <div className="text-[11px] text-gray-400">N°{evt.chambreNumero}</div>}
                  </td>
                  <td className="px-4 py-3.5">
                    {colorSet && evt.statut && (
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${colorSet.pill}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${colorSet.dot}`} />
                        {STATUT_LABELS[evt.statut]}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="text-gray-700">{format(parseISO(evt.dateDebut), 'dd MMM yyyy', { locale: fr })}</div>
                    {evt.heureArrivee && <div className="text-[11px] text-palmier-600">{evt.heureArrivee}</div>}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="text-gray-700">{format(parseISO(evt.dateFin), 'dd MMM yyyy', { locale: fr })}</div>
                    {evt.heureDepart && <div className="text-[11px] text-gray-400">{evt.heureDepart}</div>}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className="font-bold text-palmier-600 text-base">{evt.nbNuits || 0}</span>
                    <span className="text-gray-400 text-xs ml-1">n</span>
                  </td>
                </tr>
              );
            })}
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
                          today ? 'bg-palmier-600 text-white font-bold' :
                          stats.chambresOccupees > 0 ? 'bg-palmier-50 text-palmier-800 font-medium' :
                          weekend ? 'text-gray-300' : 'text-gray-600 hover:bg-gray-100'
                        }`}
                        onClick={() => navigate(`/reservations?date=${format(day, 'yyyy-MM-dd')}`)}
                      >
                        {format(day, 'd')}
                        {stats.chambresOccupees > 0 && !today && (
                          <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-palmier-400" />
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

  const hasActiveFilters = !!(filterChambre || filterStatut || filterClient || plageHoraire !== 'toute');

  return (
    <div className="min-h-screen bg-[#f8f9fc] p-4 lg:p-6 space-y-4">

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
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-palmier-500 to-palmier-700 flex items-center justify-center shadow-lg shadow-palmier-300/40">
            <CalendarIcon size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">Calendrier</h1>
            <div className="flex items-center gap-3 mt-0.5 text-[12px] text-gray-400 flex-wrap">
              <span className="flex items-center gap-1">
                <BedDouble size={12} className="text-palmier-500" />
                {globalStats.chambresDisponibles}/{globalStats.chambresTotal} disponibles
              </span>
              <span className="w-px h-3 bg-gray-200" />
              <span className="flex items-center gap-1">
                <TrendingUp size={12} className="text-emerald-500" />
                {globalStats.tauxOccupation.toFixed(0)}% occupation
              </span>
              <span className="w-px h-3 bg-gray-200" />
              <span>{globalStats.totalReservations} réservations</span>
              {filtreActif && (
                <span className="flex items-center gap-1 bg-palmier-50 text-palmier-700 px-2 py-0.5 rounded-full text-[11px] font-medium border border-palmier-100">
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
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-palmier-600 to-palmier-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-palmier-300/40 hover:from-palmier-700 hover:to-palmier-800 hover:shadow-lg transition-all duration-200 active:scale-95"
          >
            <Plus size={16} />
            Nouvelle réservation
          </button>
        </div>
      </div>

      {/* ══ STATS ════════════════════════════════════════ */}
      <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 ${mounted ? 'anim-slide delay-1' : 'opacity-0'}`}>
        <StatPill label="Chambres" value={`${globalStats.chambresDisponibles}/${globalStats.chambresTotal}`} icon={<BedDouble size={16} />} accent="palmier" sub="disponibles" />
        <StatPill
          label="Occupation"
          value={`${globalStats.tauxOccupation.toFixed(0)}%`}
          icon={<TrendingUp size={16} />}
          accent={globalStats.tauxOccupation > 70 ? 'emerald' : globalStats.tauxOccupation > 40 ? 'amber' : 'rose'}
        />
        <StatPill label="Réservations" value={globalStats.totalReservations} icon={<Users size={16} />} accent="sky" />
        <StatPill label="Blocages" value={globalStats.totalBlockages} icon={<Clock size={16} />} accent="slate" sub="Maintenance / Indispo" />
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
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1.5 text-xs font-semibold text-palmier-600 bg-palmier-50 rounded-lg hover:bg-palmier-100 transition-colors"
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
                ? 'bg-palmier-50 border-palmier-200 text-palmier-700'
                : 'border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Filter size={13} />
            Filtres
            {hasActiveFilters && (
              <span className="w-4 h-4 rounded-full bg-palmier-600 text-white text-[9px] font-bold flex items-center justify-center">
                {[filterChambre, filterStatut, filterClient !== null && filterClient, plageHoraire !== 'toute'].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {/* Panneau filtres (dépliable) */}
        {showFilters && (
          <div className="px-4 py-3 bg-gray-50/60 border-b border-gray-100 flex flex-wrap gap-3 items-end anim-fade">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Chambre</label>
              <select
                value={filterChambre || ''}
                onChange={e => setFilterChambre(e.target.value ? Number(e.target.value) : null)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-palmier-400 outline-none text-gray-800"
              >
                <option value="">Toutes</option>
                {chambres.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Statut</label>
              <select
                value={filterStatut}
                onChange={e => setFilterStatut(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-palmier-400 outline-none text-gray-800"
              >
                <option value="">Tous</option>
                {Object.entries(STATUT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>

            {vue === 'client' && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Client</label>
                <select
                  value={filterClient || ''}
                  onChange={e => setFilterClient(e.target.value ? Number(e.target.value) : null)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-palmier-400 outline-none text-gray-800"
                >
                  <option value="">Tous</option>
                  {clientsList.map(c => <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>)}
                </select>
              </div>
            )}

            {vue === 'week' && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Plage horaire</label>
                <select
                  value={plageHoraire}
                  onChange={e => setPlageHoraire(e.target.value as PlageHoraire)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-palmier-400 outline-none text-gray-800"
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
                <button onClick={resetFilters} className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl bg-white transition-colors">
                  Réinitialiser
                </button>
              )}
              <button
                onClick={() => setShowSaveFilter(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-palmier-600 border border-palmier-200 rounded-xl bg-palmier-50 hover:bg-palmier-100 transition-colors"
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
                    ? 'bg-palmier-600 text-white border-palmier-600'
                    : 'bg-gray-100 text-gray-600 border-gray-200 hover:border-palmier-200 hover:bg-palmier-50 hover:text-palmier-700'
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
              {vue === 'client' && renderClientView()}
              {vue === 'trimestre' && renderTrimestreView()}
            </div>
          )}
        </div>
      </div>

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
            {/* En-tête modale */}
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
                          ? `${selectedEvent.clientPrenom} ${selectedEvent.clientNom}`
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

            {/* Corps modale */}
            <div className="p-6 space-y-3">
              {selectedEvent.type === 'RESERVATION' && selectedEvent.statut && (
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border ${STATUT_COLORS[selectedEvent.statut].pill}`}>
                    <span className={`w-2 h-2 rounded-full ${STATUT_COLORS[selectedEvent.statut].dot}`} />
                    {STATUT_LABELS[selectedEvent.statut]}
                  </span>
                  {selectedEvent.nbNuits && (
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
                    <p className="text-xs text-palmier-600">{selectedEvent.heureArrivee}</p>
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
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-palmier-600 to-palmier-700 rounded-xl hover:from-palmier-700 hover:to-palmier-800 shadow-md shadow-palmier-200/50 transition-all active:scale-95"
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
            <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2">
              <Save size={16} className="text-palmier-600" />
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
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-palmier-400 outline-none text-gray-800 placeholder-gray-300"
              />
            </div>
            <div className="px-6 py-4 border-t border-gray-50 flex justify-end gap-2">
              <button onClick={() => { setShowSaveFilter(false); setFilterName(''); }} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                Annuler
              </button>
              <button onClick={saveFilters} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-palmier-600 hover:bg-palmier-700 rounded-xl transition-colors">
                <Bookmark size={14} /> Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
