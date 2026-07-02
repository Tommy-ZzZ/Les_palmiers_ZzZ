import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Bike, CarFront, MapPinned, Activity, CalendarClock, 
  Plus, Edit2, Trash2, Box, Users, Clock, CheckCircle,
  XCircle, AlertCircle, Search, Filter, ChevronDown,
  Eye, RefreshCw, TrendingUp, DollarSign, Percent,
  Calendar, Plane, Navigation, Star, Award, Truck
} from 'lucide-react';
import { formatDateTime, formatEuro, formatDate } from '../utils/helpers';

// ============================================
// TYPES - Basés sur le diagramme de classes §3.5
// ============================================

type TypeVelo = 'VTT' | 'VILLE';
type EtatVelo = 'BON' | 'USAGE' | 'EN_REPARATION' | 'HORS_SERVICE';
type TypeService = 'LOCATION_VELO' | 'TRANSFERT_AEROPORT' | 'ACTIVITE_GUIDE';
type TypeTarification = 'HORAIRE' | 'JOURNALIERE';
type StatutLocation = 'EN_COURS' | 'TERMINEE' | 'ANNULEE';
type StatutTransfert = 'PLANIFIE' | 'REALISE' | 'ANNULE';
type SensTransfert = 'AEROPORT_VERS_GITE' | 'GITE_VERS_AEROPORT';
type TypeActivite = 'CANYONING' | 'RANDONNEE' | 'VISITE_DISTILLERIE' | 'AUTRE';

// Interfaces basées sur le diagramme de classes
interface Velo {
  id: number;
  numero: string;
  type: TypeVelo;
  taille: string;
  etat: EtatVelo;
  disponible: boolean;
  numero_serie?: string;
  date_creation: string;
  date_modification?: string;
}

interface LocationVelo extends ServiceAnnexe {
  tarification_horaire: boolean;
  prix_horaire: number;
  prix_journalier: number;
  date_debut: string;
  date_fin: string;
  type_tarification: TypeTarification;
  statut: StatutLocation;
  velo: Velo;
}

interface Chauffeur {
  id: number;
  nom: string;
  prenom: string;
  telephone: string;
  permis_categorie: string;
  disponible: boolean;
}

interface Vehicule {
  id: number;
  marque: string;
  modele: string;
  immatriculation: string;
  capacite_personnes: number;
  disponible: boolean;
}

interface TransfertAeroport extends ServiceAnnexe {
  sens: SensTransfert;
  heure_vol: string;
  numero_vol: string;
  nb_personnes: number;
  nb_bagages: number;
  remarques?: string;
  date_heure: string;
  statut: StatutTransfert;
  chauffeur?: Chauffeur;
  vehicule?: Vehicule;
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
}

interface ReservationActivite extends ServiceAnnexe {
  date_activite: string;
  heure_activite: string;
  nb_participants: number;
  montant_paye_client: number;
  commission_percue: number;
  est_externe: boolean;
  activite: ActiviteGuide;
}

interface ServiceAnnexe {
  id: number;
  idService: number;
  type: TypeService;
  dateHeureDebut: string;
  dateHeureFin: string;
  montant: number;
  statut: string;
  notes?: string;
  reservation_id: number;
  client: {
    id: number;
    prenom: string;
    nom: string;
  };
}

// ============================================
// CONSTANTES - Basées sur §3.5
// ============================================

const TYPE_VELO_LABELS: Record<TypeVelo, string> = {
  'VTT': 'VTT',
  'VILLE': 'Ville'
};

const ETAT_VELO_STYLES: Record<EtatVelo, { bg: string; text: string; label: string }> = {
  'BON': { bg: 'bg-green-100', text: 'text-green-700', label: 'Bon état' },
  'USAGE': { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Usagé' },
  'EN_REPARATION': { bg: 'bg-orange-100', text: 'text-orange-700', label: 'En réparation' },
  'HORS_SERVICE': { bg: 'bg-red-100', text: 'text-red-700', label: 'Hors service' }
};

const STATUT_LOCATION_STYLES: Record<StatutLocation, { bg: string; text: string; icon: JSX.Element }> = {
  'EN_COURS': { bg: 'bg-blue-100', text: 'text-blue-700', icon: <Clock size={14} /> },
  'TERMINEE': { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle size={14} /> },
  'ANNULEE': { bg: 'bg-red-100', text: 'text-red-700', icon: <XCircle size={14} /> }
};

const STATUT_TRANSFERT_STYLES: Record<StatutTransfert, { bg: string; text: string; icon: JSX.Element }> = {
  'PLANIFIE': { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: <Clock size={14} /> },
  'REALISE': { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle size={14} /> },
  'ANNULE': { bg: 'bg-red-100', text: 'text-red-700', icon: <XCircle size={14} /> }
};

const ACTIVITE_LABELS: Record<TypeActivite, string> = {
  'CANYONING': 'Canyoning',
  'RANDONNEE': 'Randonnée',
  'VISITE_DISTILLERIE': 'Visite distilleries',
  'AUTRE': 'Autre'
};

const SENS_TRANSFERT_LABELS: Record<SensTransfert, string> = {
  'AEROPORT_VERS_GITE': 'Aéroport → Gîte',
  'GITE_VERS_AEROPORT': 'Gîte → Aéroport'
};

const FORM_EMPTY = {
  id: 0,
  // Velo
  type: 'VTT' as TypeVelo,
  taille: '',
  etat: 'BON' as EtatVelo,
  numero_serie: '',
  disponible: true,
  
  // Location
  reservation_id: '',
  velo_id: '',
  date_debut: '',
  date_fin: '',
  type_tarification: 'JOURNALIERE' as TypeTarification,
  montant: 0,
  statut: 'EN_COURS' as StatutLocation,
  
  // Transfert
  date_heure: '',
  sens: 'AEROPORT_VERS_GITE' as SensTransfert,
  numero_vol: '',
  nb_personnes: 1,
  nb_bagages: 0,
  chauffeur_id: '',
  vehicule_id: '',
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
};

// ============================================
// COMPOSANTS UI
// ============================================

// Badge d'état
const StatusBadge = ({ 
  status, 
  styles, 
  label 
}: { 
  status: string; 
  styles: Record<string, any>; 
  label?: string;
}) => {
  const style = styles[status] || styles['DEFAULT'] || { bg: 'bg-gray-100', text: 'text-black', icon: null };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
      {style.icon}
      {label || status}
    </span>
  );
};

// Filtres rapides
const QuickFilters = ({ 
  activeFilter, 
  onFilterChange,
  counts,
  labels
}: { 
  activeFilter: string; 
  onFilterChange: (filter: string) => void;
  counts: Record<string, number>;
  labels: Record<string, string>;
}) => {
  const filters = Object.keys(labels);
  
  return (
    <div className="flex flex-wrap gap-1.5">
      {filters.map(filter => (
        <button
          key={filter}
          onClick={() => onFilterChange(filter)}
          className={`px-3 py-1.5 text-xs rounded-full transition-all ${
            activeFilter === filter
              ? 'bg-palmier-600 text-white shadow-sm'
              : 'bg-gray-100 text-black hover:bg-gray-200'
          }`}
        >
          {labels[filter]} ({counts[filter] || 0})
        </button>
      ))}
    </div>
  );
};

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function ServicesAnnexesPage() {
  // État - Basé sur §3.5
  const [velos, setVelos] = useState<Velo[]>([]);
  const [locations, setLocations] = useState<LocationVelo[]>([]);
  const [transferts, setTransferts] = useState<TransfertAeroport[]>([]);
  const [activites, setActivites] = useState<ActiviteGuide[]>([]);
  const [reservationsActivites, setReservationsActivites] = useState<ReservationActivite[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<TypeService | 'TOUS'>('TOUS');
  
  // Éditeur
  const [editorKind, setEditorKind] = useState<TypeService | 'velo' | null>(null);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [form, setForm] = useState(FORM_EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  
  // Confirmations
  const [confirmDelete, setConfirmDelete] = useState<{ kind: string; id: number; label: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // API Service (simulé)
  const api = useMemo(() => ({
    get: async (url: string, params?: any) => {
      console.log(`[API] GET ${url}`, params);
      return { data: { data: [] } };
    },
    post: async (url: string, data: any) => {
      console.log(`[API] POST ${url}`, data);
      return { data: { id: Date.now(), ...data } };
    },
    put: async (url: string, data: any) => {
      console.log(`[API] PUT ${url}`, data);
      return { data: { ...data } };
    },
    delete: async (url: string) => {
      console.log(`[API] DELETE ${url}`);
      return { data: { success: true } };
    }
  }), []);

  // ============================================
  // CHARGEMENT - §3.5
  // ============================================

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [velosRes, locationsRes, transfertsRes, activitesRes] = await Promise.all([
        api.get('/services-annexes/velos'),
        api.get('/services-annexes/locations'),
        api.get('/services-annexes/transferts'),
        api.get('/services-annexes/activites')
      ]);
      
      setVelos(velosRes.data.data || []);
      setLocations(locationsRes.data.data || []);
      setTransferts(transfertsRes.data.data || []);
      setActivites(activitesRes.data.data || []);
    } catch (err) {
      console.error('[ServicesAnnexesPage] Erreur chargement', err);
      setError('Impossible de charger les services annexes');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ============================================
  // STATISTIQUES - §3.5.1, §3.5.2, §3.5.3
  // ============================================

  const stats = useMemo(() => ({
    totalVelos: velos.length,
    velosDisponibles: velos.filter(v => v.disponible && v.etat === 'BON').length,
    locationsEnCours: locations.filter(l => l.statut === 'EN_COURS').length,
    transfertsPlanifies: transferts.filter(t => t.statut === 'PLANIFIE').length,
    activitesDisponibles: activites.filter(a => a.disponible).length,
    revenusAnnexes: [...locations, ...transferts].reduce((sum, s) => sum + (s.montant || 0), 0),
    commissions: activites.reduce((sum, a) => sum + a.commission_gite, 0)
  }), [velos, locations, transferts, activites]);

  // ============================================
  // CRUD - Basé sur §3.5
  // ============================================

  const openCreate = (kind: TypeService | 'velo') => {
    setEditorKind(kind);
    setEditorMode('create');
    setForm(FORM_EMPTY);
    setFormError('');
  };

  const openEdit = (kind: TypeService | 'velo', item: any) => {
    setEditorKind(kind);
    setEditorMode('edit');
    setForm({
      ...FORM_EMPTY,
      ...item,
      id: item.id,
      reservation_id: item.reservation_id || '',
      velo_id: item.velo_id || '',
      partenaire_id: item.partenaire_id || '',
    });
    setFormError('');
  };

  const closeEditor = () => {
    setEditorKind(null);
    setEditorMode('create');
    setForm(FORM_EMPTY);
    setFormError('');
  };

  const handleSave = async () => {
    if (!editorKind) return;
    
    // Validation selon le type
    if (editorKind === 'velo') {
      if (!form.type || !form.taille) {
        setFormError('Type et taille sont obligatoires');
        return;
      }
    } else if (editorKind === 'LOCATION_VELO') {
      if (!form.velo_id || !form.date_debut || !form.date_fin) {
        setFormError('Vélo, date de début et date de fin sont obligatoires');
        return;
      }
    } else if (editorKind === 'TRANSFERT_AEROPORT') {
      if (!form.date_heure || !form.sens) {
        setFormError('Date/heure et sens sont obligatoires');
        return;
      }
    } else if (editorKind === 'ACTIVITE_GUIDE') {
      if (!form.nom || !form.partenaire_id) {
        setFormError('Nom et partenaire sont obligatoires');
        return;
      }
    }

    setSaving(true);
    setFormError('');
    try {
      const payload = buildPayload(editorKind, form);
      const path = getPath(editorKind);
      
      if (editorMode === 'create') {
        await api.post(path, payload);
      } else {
        await api.put(`${path}/${form.id}`, payload);
      }
      
      await fetchData();
      closeEditor();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const buildPayload = (kind: TypeService | 'velo', form: any) => {
    switch(kind) {
      case 'velo':
        return {
          type: form.type,
          taille: form.taille || null,
          etat: form.etat || 'BON',
          numero_serie: form.numero_serie || null,
          disponible: form.disponible !== undefined ? form.disponible : true
        };
      case 'LOCATION_VELO':
        return {
          reservation_id: form.reservation_id ? Number(form.reservation_id) : null,
          velo_id: Number(form.velo_id),
          date_debut: form.date_debut,
          date_fin: form.date_fin,
          type_tarification: form.type_tarification || 'JOURNALIERE',
          montant: Number(form.montant || 0),
          statut: form.statut || 'EN_COURS',
          tarification_horaire: form.type_tarification === 'HORAIRE',
          prix_horaire: form.type_tarification === 'HORAIRE' ? Number(form.montant || 0) : 0,
          prix_journalier: form.type_tarification === 'JOURNALIERE' ? Number(form.montant || 0) : 0
        };
      case 'TRANSFERT_AEROPORT':
        return {
          reservation_id: form.reservation_id ? Number(form.reservation_id) : null,
          date_heure: form.date_heure,
          sens: form.sens,
          numero_vol: form.numero_vol || null,
          nb_personnes: Number(form.nb_personnes || 1),
          nb_bagages: Number(form.nb_bagages || 0),
          montant: Number(form.montant || 0),
          statut: form.statut || 'PLANIFIE',
          remarques: form.remarques || null,
          chauffeur_id: form.chauffeur_id ? Number(form.chauffeur_id) : null,
          vehicule_id: form.vehicule_id ? Number(form.vehicule_id) : null
        };
      case 'ACTIVITE_GUIDE':
        return {
          partenaire_id: Number(form.partenaire_id),
          nom: form.nom,
          description: form.description || null,
          type_activite: form.type_activite || 'AUTRE',
          tarif_client: Number(form.tarif_client || 0),
          commission_gite: Number(form.commission_gite || 0),
          disponible: form.disponible_activite !== undefined ? form.disponible_activite : true,
          duree_heures: Number(form.duree_heures || 2)
        };
      default:
        return form;
    }
  };

  const getPath = (kind: TypeService | 'velo') => {
    switch(kind) {
      case 'velo': return '/services-annexes/velos';
      case 'LOCATION_VELO': return '/services-annexes/locations';
      case 'TRANSFERT_AEROPORT': return '/services-annexes/transferts';
      case 'ACTIVITE_GUIDE': return '/services-annexes/activites';
      default: return '';
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const path = getPath(confirmDelete.kind as any);
      await api.delete(`${path}/${confirmDelete.id}`);
      await fetchData();
      setConfirmDelete(null);
    } catch (err) {
      setError('Impossible de supprimer cet élément');
    } finally {
      setDeleting(false);
    }
  };

  // ============================================
  // RENDU
  // ============================================

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-palmier-200 border-t-palmier-600 rounded-full animate-spin" />
          <span className="text-sm text-black">Chargement des services annexes...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        <AlertCircle size={18} />
        <span>{error}</span>
        <button onClick={fetchData} className="ml-auto text-red-700 hover:text-red-900 font-medium">
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 lg:p-6 bg-white text-black min-h-screen">
      {/* En-tête §3.5 */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-black flex items-center gap-2">
            <Box className="text-palmier-600" size={24} />
            Services Annexes
          </h1>
          <p className="text-sm text-black mt-0.5">
            {stats.totalVelos} vélos · {stats.locationsEnCours} locations en cours · 
            {stats.transfertsPlanifies} transferts planifiés · {stats.activitesDisponibles} activités disponibles
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <RefreshCw size={18} className="text-black" />
          </button>
        </div>
      </div>

      {/* Statistiques §3.5.1, §3.5.2, §3.5.3 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-black">Vélos</p>
              <p className="text-xl font-bold text-black">{stats.totalVelos}</p>
              <p className="text-xs text-black">{stats.velosDisponibles} disponibles</p>
            </div>
            <Bike size={20} className="text-palmier-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-black">Locations en cours</p>
              <p className="text-xl font-bold text-black">{stats.locationsEnCours}</p>
            </div>
            <Clock size={20} className="text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-black">Transferts planifiés</p>
              <p className="text-xl font-bold text-black">{stats.transfertsPlanifies}</p>
            </div>
            <Plane size={20} className="text-yellow-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-black">Activités disponibles</p>
              <p className="text-xl font-bold text-black">{stats.activitesDisponibles}</p>
            </div>
            <Activity size={20} className="text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-black">Revenus annexes</p>
              <p className="text-xl font-bold text-black">{formatEuro(stats.revenusAnnexes)}</p>
            </div>
            <DollarSign size={20} className="text-palmier-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-black">Commissions</p>
              <p className="text-xl font-bold text-black">{formatEuro(stats.commissions)}</p>
            </div>
            <Percent size={20} className="text-purple-500" />
          </div>
        </div>
      </div>

      {/* Section: Vélos §3.5.1 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-black flex items-center gap-2">
            <Bike size={18} className="text-palmier-600" />
            Parc de vélos
            <span className="text-xs text-black font-normal ml-2">
              {velos.filter(v => v.disponible).length} disponibles
            </span>
          </h2>
          <button 
            onClick={() => openCreate('velo')}
            className="flex items-center gap-2 px-3 py-1.5 bg-palmier-600 text-white text-sm rounded-lg hover:bg-palmier-700 transition-colors"
          >
            <Plus size={14} />
            Ajouter un vélo
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs text-black uppercase tracking-wider">
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Taille</th>
                <th className="px-4 py-3 text-left font-medium">État</th>
                <th className="px-4 py-3 text-left font-medium">N° série</th>
                <th className="px-4 py-3 text-center font-medium">Disponible</th>
                <th className="px-4 py-3 text-center font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {velos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-black">
                    Aucun vélo dans le parc
                  </td>
                </tr>
              ) : (
                velos.map(velo => {
                  const etatStyle = ETAT_VELO_STYLES[velo.etat];
                  return (
                    <tr key={velo.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium">{TYPE_VELO_LABELS[velo.type]}</td>
                      <td className="px-4 py-3 text-black">{velo.taille || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${etatStyle.bg} ${etatStyle.text}`}>
                          {etatStyle.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-black">{velo.numero_serie || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        {velo.disponible ? (
                          <CheckCircle size={16} className="text-green-500 mx-auto" />
                        ) : (
                          <XCircle size={16} className="text-red-500 mx-auto" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEdit('velo', velo)}
                            className="p-1.5 text-black hover:text-palmier-600 transition-colors rounded"
                            title="Modifier"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => setConfirmDelete({ kind: 'velo', id: velo.id, label: `vélo ${velo.type}` })}
                            className="p-1.5 text-black hover:text-red-600 transition-colors rounded"
                            title="Supprimer"
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

      {/* Section: Locations et Transferts §3.5.1 & §3.5.2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Locations */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-black flex items-center gap-2">
              <Clock size={18} className="text-blue-600" />
              Locations
              <span className="text-xs text-black font-normal ml-2">
                {locations.filter(l => l.statut === 'EN_COURS').length} en cours
              </span>
            </h2>
            <button 
              onClick={() => openCreate('LOCATION_VELO')}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={14} />
              Nouvelle location
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs text-black uppercase tracking-wider">
                  <th className="px-4 py-3 text-left font-medium">Client</th>
                  <th className="px-4 py-3 text-left font-medium">Vélo</th>
                  <th className="px-4 py-3 text-left font-medium">Début</th>
                  <th className="px-4 py-3 text-left font-medium">Fin</th>
                  <th className="px-4 py-3 text-center font-medium">Montant</th>
                  <th className="px-4 py-3 text-center font-medium">Statut</th>
                  <th className="px-4 py-3 text-center font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {locations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-black">
                      Aucune location
                    </td>
                  </tr>
                ) : (
                  locations.map(loc => (
                    <tr key={loc.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium">
                        {loc.client?.prenom} {loc.client?.nom}
                      </td>
                      <td className="px-4 py-3 text-black">
                        {loc.velo?.type} {loc.velo?.taille ? `(${loc.velo.taille})` : ''}
                      </td>
                      <td className="px-4 py-3 text-xs text-black">{formatDateTime(loc.date_debut)}</td>
                      <td className="px-4 py-3 text-xs text-black">{formatDateTime(loc.date_fin)}</td>
                      <td className="px-4 py-3 text-center font-medium text-black">
                        {formatEuro(loc.montant)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={loc.statut} styles={STATUT_LOCATION_STYLES} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEdit('LOCATION_VELO', loc)}
                            className="p-1.5 text-black hover:text-palmier-600 transition-colors rounded"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => setConfirmDelete({ kind: 'LOCATION_VELO', id: loc.id, label: `location ${loc.id}` })}
                            className="p-1.5 text-black hover:text-red-600 transition-colors rounded"
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

        {/* Transferts §3.5.2 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-black flex items-center gap-2">
              <Plane size={18} className="text-yellow-600" />
              Transferts aéroport
              <span className="text-xs text-black font-normal ml-2">
                {transferts.filter(t => t.statut === 'PLANIFIE').length} planifiés
              </span>
            </h2>
            <button 
              onClick={() => openCreate('TRANSFERT_AEROPORT')}
              className="flex items-center gap-2 px-3 py-1.5 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700 transition-colors"
            >
              <Plus size={14} />
              Nouveau transfert
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs text-black uppercase tracking-wider">
                  <th className="px-4 py-3 text-left font-medium">Client</th>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Sens</th>
                  <th className="px-4 py-3 text-left font-medium">Vol</th>
                  <th className="px-4 py-3 text-center font-medium">Montant</th>
                  <th className="px-4 py-3 text-center font-medium">Statut</th>
                  <th className="px-4 py-3 text-center font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transferts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-black">
                      Aucun transfert
                    </td>
                  </tr>
                ) : (
                  transferts.map(transfert => (
                    <tr key={transfert.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium">
                        {transfert.client?.prenom} {transfert.client?.nom}
                      </td>
                      <td className="px-4 py-3 text-xs text-black">{formatDateTime(transfert.date_heure)}</td>
                      <td className="px-4 py-3 text-xs text-black">
                        {SENS_TRANSFERT_LABELS[transfert.sens]}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-black">{transfert.numero_vol || '—'}</td>
                      <td className="px-4 py-3 text-center font-medium text-black">
                        {formatEuro(transfert.montant)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={transfert.statut} styles={STATUT_TRANSFERT_STYLES} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEdit('TRANSFERT_AEROPORT', transfert)}
                            className="p-1.5 text-black hover:text-palmier-600 transition-colors rounded"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => setConfirmDelete({ kind: 'TRANSFERT_AEROPORT', id: transfert.id, label: `transfert ${transfert.id}` })}
                            className="p-1.5 text-black hover:text-red-600 transition-colors rounded"
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

      {/* Section: Activités §3.5.3 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-black flex items-center gap-2">
            <Activity size={18} className="text-green-600" />
            Activités et guides
            <span className="text-xs text-black font-normal ml-2">
              {activites.filter(a => a.disponible).length} disponibles
            </span>
          </h2>
          <button 
            onClick={() => openCreate('ACTIVITE_GUIDE')}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus size={14} />
            Nouvelle activité
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs text-black uppercase tracking-wider">
                <th className="px-4 py-3 text-left font-medium">Activité</th>
                <th className="px-4 py-3 text-left font-medium">Partenaire</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-center font-medium">Tarif client</th>
                <th className="px-4 py-3 text-center font-medium">Commission</th>
                <th className="px-4 py-3 text-center font-medium">Durée</th>
                <th className="px-4 py-3 text-center font-medium">Disponible</th>
                <th className="px-4 py-3 text-center font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {activites.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-black">
                    Aucune activité
                  </td>
                </tr>
              ) : (
                activites.map(activite => (
                  <tr key={activite.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium">{activite.nom_activite}</td>
                    <td className="px-4 py-3 text-black">{activite.nom_partenaire}</td>
                    <td className="px-4 py-3 text-xs text-black">
                      {ACTIVITE_LABELS[activite.type_activite]}
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-black">
                      {formatEuro(activite.tarif_client)}
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-black">
                      {formatEuro(activite.commission_gite)}
                    </td>
                    <td className="px-4 py-3 text-center text-black">
                      {activite.duree_heures}h
                    </td>
                    <td className="px-4 py-3 text-center">
                      {activite.disponible ? (
                        <CheckCircle size={16} className="text-green-500 mx-auto" />
                      ) : (
                        <XCircle size={16} className="text-red-500 mx-auto" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEdit('ACTIVITE_GUIDE', activite)}
                            className="p-1.5 text-black hover:text-palmier-600 transition-colors rounded"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => setConfirmDelete({ kind: 'ACTIVITE_GUIDE', id: activite.id, label: `activité ${activite.nom_activite}` })}
                            className="p-1.5 text-black hover:text-red-600 transition-colors rounded"
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
      {/* MODAL ÉDITEUR - Basé sur §3.5 */}
      {/* ============================================ */}

      {editorKind && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-black">
                {editorMode === 'create' ? 'Nouveau' : 'Modifier'} {
                  editorKind === 'velo' ? 'vélo' :
                  editorKind === 'LOCATION_VELO' ? 'location' :
                  editorKind === 'TRANSFERT_AEROPORT' ? 'transfert' : 'activité'
                }
              </h2>
              <button onClick={closeEditor} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <XCircle size={20} className="text-black" />
              </button>
            </div>

            <div className="p-6">
              {formError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                  <AlertCircle size={16} />
                  {formError}
                </div>
              )}

              {/* Formulaire Vélo §3.5.1 */}
              {editorKind === 'velo' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-black mb-1">Type *</label>
                    <select
                      value={form.type}
                      onChange={e => setForm((f: any) => ({ ...f, type: e.target.value as TypeVelo }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-palmier-500 outline-none"
                    >
                      <option value="VTT">VTT</option>
                      <option value="VILLE">Ville</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-black mb-1">Taille *</label>
                    <input
                      type="text"
                      value={form.taille}
                      onChange={e => setForm((f: any) => ({ ...f, taille: e.target.value }))}
                      placeholder="S, M, L, XL"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-palmier-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-black mb-1">État</label>
                    <select
                      value={form.etat}
                      onChange={e => setForm((f: any) => ({ ...f, etat: e.target.value as EtatVelo }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-palmier-500 outline-none"
                    >
                      <option value="BON">Bon état</option>
                      <option value="USAGE">Usagé</option>
                      <option value="EN_REPARATION">En réparation</option>
                      <option value="HORS_SERVICE">Hors service</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-black mb-1">Numéro de série</label>
                    <input
                      type="text"
                      value={form.numero_serie}
                      onChange={e => setForm((f: any) => ({ ...f, numero_serie: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-palmier-500 outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      checked={form.disponible}
                      onChange={e => setForm((f: any) => ({ ...f, disponible: e.target.checked }))}
                      className="w-4 h-4 text-palmier-600 rounded"
                    />
                    <label className="text-sm text-black">Disponible</label>
                  </div>
                </div>
              )}

              {/* Formulaire Location §3.5.1 */}
              {editorKind === 'LOCATION_VELO' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-black mb-1">Réservation</label>
                    <input
                      type="number"
                      value={form.reservation_id}
                      onChange={e => setForm((f: any) => ({ ...f, reservation_id: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-palmier-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-black mb-1">Vélo *</label>
                    <select
                      value={form.velo_id}
                      onChange={e => setForm((f: any) => ({ ...f, velo_id: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-palmier-500 outline-none"
                    >
                      <option value="">Sélectionner</option>
                      {velos.filter(v => v.disponible).map(v => (
                        <option key={v.id} value={v.id}>
                          {v.type} {v.taille ? `(${v.taille})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-black mb-1">Date début *</label>
                    <input
                      type="datetime-local"
                      value={form.date_debut ? form.date_debut.slice(0, 16) : ''}
                      onChange={e => setForm((f: any) => ({ ...f, date_debut: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-palmier-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-black mb-1">Date fin *</label>
                    <input
                      type="datetime-local"
                      value={form.date_fin ? form.date_fin.slice(0, 16) : ''}
                      onChange={e => setForm((f: any) => ({ ...f, date_fin: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-palmier-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-black mb-1">Tarification</label>
                    <select
                      value={form.type_tarification}
                      onChange={e => setForm((f: any) => ({ ...f, type_tarification: e.target.value as TypeTarification }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-palmier-500 outline-none"
                    >
                      <option value="HORAIRE">Horaire</option>
                      <option value="JOURNALIERE">Journalière</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-black mb-1">Montant</label>
                    <input
                      type="number"
                      value={form.montant}
                      onChange={e => setForm((f: any) => ({ ...f, montant: parseFloat(e.target.value) || 0 }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-palmier-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-black mb-1">Statut</label>
                    <select
                      value={form.statut}
                      onChange={e => setForm((f: any) => ({ ...f, statut: e.target.value as StatutLocation }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-palmier-500 outline-none"
                    >
                      <option value="EN_COURS">En cours</option>
                      <option value="TERMINEE">Terminée</option>
                      <option value="ANNULEE">Annulée</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Formulaire Transfert §3.5.2 */}
              {editorKind === 'TRANSFERT_AEROPORT' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-black mb-1">Réservation</label>
                    <input
                      type="number"
                      value={form.reservation_id}
                      onChange={e => setForm((f: any) => ({ ...f, reservation_id: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-palmier-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-black mb-1">Date / Heure *</label>
                    <input
                      type="datetime-local"
                      value={form.date_heure ? form.date_heure.slice(0, 16) : ''}
                      onChange={e => setForm((f: any) => ({ ...f, date_heure: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-palmier-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-black mb-1">Sens *</label>
                    <select
                      value={form.sens}
                      onChange={e => setForm((f: any) => ({ ...f, sens: e.target.value as SensTransfert }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-palmier-500 outline-none"
                    >
                      <option value="AEROPORT_VERS_GITE">Aéroport → Gîte</option>
                      <option value="GITE_VERS_AEROPORT">Gîte → Aéroport</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-black mb-1">Numéro de vol</label>
                    <input
                      type="text"
                      value={form.numero_vol}
                      onChange={e => setForm((f: any) => ({ ...f, numero_vol: e.target.value }))}
                      placeholder="AF 123"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-palmier-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-black mb-1">Nombre de personnes</label>
                    <input
                      type="number"
                      value={form.nb_personnes}
                      onChange={e => setForm((f: any) => ({ ...f, nb_personnes: parseInt(e.target.value) || 1 }))}
                      min="1"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-palmier-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-black mb-1">Nombre de bagages</label>
                    <input
                      type="number"
                      value={form.nb_bagages}
                      onChange={e => setForm((f: any) => ({ ...f, nb_bagages: parseInt(e.target.value) || 0 }))}
                      min="0"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-palmier-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-black mb-1">Montant</label>
                    <input
                      type="number"
                      value={form.montant}
                      onChange={e => setForm((f: any) => ({ ...f, montant: parseFloat(e.target.value) || 0 }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-palmier-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-black mb-1">Statut</label>
                    <select
                      value={form.statut}
                      onChange={e => setForm((f: any) => ({ ...f, statut: e.target.value as StatutTransfert }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-palmier-500 outline-none"
                    >
                      <option value="PLANIFIE">Planifié</option>
                      <option value="REALISE">Réalisé</option>
                      <option value="ANNULE">Annulé</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-black mb-1">Remarques</label>
                    <textarea
                      value={form.remarques}
                      onChange={e => setForm((f: any) => ({ ...f, remarques: e.target.value }))}
                      rows={2}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-palmier-500 outline-none resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Formulaire Activité §3.5.3 */}
              {editorKind === 'ACTIVITE_GUIDE' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-black mb-1">Partenaire ID *</label>
                    <input
                      type="number"
                      value={form.partenaire_id}
                      onChange={e => setForm((f: any) => ({ ...f, partenaire_id: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-palmier-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-black mb-1">Nom *</label>
                    <input
                      type="text"
                      value={form.nom}
                      onChange={e => setForm((f: any) => ({ ...f, nom: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-palmier-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-black mb-1">Type d'activité</label>
                    <select
                      value={form.type_activite}
                      onChange={e => setForm((f: any) => ({ ...f, type_activite: e.target.value as TypeActivite }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-palmier-500 outline-none"
                    >
                      <option value="CANYONING">Canyoning</option>
                      <option value="RANDONNEE">Randonnée</option>
                      <option value="VISITE_DISTILLERIE">Visite distilleries</option>
                      <option value="AUTRE">Autre</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-black mb-1">Durée (heures)</label>
                    <input
                      type="number"
                      value={form.duree_heures}
                      onChange={e => setForm((f: any) => ({ ...f, duree_heures: parseFloat(e.target.value) || 2 }))}
                      min="0.5"
                      step="0.5"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-palmier-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-black mb-1">Tarif client</label>
                    <input
                      type="number"
                      value={form.tarif_client}
                      onChange={e => setForm((f: any) => ({ ...f, tarif_client: parseFloat(e.target.value) || 0 }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-palmier-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-black mb-1">Commission gîte</label>
                    <input
                      type="number"
                      value={form.commission_gite}
                      onChange={e => setForm((f: any) => ({ ...f, commission_gite: parseFloat(e.target.value) || 0 }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-palmier-500 outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      checked={form.disponible_activite}
                      onChange={e => setForm((f: any) => ({ ...f, disponible_activite: e.target.checked }))}
                      className="w-4 h-4 text-palmier-600 rounded"
                    />
                    <label className="text-sm text-black">Disponible</label>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-black mb-1">Description</label>
                    <textarea
                      value={form.description}
                      onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-palmier-500 outline-none resize-none"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                onClick={closeEditor}
                className="px-4 py-2 text-sm font-medium text-black hover:bg-gray-100 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-palmier-600 text-white text-sm font-medium rounded-lg hover:bg-palmier-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  editorMode === 'create' ? 'Créer' : 'Enregistrer'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* CONFIRMATION SUPPRESSION */}
      {/* ============================================ */}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-black flex items-center gap-2">
              <AlertCircle size={20} className="text-red-600" />
              Confirmer la suppression
            </h3>
            <p className="text-sm text-black mt-2">
              Êtes-vous sûr de vouloir supprimer {confirmDelete.label} ? Cette action est irréversible et sera tracée dans le journal des actions (§4.4).
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm font-medium text-black hover:bg-gray-100 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Suppression...
                  </>
                ) : (
                  'Supprimer'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
