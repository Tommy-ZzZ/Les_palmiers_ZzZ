// frontend/src/pages/NouvelleReservationPage.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { clientService } from '../services/api';
import { formatEuro, nombreNuits, canalAcquisitionLabel } from '../utils/helpers';
import { 
  Calculator, AlertCircle, Save, ArrowLeft, Users, User, BedDouble, 
  Calendar, Check, Loader2, Sparkles, Bike, Sun, Cloud, Snowflake,
  TrendingUp, Gift, CreditCard, Clock, MapPin, Star,
  FileText, Download, Phone, Mail, Building, Eye, 
  Info, Heart, Bell, Coffee, Wind, Wifi, Tv, Utensils
} from 'lucide-react';

const CANAUX = ['DIRECT', 'BOOKING', 'AIRBNB', 'TELEPHONE', 'EMAIL', 'AUTRE'];

// ============================================
// STYLES
// ============================================
const nouvelleReservationPageStyles = `
.nouvelle-reservation-page input,
.nouvelle-reservation-page select,
.nouvelle-reservation-page textarea {
  color: #1a1a1a !important;
}
.nouvelle-reservation-page input::placeholder,
.nouvelle-reservation-page textarea::placeholder {
  color: #9ca3af !important;
}
.nouvelle-reservation-page option {
  color: #1a1a1a !important;
  background: white !important;
}
.nouvelle-reservation-page .client-dropdown {
  position: absolute;
  z-index: 20;
  width: 100%;
  background: white !important;
  border: 1px solid #e5e7eb !important;
  border-radius: 0.75rem !important;
  box-shadow: 0 10px 40px rgba(0,0,0,0.12) !important;
  margin-top: 0.25rem;
  max-height: 300px;
  overflow-y: auto;
  animation: slideDown 0.3s ease-out forwards;
}
.nouvelle-reservation-page .client-dropdown button {
  width: 100% !important;
  text-align: left !important;
  padding: 0.75rem 1rem !important;
  background: white !important;
  color: #1a1a1a !important;
  font-size: 0.875rem !important;
  transition: all 0.2s ease !important;
  border: none !important;
  border-bottom: 1px solid #f3f4f6 !important;
  cursor: pointer !important;
}
.nouvelle-reservation-page .client-dropdown button:last-child {
  border-bottom: none !important;
}
.nouvelle-reservation-page .client-dropdown button:hover {
  background: #f0fdfa !important;
  color: #0d9488 !important;
  padding-left: 1.25rem !important;
}
.nouvelle-reservation-page .client-dropdown .client-name {
  font-weight: 600 !important;
  color: #0d9488 !important;
}
.nouvelle-reservation-page .client-dropdown .client-email {
  color: #6b7280 !important;
  margin-left: 0.5rem !important;
  font-size: 0.75rem !important;
}
.nouvelle-reservation-page .client-dropdown .client-vip {
  margin-left: 0.5rem !important;
  font-size: 0.7rem !important;
  background: #fef3c7 !important;
  color: #b45309 !important;
  padding: 0.125rem 0.5rem !important;
  border-radius: 9999px !important;
  font-weight: 600 !important;
}
.nouvelle-reservation-page select {
  color: #1a1a1a !important;
  background: white !important;
}
.nouvelle-reservation-page select option {
  color: #1a1a1a !important;
  background: white !important;
  padding: 0.5rem 0.75rem !important;
}
.nouvelle-reservation-page select option:hover,
.nouvelle-reservation-page select option:checked {
  background: #f0fdfa !important;
  color: #0d9488 !important;
}
.nouvelle-reservation-page label {
  color: #374151 !important;
}
.nouvelle-reservation-page .card {
  background: white;
  border-radius: 0.75rem;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}
.nouvelle-reservation-page .card:hover {
  box-shadow: 0 8px 30px rgba(0,0,0,0.08);
}
.nouvelle-reservation-page .btn-primary {
  background: #0d9488;
  color: white;
  padding: 0.625rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 500;
  transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
  border: none;
  min-height: 48px;
}
.nouvelle-reservation-page .btn-primary:hover:not(:disabled) {
  background: #0f766e;
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 8px 25px rgba(13, 148, 136, 0.3);
}
.nouvelle-reservation-page .btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.nouvelle-reservation-page .btn-secondary {
  background: white;
  color: #374151;
  padding: 0.625rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 500;
  transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
  border: 1px solid #d1d5db;
  min-height: 48px;
}
.nouvelle-reservation-page .btn-secondary:hover:not(:disabled) {
  background: #f9fafb;
  transform: translateY(-2px);
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fadeInDown {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fadeInRight {
  from { opacity: 0; transform: translateX(30px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); max-height: 0; }
  to { opacity: 1; transform: translateY(0); max-height: 300px; }
}
@keyframes glowPulse {
  0%, 100% { box-shadow: 0 0 20px rgba(13, 148, 136, 0.1); }
  50% { box-shadow: 0 0 40px rgba(13, 148, 136, 0.25); }
}
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-5px); }
}
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
  20%, 40%, 60%, 80% { transform: translateX(8px); }
}
@keyframes shimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}
.animate-fadeInUp { animation: fadeInUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
.animate-fadeInDown { animation: fadeInDown 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
.animate-fadeInRight { animation: fadeInRight 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
.animate-scaleIn { animation: scaleIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
.animate-shake { animation: shake 0.5s ease-in-out; }
.animate-glowPulse { animation: glowPulse 2s ease-in-out infinite; }
.animate-float { animation: float 3s ease-in-out infinite; }
.animate-slideDown { animation: slideDown 0.3s ease-out forwards; }
.delay-100 { animation-delay: 100ms; }
.delay-200 { animation-delay: 200ms; }
.delay-300 { animation-delay: 300ms; }
.delay-400 { animation-delay: 400ms; }
.delay-500 { animation-delay: 500ms; }
.field-animated {
  transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
  position: relative;
}
.field-animated:focus {
  transform: scale(1.02);
  box-shadow: 0 0 0 4px rgba(13, 148, 136, 0.15), 0 4px 12px rgba(0,0,0,0.05);
}
.field-glow {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, #0d9488, #14b8a6, #0d9488);
  background-size: 200% 100%;
  animation: shimmer 2s linear infinite;
  opacity: 0;
  transition: opacity 0.3s ease;
  border-radius: 0 0 4px 4px;
}
.total-amount {
  transition: all 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}
.total-amount.changed {
  animation: countUp 0.4s ease-out;
}
@keyframes countUp {
  from { opacity: 0; transform: scale(0.5); }
  to { opacity: 1; transform: scale(1); }
}
`;

// ============================================
// SPINNER
// ============================================
const SpinnerComponent = () => (
  <div className="flex justify-center items-center py-12">
    <div className="animate-spin rounded-full h-8 w-8 border-4 border-palmier-500 border-t-transparent"></div>
  </div>
);

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
// INTERFACE CLIENT COMPLET
// ============================================
interface ClientComplet {
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
  commentaire?: string;
  notes?: string;
  remarques?: string;
}

// ============================================
// PAGE PRINCIPALE
// ============================================

export default function NouvelleReservationPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [chambres, setChambres] = useState<any[]>([]);
  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingReservation, setLoadingReservation] = useState(false);
  const [clientDetailsLoading, setClientDetailsLoading] = useState(false);

  const [form, setForm] = useState({
    clientId: '',
    chambreId: '',
    dateArrivee: '',
    dateDepart: '',
    nbAdultes: '1',
    nbEnfants: '0',
    nbPersonnes: '1',
    canalAcquisition: 'DIRECT',
    commentaire: '',
    petitDejeuner: false,
    groupe: false,
    nbVelos: '0',
    demandesSpeciales: '',
    litBebe: false,
    horaireArriveeTardive: ''
  });

  const [simulation, setSimulation] = useState<any>(null);
  const [simulating, setSimulating] = useState(false);
  const [simError, setSimError] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [totalAnimation, setTotalAnimation] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const [clientSearch, setClientSearch] = useState('');
  const [clientResults, setClientResults] = useState<any[]>([]);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientComplet | null>(null);

  const totalRef = useRef<HTMLDivElement>(null);

  // ============================================
  // FONCTION POUR RÉCUPÉRER UN CLIENT COMPLET
  // ============================================
  const fetchClientComplet = async (clientId: number): Promise<ClientComplet | null> => {
    try {
      // ✅ Validation de l'ID
      if (!clientId || isNaN(clientId) || clientId <= 0) {
        console.warn('⚠️ ID client invalide:', clientId);
        return null;
      }

      setClientDetailsLoading(true);
      console.log(`🔍 Récupération du client ${clientId}...`);
      
      const response = await clientService.getById(clientId);
      console.log('📦 Réponse brute du serveur:', response);
      
      const data = response.data ?? response;
      
      // ✅ Si pas de données, retourner null
      if (!data || !data.id) {
        console.warn('⚠️ Aucune donnée client trouvée pour l\'ID:', clientId);
        return null;
      }
      
      console.log('✅ Client complet reçu:', data);
      
      // Normalisation des données
      return {
        id: data.id,
        civilite: data.civilite || '',
        nom: data.nom || '',
        prenom: data.prenom || '',
        email: data.email || '',
        telephone: data.telephone || '',
        adresse: data.adresse || '',
        code_postal: data.code_postal || data.codePostal || '',
        ville: data.ville || '',
        pays: data.pays || 'France',
        statut: data.statut || 'NOUVEAU',
        segment: data.segment || 'TOURISTE_INDIVIDUEL',
        vip: data.vip || false,
        nb_sejours: data.nb_sejours || data.nbSejoursRealises || 0,
        montant_total_depense: data.montant_total_depense || data.montantTotalPaye || 0,
        allergies: data.allergies || data.allergie || '',
        regime_alimentaire: data.regime_alimentaire || data.regimeAlimentaire || data.regime || '',
        chambre_preferee: data.chambre_preferee || data.chambrePreferee || data.chambrePrefere || '',
        commentaire: data.commentaire || data.commentairesPrives || data.notes || data.remarques || ''
      };
    } catch (error) {
      console.error('❌ Erreur fetchClientComplet:', error);
      return null;
    } finally {
      setClientDetailsLoading(false);
    }
  };

  // ============================================
  // CHARGEMENT INITIAL - CORRIGÉ
  // ============================================
  useEffect(() => {
    const init = async () => {
      try {
        // Chargement des chambres disponibles
        const chambresRes = await api.get('/chambres');
        const chambresData = chambresRes.data.data ?? chambresRes.data;
        setChambres(chambresData.filter((c: any) => c.statut !== 'EN_MAINTENANCE'));

        // Si c'est une édition, charger la réservation
        if (isEdit) {
          setLoadingReservation(true);
          const res = await api.get(`/reservations/${id}`);
          const r = res.data.data ?? res.data;
          
          console.log('📋 Réservation chargée:', r);
          console.log('🔍 Recherche du clientId dans:', {
            'r.clientId': r.clientId,
            'r.client_id': r.client_id,
            'r.client?.id': r.client?.id,
            'r.client': r.client
          });
          
          // ✅ Récupération du clientId avec plusieurs sources
          let clientId = null;
          
          // Source 1: r.clientId
          if (r.clientId) {
            clientId = typeof r.clientId === 'string' ? parseInt(r.clientId, 10) : r.clientId;
          }
          // Source 2: r.client_id
          else if (r.client_id) {
            clientId = typeof r.client_id === 'string' ? parseInt(r.client_id, 10) : r.client_id;
          }
          // Source 3: r.client?.id
          else if (r.client?.id) {
            clientId = typeof r.client.id === 'string' ? parseInt(r.client.id, 10) : r.client.id;
          }
          // Source 4: r.client (si c'est directement l'objet client)
          else if (r.client && typeof r.client === 'object' && r.client.id) {
            clientId = typeof r.client.id === 'string' ? parseInt(r.client.id, 10) : r.client.id;
          }
          
          console.log('🎯 clientId extrait:', clientId);
          
          // ✅ Récupération COMPLÈTE du client SEULEMENT si clientId est valide
          let clientComplet: ClientComplet | null = null;
          if (clientId && !isNaN(clientId) && clientId > 0) {
            clientComplet = await fetchClientComplet(clientId);
          } else {
            console.warn('⚠️ Aucun clientId valide trouvé pour la réservation', id);
            // Fallback: essayer d'utiliser les données client de la réservation
            if (r.client_prenom || r.client_nom || r.prenom || r.nom) {
              clientComplet = {
                id: clientId || 0,
                civilite: r.client_civilite || r.civilite || r.client?.civilite || '',
                nom: r.client_nom || r.nom || r.client?.nom || '',
                prenom: r.client_prenom || r.prenom || r.client?.prenom || '',
                email: r.client_email || r.email || r.client?.email || '',
                telephone: r.client_telephone || r.telephone || r.client?.telephone || '',
                adresse: r.client_adresse || r.adresse || r.client?.adresse || '',
                code_postal: r.client_code_postal || r.code_postal || r.client?.code_postal || '',
                ville: r.client_ville || r.ville || r.client?.ville || '',
                pays: r.client_pays || r.pays || r.client?.pays || 'France',
                statut: r.client_statut || r.statut || r.client?.statut || 'NOUVEAU',
                segment: r.client_segment || r.segment || r.client?.segment || 'TOURISTE_INDIVIDUEL',
                vip: r.client_vip || r.vip || r.client?.vip || false,
                nb_sejours: r.client_nb_sejours || r.nb_sejours || r.client?.nb_sejours || 0,
                montant_total_depense: r.client_montant_total_depense || r.montant_total_depense || r.client?.montant_total_depense || 0,
                allergies: r.client_allergies || r.allergies || r.client?.allergies || '',
                regime_alimentaire: r.client_regime_alimentaire || r.regime_alimentaire || r.regimeAlimentaire || r.client?.regime_alimentaire || '',
                chambre_preferee: r.client_chambre_preferee || r.chambre_preferee || r.chambrePreferee || r.client?.chambre_preferee || '',
                commentaire: r.client_commentaire || r.commentaire || r.notes || r.client?.commentaire || ''
              };
            }
          }

          // Récupération de la chambre
          let chambreInfo = r.chambre || null;
          if (!chambreInfo && r.chambreId) {
            try {
              const chambreRes = await api.get(`/chambres/${r.chambreId}`);
              chambreInfo = chambreRes.data.data ?? chambreRes.data;
            } catch (e) {
              console.warn('Impossible de récupérer les détails de la chambre', e);
            }
          }
          
          // Construction des données du formulaire
          const formData = {
            clientId: String(clientId || ''),
            chambreId: String(r.chambreId ?? r.chambre_id ?? chambreInfo?.id ?? r.chambre?.id ?? ''),
            dateArrivee: r.dateArrivee ? r.dateArrivee.slice(0, 10) : '',
            dateDepart: r.dateDepart ? r.dateDepart.slice(0, 10) : '',
            nbAdultes: String(r.nbAdultes ?? r.nb_adultes ?? 1),
            nbEnfants: String(r.nbEnfants ?? r.nb_enfants ?? 0),
            nbPersonnes: String((r.nbPersonnes ?? r.nb_personnes ?? (r.nbAdultes + r.nbEnfants)) ?? 1),
            canalAcquisition: r.canalAcquisition ?? r.canal_acquisition ?? 'DIRECT',
            commentaire: r.commentaire ?? r.notesInternes ?? r.notes ?? '',
            petitDejeuner: r.petitDejeuner ?? r.petit_dejeuner ?? false,
            groupe: r.groupe ?? false,
            nbVelos: String(r.nbVelos ?? r.nb_velos ?? 0),
            demandesSpeciales: r.demandesSpeciales ?? r.demandes_speciales ?? '',
            litBebe: r.litBebe ?? r.lit_bebe ?? false,
            horaireArriveeTardive: r.horaireArriveeTardive ?? r.horaire_arrivee_tardive ?? ''
          };

          // ✅ Si on a un client complet, on enrichit le formulaire
          if (clientComplet) {
            console.log('👤 Client complet trouvé:', clientComplet);
            setSelectedClient(clientComplet);
            
            // Ajout des informations du client dans les demandes spéciales
            let demandes = formData.demandesSpeciales || '';
            
            // Allergies
            if (clientComplet.allergies) {
              const allergyText = `Allergies: ${clientComplet.allergies}`;
              if (!demandes.includes('Allergies:')) {
                demandes += `${demandes ? ' | ' : ''}${allergyText}`;
              }
            }
            
            // Régime alimentaire
            if (clientComplet.regime_alimentaire) {
              const regimeText = `Régime: ${clientComplet.regime_alimentaire}`;
              if (!demandes.includes('Régime:')) {
                demandes += `${demandes ? ' | ' : ''}${regimeText}`;
              }
            }
            
            // Chambre préférée
            if (clientComplet.chambre_preferee) {
              const chambreText = `Chambre préférée: ${clientComplet.chambre_preferee}`;
              if (!demandes.includes('Chambre préférée:')) {
                demandes += `${demandes ? ' | ' : ''}${chambreText}`;
              }
            }
            
            formData.demandesSpeciales = demandes;
            
            // ✅ Ajout du commentaire client
            let commentaireFinal = formData.commentaire || '';
            if (clientComplet.commentaire) {
              const noteClient = `📝 Notes client: ${clientComplet.commentaire}`;
              if (!commentaireFinal.includes('Notes client:')) {
                commentaireFinal += `${commentaireFinal ? '\n---\n' : ''}${noteClient}`;
              }
            }
            formData.commentaire = commentaireFinal;
            
            // Mise à jour de la recherche
            setClientSearch(`${clientComplet.prenom} ${clientComplet.nom}`);
          } else {
            // Fallback avec les données de la réservation
            const clientPrenom = r.client_prenom || r.client?.prenom || r.prenom || '';
            const clientNom = r.client_nom || r.client?.nom || r.nom || '';
            const clientEmail = r.client_email || r.client?.email || r.email || '';
            const clientTel = r.client_telephone || r.client?.telephone || r.telephone || '';
            
            setSelectedClient({
              id: clientId || 0,
              prenom: clientPrenom,
              nom: clientNom,
              email: clientEmail,
              telephone: clientTel,
              civilite: r.client_civilite || r.client?.civilite || r.civilite || '',
              adresse: r.client_adresse || r.client?.adresse || r.adresse || '',
              code_postal: r.client_code_postal || r.client?.code_postal || r.code_postal || '',
              ville: r.client_ville || r.client?.ville || r.ville || '',
              pays: r.client_pays || r.client?.pays || r.pays || 'France',
              statut: r.client_statut || r.client?.statut || r.statut || 'NOUVEAU',
              segment: r.client_segment || r.client?.segment || r.segment || 'TOURISTE_INDIVIDUEL',
              vip: r.client_vip || r.client?.vip || r.vip || false,
              nb_sejours: r.client_nb_sejours || r.client?.nb_sejours || r.nb_sejours || 0,
              montant_total_depense: r.client_montant_total_depense || r.client?.montant_total_depense || r.montant_total_depense || 0,
              allergies: r.client_allergies || r.client?.allergies || r.allergies || '',
              regime_alimentaire: r.client_regime_alimentaire || r.client?.regime_alimentaire || r.regime_alimentaire || '',
              chambre_preferee: r.client_chambre_preferee || r.client?.chambre_preferee || r.chambre_preferee || '',
              commentaire: r.client_commentaire || r.client?.commentaire || r.commentaire || r.notes || ''
            });
            setClientSearch(`${clientPrenom} ${clientNom}`);
          }

          // Mise à jour du formulaire
          setForm(formData);

          // Simulation automatique si les données sont présentes
          if (formData.chambreId && formData.dateArrivee && formData.dateDepart) {
            setTimeout(() => simuler(), 500);
          }
        }
      } catch (error) {
        console.error('❌ Erreur chargement initial:', error);
        toast.error('Erreur lors du chargement des données');
      } finally {
        setLoadingInit(false);
        setLoadingReservation(false);
      }
    };
    init();
  }, [id, isEdit]);

  // ============================================
  // RECHERCHE CLIENT
  // ============================================
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

  // ============================================
  // SÉLECTION D'UN CLIENT
  // ============================================
  const selectClient = async (client: any) => {
    try {
      // ✅ Récupérer le client complet
      const clientComplet = await fetchClientComplet(client.id);
      
      if (clientComplet) {
        setSelectedClient(clientComplet);
        
        // Construction des demandes spéciales à partir des données client
        let demandes = form.demandesSpeciales || '';
        
        if (clientComplet.allergies) {
          const allergyText = `Allergies: ${clientComplet.allergies}`;
          if (!demandes.includes('Allergies:')) {
            demandes += `${demandes ? ' | ' : ''}${allergyText}`;
          }
        }
        
        if (clientComplet.regime_alimentaire) {
          const regimeText = `Régime: ${clientComplet.regime_alimentaire}`;
          if (!demandes.includes('Régime:')) {
            demandes += `${demandes ? ' | ' : ''}${regimeText}`;
          }
        }
        
        if (clientComplet.chambre_preferee) {
          const chambreText = `Chambre préférée: ${clientComplet.chambre_preferee}`;
          if (!demandes.includes('Chambre préférée:')) {
            demandes += `${demandes ? ' | ' : ''}${chambreText}`;
          }
        }
        
        // Construction du commentaire avec les notes client
        let commentaireFinal = form.commentaire || '';
        if (clientComplet.commentaire) {
          const noteClient = `📝 Notes client: ${clientComplet.commentaire}`;
          if (!commentaireFinal.includes('Notes client:')) {
            commentaireFinal += `${commentaireFinal ? '\n---\n' : ''}${noteClient}`;
          }
        }
        
        setForm(f => ({
          ...f,
          clientId: String(clientComplet.id),
          demandesSpeciales: demandes,
          commentaire: commentaireFinal
        }));
        
        setClientSearch(`${clientComplet.prenom} ${clientComplet.nom}`);
        toast.success(`👤 Client ${clientComplet.prenom} ${clientComplet.nom} sélectionné`);
      } else {
        // Fallback
        setSelectedClient(client);
        setForm(f => ({ ...f, clientId: String(client.id) }));
        setClientSearch(`${client.prenom} ${client.nom}`);
        toast.warning('⚠️ Certaines données client sont incomplètes');
      }
    } catch (error) {
      console.error('❌ Erreur selectClient:', error);
      setSelectedClient(client);
      setForm(f => ({ ...f, clientId: String(client.id) }));
      setClientSearch(`${client.prenom} ${client.nom}`);
    }
    setShowClientDropdown(false);
  };

  // ============================================
  // SIMULATION TARIFAIRE
  // ============================================
  const simuler = async () => {
    if (!form.chambreId || !form.dateArrivee || !form.dateDepart) {
      setSimError('Sélectionnez une chambre et les dates');
      return;
    }
    setSimulating(true);
    setSimError('');
    setTotalAnimation(false);
    try {
      const res = await api.post('/reservations/calculer', {
        chambreId: Number(form.chambreId),
        dateArrivee: form.dateArrivee,
        dateDepart: form.dateDepart,
        nbAdultes: Number(form.nbAdultes) || 1,
        nbEnfants: Number(form.nbEnfants) || 0,
        nbPersonnes: Number(form.nbPersonnes) || 1,
        petitDejeuner: form.petitDejeuner,
        nbVelos: Number(form.nbVelos) || 0,
        litBebe: form.litBebe,
        demandesSpeciales: form.demandesSpeciales
      });

      setSimulation(res.data);
      setTimeout(() => setTotalAnimation(true), 100);
      toast.success('Tarif calculé avec succès');
    } catch (e: any) {
      console.error('❌ Erreur simulation:', e);
      setSimError(e.response?.data?.message || 'Erreur de simulation');
    } finally {
      setSimulating(false);
    }
  };

  // ============================================
  // SOUMISSION DU FORMULAIRE
  // ============================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.clientId || !form.chambreId || !form.dateArrivee || !form.dateDepart) {
      setError('Veuillez remplir tous les champs obligatoires');
      toast.error('Veuillez remplir tous les champs obligatoires');
      const errorEl = document.getElementById('form-error');
      if (errorEl) {
        errorEl.classList.add('animate-shake');
        setTimeout(() => errorEl.classList.remove('animate-shake'), 500);
      }
      return;
    }
    
    setSaving(true);
    setError('');
    
    try {
      const payload = {
        clientId: Number(form.clientId),
        chambreId: Number(form.chambreId),
        dateArrivee: form.dateArrivee,
        dateDepart: form.dateDepart,
        nbAdultes: Number(form.nbAdultes) || 1,
        nbEnfants: Number(form.nbEnfants) || 0,
        demandesSpeciales: form.demandesSpeciales || '',
        horaireArriveeTardive: form.horaireArriveeTardive || null,
        litBebe: form.litBebe || false,
        petitDejeunerInclus: form.petitDejeuner || false,
        canalAcquisition: form.canalAcquisition,
        commentaire: form.commentaire || '',
        groupe: form.groupe || false,
        nbVelos: Number(form.nbVelos) || 0
      };

      console.log('📤 Envoi payload:', payload);

      let response;
      if (isEdit) {
        response = await api.put(`/reservations/${id}`, payload);
      } else {
        response = await api.post('/reservations', payload);
      }

      if (response.data.success) {
        setSuccess(true);
        toast.success(isEdit ? '✅ Réservation modifiée avec succès' : '✅ Réservation créée avec succès');
        
        setTimeout(() => {
          navigate('/reservations');
        }, 2000);
      } else {
        toast.error(response.data.message || 'Erreur lors de l\'enregistrement');
        setError(response.data.message || 'Erreur lors de l\'enregistrement');
      }
    } catch (e: any) {
      console.error('❌ Erreur création:', e);
      const errorMsg = e.response?.data?.message || 'Erreur lors de l\'enregistrement';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // CALCULS
  // ============================================
  const nuits = form.dateArrivee && form.dateDepart ? nombreNuits(form.dateArrivee, form.dateDepart) : 0;

  const simData = simulation?.data || simulation || {};
  const simDetail = simData.detail || {};

  const chambreSelectionnee = chambres.find(c => c.id === Number(form.chambreId));

  const getSaisonInfo = () => {
    const saison = simDetail.saison || 'MOYENNE';
    const icons: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
      'BASSE': { icon: <Snowflake size={16} className="text-blue-400" />, color: 'bg-blue-50 border-blue-200 text-blue-700', label: 'Basse saison' },
      'MOYENNE': { icon: <Cloud size={16} className="text-green-400" />, color: 'bg-green-50 border-green-200 text-green-700', label: 'Moyenne saison' },
      'HAUTE': { icon: <Sun size={16} className="text-yellow-400" />, color: 'bg-yellow-50 border-yellow-200 text-yellow-700', label: 'Haute saison' }
    };
    return icons[saison] || icons['MOYENNE'];
  };

  const saisonInfo = getSaisonInfo();

  if (loadingInit) return <SpinnerComponent />;

  return (
    <div className="max-w-4xl mx-auto space-y-6 nouvelle-reservation-page">
      <style>{nouvelleReservationPageStyles}</style>
      
      {/* HEADER */}
      <div className="flex items-center justify-between animate-fadeInDown">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/reservations')} 
            className="text-gray-400 hover:text-gray-700 transition-all duration-300 hover:scale-110 hover:rotate-12"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            {isEdit ? 'Modifier la réservation' : 'Nouvelle réservation'}
            {!isEdit && <Sparkles size={18} className="text-palmier-400 animate-float" />}
          </h2>
        </div>
        {isEdit && (
          <div className="text-sm text-gray-500 font-medium">Mode édition</div>
        )}
      </div>

      {/* RÉSUMÉ DE LA RÉSERVATION */}
      {isEdit && selectedClient && chambreSelectionnee && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white border border-gray-200 rounded-2xl p-4 shadow-sm animate-fadeInDown">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Réservation</p>
            <p className="font-mono font-bold text-emerald-700">{isEdit ? `RES-${String(id).padStart(4, '0')}` : '—'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</p>
            <p className="font-medium text-gray-900">{selectedClient.prenom} {selectedClient.nom}</p>
            {selectedClient.vip && <Badge variant="warning" label="⭐ VIP" />}
            {selectedClient.statut === 'REGULIER' && <Badge variant="success" label="🔄 Régulier" />}
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Chambre</p>
            <p className="font-medium text-gray-900">
              {chambreSelectionnee?.nom || 'Chambre'}
              <span className="block text-xs text-gray-500">N° {chambreSelectionnee?.numero || ''}</span>
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tarif</p>
            <p className="font-medium text-gray-900">{formatEuro(simDetail.sousTotalHebergement || simDetail.prixNuitFinal * simDetail.nbNuits || simData.montantTotal || 0)}</p>
            <p className="text-xs text-gray-500">{nuits} nuit{nuits > 1 ? 's' : ''}</p>
          </div>
        </div>
      )}

      {/* ERREUR */}
      {error && (
        <div id="form-error" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2 text-sm animate-fadeInDown">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* SUCCÈS */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-3 text-sm animate-scaleIn">
          <Check size={24} className="text-green-600" />
          <span className="font-medium">{isEdit ? 'Réservation modifiée avec succès !' : 'Réservation créée avec succès !'}</span>
        </div>
      )}

      {/* CHARGEMENT RÉSERVATION */}
      {loadingReservation && (
        <div className="flex justify-center py-8">
          <Loader2 size={32} className="animate-spin text-palmier-500" />
        </div>
      )}

      {!loadingReservation && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* COLONNE PRINCIPALE */}
            <div className="lg:col-span-2 space-y-5">
              
              {/* SECTION CLIENT */}
              <div className="card p-6 space-y-4 animate-fadeInUp delay-100">
                <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide flex items-center gap-2">
                  <User size={16} className="text-palmier-500" />
                  Client
                  {selectedClient && (
                    <span className="ml-auto text-xs font-normal text-palmier-600 flex items-center gap-2">
                      <Star size={12} className="text-yellow-400" />
                      {selectedClient.email}
                    </span>
                  )}
                  {clientDetailsLoading && (
                    <Loader2 size={14} className="animate-spin text-palmier-500 ml-auto" />
                  )}
                </h3>

                {/* ✅ Affichage du client complet en mode édition */}
                {selectedClient && isEdit && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 animate-scaleIn">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center text-green-800 font-bold flex-shrink-0">
                        {selectedClient.prenom?.charAt(0)}{selectedClient.nom?.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-gray-900">
                            {selectedClient.civilite} {selectedClient.prenom} {selectedClient.nom}
                          </p>
                          {selectedClient.vip && <Badge variant="warning" label="⭐ VIP" />}
                          {selectedClient.statut === 'REGULIER' && <Badge variant="success" label="🔄 Régulier" />}
                          {selectedClient.statut === 'FIDELE' && <Badge variant="purple" label="❤️ Fidèle" />}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-green-600 mt-0.5">
                          <span className="flex items-center gap-1"><Mail size={12} /> {selectedClient.email}</span>
                          <span className="flex items-center gap-1"><Phone size={12} /> {selectedClient.telephone}</span>
                          {selectedClient.nb_sejours > 0 && (
                            <span className="flex items-center gap-1 bg-white/60 px-2 py-0.5 rounded-full">
                              📅 {selectedClient.nb_sejours} séjour{selectedClient.nb_sejours > 1 ? 's' : ''}
                            </span>
                          )}
                          {selectedClient.montant_total_depense > 0 && (
                            <span className="flex items-center gap-1 bg-white/60 px-2 py-0.5 rounded-full">
                              💰 {selectedClient.montant_total_depense.toFixed(0)}€ dépensés
                            </span>
                          )}
                        </div>
                        {selectedClient.adresse && (
                          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <MapPin size={12} className="text-gray-400" />
                            {selectedClient.adresse}, {selectedClient.ville} ({selectedClient.code_postal})
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* ✅ Affichage des informations complémentaires du client */}
                    {(selectedClient.allergies || selectedClient.regime_alimentaire || selectedClient.chambre_preferee || selectedClient.commentaire) && (
                      <div className="mt-2 p-2 bg-white/60 rounded-lg border border-green-200 space-y-1">
                        {selectedClient.allergies && (
                          <p className="text-xs flex items-start gap-1">
                            <span className="font-semibold text-amber-700">⚠️ Allergies:</span>
                            <span className="text-gray-700">{selectedClient.allergies}</span>
                          </p>
                        )}
                        {selectedClient.regime_alimentaire && (
                          <p className="text-xs flex items-start gap-1">
                            <span className="font-semibold text-blue-700">🍽️ Régime:</span>
                            <span className="text-gray-700">{selectedClient.regime_alimentaire}</span>
                          </p>
                        )}
                        {selectedClient.chambre_preferee && (
                          <p className="text-xs flex items-start gap-1">
                            <span className="font-semibold text-purple-700">🛏️ Chambre préférée:</span>
                            <span className="text-gray-700">{selectedClient.chambre_preferee}</span>
                          </p>
                        )}
                        {selectedClient.commentaire && (
                          <p className="text-xs flex items-start gap-1 border-t border-green-200 pt-1 mt-1">
                            <span className="font-semibold text-gray-600">📝 Notes:</span>
                            <span className="text-gray-700">{selectedClient.commentaire}</span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {!isEdit && (
                  <>
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Rechercher un client <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={clientSearch}
                          onChange={e => { 
                            setClientSearch(e.target.value); 
                            setSelectedClient(null); 
                            setForm(f => ({ ...f, clientId: '' })); 
                          }}
                          onFocus={() => setFocusedField('client')}
                          onBlur={() => setFocusedField(null)}
                          placeholder="Nom, prénom ou email…"
                          className={`field-animated w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-palmier-500 outline-none ${focusedField === 'client' ? 'border-palmier-400' : ''}`}
                          style={{ color: '#1a1a1a' }}
                        />
                        <div className="field-glow" />
                      </div>
                      {showClientDropdown && clientResults.length > 0 && (
                        <div className="client-dropdown">
                          {clientResults.map((c: any) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => selectClient(c)}
                            >
                              <span className="client-name">{c.prenom} {c.nom}</span>
                              <span className="client-email">{c.email}</span>
                              {c.vip && <span className="client-vip">VIP</span>}
                              {c.statut === 'REGULIER' && <span className="client-vip" style={{ background: '#d1fae5', color: '#065f46' }}>Régulier</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {selectedClient && (
                      <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-700 flex items-center gap-2 animate-scaleIn">
                        <Check size={14} className="text-green-600" />
                        Client sélectionné : <strong>{selectedClient.prenom} {selectedClient.nom}</strong>
                        {selectedClient.vip && <Badge variant="warning" label="⭐ VIP" />}
                        <span className="ml-auto text-xs text-green-500">✓ Confirmé</span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => navigate('/clients?new=1')}
                      className="text-sm text-palmier-600 hover:text-palmier-800 font-medium transition-all duration-200 hover:translate-x-1 inline-flex items-center gap-1"
                    >
                      + Créer un nouveau client
                    </button>
                  </>
                )}
              </div>

              {/* SECTION SÉJOUR */}
              <div className="card p-6 space-y-4 animate-fadeInUp delay-200">
                <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide flex items-center gap-2">
                  <BedDouble size={16} className="text-palmier-500" />
                  Séjour
                  {nuits > 0 && (
                    <span className="ml-auto text-xs font-normal bg-palmier-50 text-palmier-700 px-2 py-0.5 rounded-full">
                      {nuits} nuit{nuits > 1 ? 's' : ''}
                    </span>
                  )}
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Chambre <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={form.chambreId}
                      onChange={e => setForm(f => ({ ...f, chambreId: e.target.value }))}
                      onFocus={() => setFocusedField('chambre')}
                      onBlur={() => setFocusedField(null)}
                      disabled={isEdit}
                      className={`field-animated w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-palmier-500 outline-none bg-white ${focusedField === 'chambre' ? 'border-palmier-400' : ''}`}
                      style={{ color: '#1a1a1a' }}
                    >
                      <option value="">Sélectionner une chambre…</option>
                      {chambres.map((c: any) => (
                        <option key={c.id} value={c.id} style={{ color: '#1a1a1a', background: 'white' }}>
                          {c.nom} ({c.numero} · {c.capaciteAdultes || 2} pers.)
                        </option>
                      ))}
                    </select>
                    {isEdit && (
                      <p className="mt-1 text-xs text-gray-500">
                        Chambre réservée pour ce séjour, sélection verrouillée.
                      </p>
                    )}
                    <div className="field-glow" />
                  </div>
                </div>

                {/* Détails de la chambre sélectionnée */}
                {chambreSelectionnee && (
                  <div className="bg-palmier-50 border border-palmier-200 rounded-lg p-3 animate-fadeInDown">
                    <div className="flex items-center gap-2 mb-1">
                      <Building size={14} className="text-palmier-600" />
                      <span className="font-semibold text-gray-900">Détails de la chambre</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-gray-500 font-semibold">Nom</p>
                        <p className="font-medium text-gray-900">{chambreSelectionnee.nom}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-semibold">Numéro</p>
                        <p className="font-medium text-gray-900">N° {chambreSelectionnee.numero}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-semibold">Capacité</p>
                        <p className="font-medium text-gray-900">{chambreSelectionnee.capaciteAdultes} adultes</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-semibold">Surface</p>
                        <p className="font-medium text-gray-900">{chambreSelectionnee.surfaceM2} m²</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-semibold">Vue</p>
                        <p className="font-medium text-gray-900">{chambreSelectionnee.vue}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-semibold">PMR</p>
                        <p className="font-medium text-gray-900">{chambreSelectionnee.accessiblePMR ? '✅ Accessible' : '❌ Non accessible'}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500 font-semibold">Équipements</p>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {chambreSelectionnee.equipements?.map((eq: string, i: number) => (
                            <span key={i} className="text-xs bg-white px-1.5 py-0.5 rounded-full border border-gray-200 text-gray-700">
                              {eq}
                            </span>
                          ))}
                          {!chambreSelectionnee.equipements?.length && (
                            <span className="text-xs text-gray-400">Aucun équipement</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Arrivée <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={form.dateArrivee}
                        onChange={e => setForm(f => ({ ...f, dateArrivee: e.target.value }))}
                        onFocus={() => setFocusedField('arrivee')}
                        onBlur={() => setFocusedField(null)}
                        required
                        className={`field-animated w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-palmier-500 outline-none ${focusedField === 'arrivee' ? 'border-palmier-400' : ''}`}
                        style={{ color: '#1a1a1a' }}
                      />
                      <div className="field-glow" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Départ <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={form.dateDepart}
                        min={form.dateArrivee}
                        onChange={e => setForm(f => ({ ...f, dateDepart: e.target.value }))}
                        onFocus={() => setFocusedField('depart')}
                        onBlur={() => setFocusedField(null)}
                        required
                        className={`field-animated w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-palmier-500 outline-none ${focusedField === 'depart' ? 'border-palmier-400' : ''}`}
                        style={{ color: '#1a1a1a' }}
                      />
                      <div className="field-glow" />
                    </div>
                  </div>
                </div>

                {nuits > 0 && (
                  <div className="bg-palmier-50 border border-palmier-200 rounded-lg p-3 flex items-center justify-between animate-fadeInDown">
                    <div className="flex items-center gap-2 text-sm text-palmier-700">
                      <Calendar size={14} className="text-palmier-500" />
                      <span className="font-medium">{nuits} nuit{nuits > 1 ? 's' : ''} de séjour</span>
                    </div>
                    {nuits > 5 && (
                      <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full flex items-center gap-1">
                        <TrendingUp size={12} />
                        Tarif dégressif
                      </span>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Personnes</label>
                    <div className="relative">
                      <input
                        type="number" min={1} max={20}
                        value={form.nbPersonnes}
                        onChange={e => setForm(f => ({ ...f, nbPersonnes: e.target.value }))}
                        className="field-animated w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-palmier-500 outline-none"
                        style={{ color: '#1a1a1a' }}
                      />
                      <div className="field-glow" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Adultes</label>
                    <div className="relative">
                      <input
                        type="number" min={1}
                        value={form.nbAdultes}
                        onChange={e => setForm(f => ({ ...f, nbAdultes: e.target.value }))}
                        className="field-animated w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-palmier-500 outline-none"
                        style={{ color: '#1a1a1a' }}
                      />
                      <div className="field-glow" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Enfants</label>
                    <div className="relative">
                      <input
                        type="number" min={0}
                        value={form.nbEnfants}
                        onChange={e => setForm(f => ({ ...f, nbEnfants: e.target.value }))}
                        className="field-animated w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-palmier-500 outline-none"
                        style={{ color: '#1a1a1a' }}
                      />
                      <div className="field-glow" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Heure d'arrivée</label>
                    <div className="relative">
                      <input
                        type="time"
                        value={form.horaireArriveeTardive}
                        onChange={e => setForm(f => ({ ...f, horaireArriveeTardive: e.target.value }))}
                        className="field-animated w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-palmier-500 outline-none"
                        style={{ color: '#1a1a1a' }}
                      />
                      <div className="field-glow" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Demandes spéciales</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={form.demandesSpeciales}
                        onChange={e => setForm(f => ({ ...f, demandesSpeciales: e.target.value }))}
                        placeholder="Allergies, régime, etc."
                        className="field-animated w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-palmier-500 outline-none"
                        style={{ color: '#1a1a1a' }}
                      />
                      <div className="field-glow" />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION OPTIONS */}
              <div className="card p-6 space-y-4 animate-fadeInUp delay-300">
                <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide flex items-center gap-2">
                  <Gift size={16} className="text-palmier-500" />
                  Options & Canal
                </h3>

                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={form.petitDejeuner}
                      onChange={e => setForm(f => ({ ...f, petitDejeuner: e.target.checked }))}
                      className="w-4 h-4 text-palmier-600 rounded transition-all duration-300 group-hover:scale-110"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-palmier-600 transition-colors duration-200">
                      Petit-déjeuner inclus
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={form.litBebe}
                      onChange={e => setForm(f => ({ ...f, litBebe: e.target.checked }))}
                      className="w-4 h-4 text-palmier-600 rounded transition-all duration-300 group-hover:scale-110"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-palmier-600 transition-colors duration-200">
                      Lit bébé requis <span className="text-xs text-green-600">(gratuit)</span>
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={form.groupe}
                      onChange={e => setForm(f => ({ ...f, groupe: e.target.checked }))}
                      className="w-4 h-4 text-palmier-600 rounded transition-all duration-300 group-hover:scale-110"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-palmier-600 transition-colors duration-200">
                      Réservation groupe
                    </span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                      <Bike size={14} className="text-palmier-500" />
                      Vélos réservés
                    </label>
                    <div className="relative">
                      <input
                        type="number" min={0} max={5}
                        value={form.nbVelos}
                        onChange={e => setForm(f => ({ ...f, nbVelos: e.target.value }))}
                        className="field-animated w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-palmier-500 outline-none"
                        style={{ color: '#1a1a1a' }}
                      />
                      <div className="field-glow" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                      <MapPin size={14} className="text-palmier-500" />
                      Canal d'acquisition
                    </label>
                    <select
                      value={form.canalAcquisition}
                      onChange={e => setForm(f => ({ ...f, canalAcquisition: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-palmier-500 outline-none bg-white transition-all duration-200 hover:border-palmier-300"
                      style={{ color: '#1a1a1a' }}
                    >
                      {CANAUX.map(c => (
                        <option key={c} value={c} style={{ color: '#1a1a1a', background: 'white' }}>
                          {canalAcquisitionLabel?.[c] ?? c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Commentaire interne</label>
                  <textarea
                    value={form.commentaire}
                    onChange={e => setForm(f => ({ ...f, commentaire: e.target.value }))}
                    rows={4}
                    placeholder="Notes internes, demandes spéciales, informations client…"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-palmier-500 outline-none resize-none transition-all duration-200 hover:border-palmier-300 focus:scale-[1.01]"
                    style={{ color: '#1a1a1a' }}
                  />
                </div>
              </div>
            </div>

            {/* SIDEBAR — SIMULATION */}
            <div className="space-y-4 animate-fadeInRight delay-400">
              <div className="card p-5 sticky top-4 animate-glowPulse">
                <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide mb-4 flex items-center gap-2">
                  <Calculator size={16} className="text-palmier-500" />
                  Gérer les tarifs
                </h3>

                <button
                  type="button"
                  onClick={simuler}
                  disabled={simulating || !form.chambreId || !form.dateArrivee || !form.dateDepart}
                  className="btn-primary w-full flex items-center justify-center gap-2 mb-4 disabled:opacity-50 relative overflow-hidden group"
                >
                  {simulating ? (
                    <>
                      <Loader2 size={15} className="animate-spin flex-shrink-0" />
                      <span className="inline-block min-w-[120px] text-center">Calcul en cours...</span>
                    </>
                  ) : (
                    <>
                      <Calculator size={15} className="group-hover:rotate-12 transition-transform duration-300 flex-shrink-0" />
                      <span className="inline-block min-w-[120px] text-center">Calculer le tarif</span>
                    </>
                  )}
                </button>

                {simError && (
                  <div className="text-red-600 text-xs flex items-center gap-1 mb-3 animate-shake">
                    <AlertCircle size={12} /> {simError}
                  </div>
                )}

                {simulation && (
                  <div className="space-y-2 text-sm animate-fadeInDown">
                    {/* SAISON */}
                    <div className={`flex items-center justify-between p-2 rounded-lg border ${saisonInfo.color} mb-2`}>
                      <span className="flex items-center gap-1 font-medium">
                        <span className="saison-icon">{saisonInfo.icon}</span>
                        {saisonInfo.label}
                      </span>
                      <span className="text-xs opacity-75">
                        {simDetail.detailNuits?.semaine || 0}j · {simDetail.detailNuits?.weekend || 0}j weekend
                      </span>
                    </div>

                    <div className="flex justify-between text-gray-700">
                      <span>Hébergement ({simData.reservation?.nbNuits || simDetail.nbNuits || 0} nuits)</span>
                      <span className="text-gray-900">{formatEuro(simDetail.sousTotalHebergement || simDetail.prixNuitFinal * simDetail.nbNuits || 0)}</span>
                    </div>

                    {simDetail.prixPetitDejeunerHT > 0 && (
                      <div className="flex justify-between text-gray-700 animate-slideDown">
                        <span>Petit-déjeuner</span>
                        <span className="text-gray-900">+{formatEuro(simDetail.prixPetitDejeunerHT)}</span>
                      </div>
                    )}

                    {simDetail.prixEnfantsHT > 0 && (
                      <div className="flex justify-between text-gray-700 animate-slideDown">
                        <span>Enfants (-12 ans)</span>
                        <span className="text-gray-900">+{formatEuro(simDetail.prixEnfantsHT)}</span>
                      </div>
                    )}

                    {simDetail.prixLitsSuppHT > 0 && (
                      <div className="flex justify-between text-gray-700 animate-slideDown">
                        <span>Lits supplémentaires</span>
                        <span className="text-gray-900">+{formatEuro(simDetail.prixLitsSuppHT)}</span>
                      </div>
                    )}

                    {simData.supplementVelos > 0 && (
                      <div className="flex justify-between text-gray-700 animate-slideDown">
                        <span className="flex items-center gap-1">
                          <Bike size={12} className="text-palmier-500" />
                          Vélos ({form.nbVelos})
                        </span>
                        <span className="text-gray-900">+{formatEuro(simData.supplementVelos)}</span>
                      </div>
                    )}

                    {simDetail.coeffDegressif < 1 && (
                      <div className="flex justify-between text-green-700 animate-slideDown">
                        <span>Réduction long séjour (-{Math.round((1 - simDetail.coeffDegressif) * 100)}%)</span>
                        <span>-{formatEuro(simDetail.prixNuitFinal * simDetail.nbNuits * (1 - simDetail.coeffDegressif))}</span>
                      </div>
                    )}

                    {simData.promoApplied && simData.reductionPromo > 0 && (
                      <div className="flex justify-between text-green-700 animate-slideDown">
                        <span className="flex items-center gap-1">
                          <Gift size={12} />
                          Code promo {simData.promoApplied.code}
                        </span>
                        <span>-{formatEuro(simData.reductionPromo)}</span>
                      </div>
                    )}

                    <div className="border-t border-gray-200 pt-2 mt-2" />

                    <div className="flex justify-between text-gray-500 text-xs">
                      <span>Sous-total HT</span>
                      <span>{formatEuro(simData.totalHT || 0)}</span>
                    </div>

                    <div className="flex justify-between text-gray-500 text-xs">
                      <span>TVA ({simDetail.taxes?.tauxTVA || 5.5}%)</span>
                      <span>{formatEuro(simData.montantTVA || 0)}</span>
                    </div>

                    <div className="flex justify-between text-gray-500 text-xs">
                      <span>Taxe de séjour</span>
                      <span>{formatEuro(simData.taxeSejour || 0)}</span>
                    </div>

                    <div className="border-t border-gray-300 border-dashed pt-2 mt-1" />

                    <div className="flex justify-between font-bold text-gray-900">
                      <span>Total TTC</span>
                      <span className="text-palmier-700">{formatEuro(simData.totalTTC || 0)}</span>
                    </div>

                    <div 
                      ref={totalRef}
                      className={`total-amount flex justify-between font-bold bg-palmier-50 p-3 rounded-lg border border-palmier-200 text-base ${totalAnimation ? 'changed' : ''}`}
                    >
                      <span className="text-palmier-800 flex items-center gap-1">
                        <CreditCard size={14} />
                        Total à payer
                      </span>
                      <span className="text-palmier-700">
                        {formatEuro(simData.total || simData.montantTotal || 0)}
                      </span>
                    </div>

                    <div className="text-xs text-gray-600 mt-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> Acompte (30%)
                      </span>
                      <span className="text-gray-800">{formatEuro(simData.acompte || (simData.total || 0) * 0.3)}</span>
                    </div>

                    <div className="text-xs text-gray-500 flex items-center justify-between">
                      <span>Restant dû</span>
                      <span className="text-gray-700">{formatEuro((simData.total || 0) - (simData.acompte || (simData.total || 0) * 0.3))}</span>
                    </div>
                  </div>
                )}

                {/* BOUTONS */}
                <div className="mt-5 pt-4 border-t border-gray-200 space-y-2 animate-fadeInUp delay-500">
                  <button 
                    type="submit" 
                    disabled={saving} 
                    className="btn-primary w-full flex items-center justify-center gap-2 relative overflow-hidden group min-h-[48px]"
                  >
                    {saving ? (
                      <>
                        <Loader2 size={15} className="animate-spin flex-shrink-0" />
                        <span className="inline-block min-w-[200px] text-center font-medium">
                          Enregistrement en cours...
                        </span>
                      </>
                    ) : (
                      <>
                        <Save size={15} className="group-hover:scale-110 transition-transform duration-300 flex-shrink-0" />
                        <span className="inline-block min-w-[200px] text-center font-medium">
                          {isEdit ? 'Enregistrer les modifications' : 'Créer la réservation'}
                        </span>
                      </>
                    )}
                    <span className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg" />
                  </button>
                  
                  <button 
                    type="button" 
                    onClick={() => navigate('/reservations')} 
                    className="btn-secondary w-full transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2 group min-h-[48px]"
                  >
                    <span className="inline-block min-w-[200px] text-center font-medium">
                      Annuler
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}