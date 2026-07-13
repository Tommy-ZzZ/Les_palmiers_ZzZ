// frontend/src/pages/PaiementsPage.tsx
import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  CreditCard,
  Plus,
  Search,
  Euro,
  Send,
  Eye,
  Download,
  Calendar,
  Clock,
  CheckCircle,
  RefreshCw,
  FileText,
  ChevronDown,
  ChevronUp,
  Receipt,
  SlidersHorizontal,
  TrendingUp,
  TrendingDown,
  BadgeDollarSign,
  History,
  Coins,
  PiggyBank,
  Gift,
  Users,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mail,
  X,
  AlertCircle,
  Printer,
  Phone,
  MapPin,
  Banknote,
  Landmark,
  ReceiptText,
  AlertTriangle,
  Hourglass,
  Timer,
  Sparkles,
  Shield,
  Award,
  Zap,
  Lock,
  Check,
  CircleCheck,
  Palmtree,
  Building,
  User,
  Calendar as CalendarIcon,
  DollarSign,
  Home,
  PieChart,
  BarChart3,
  Activity,
  Wallet,
  CreditCard as CardIcon,
  ArrowRight,
  ArrowLeft,
  Filter,
  Grid,
  List,
  Settings,
  HelpCircle,
  Bell,
  BellOff,
  Moon,
  Sun,
  Monitor,
  LayoutDashboard,
  FileInvoice,
  FileSpreadsheet,
  Printer as PrinterIcon,
  Copy,
  Share2,
  Star,
  Heart,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  PhoneCall,
  Video,
  Camera,
  Image,
  Music,
  Headphones,
  Tv,
  Wifi,
  Coffee,
  Wind,
  Snowflake,
  Umbrella,
  Sun as SunIcon,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Droplets,
  Thermometer,
  Compass,
  Navigation,
  Map,
  Globe,
  Flag,
  Award as AwardIcon,
  Medal,
  Trophy,
  Crown,
  Diamond,
  Gem,
  Sparkle,
  Fire,
  Flame,
  Zap as ZapIcon,
  Rocket,
  Plane,
  Car,
  Bus,
  Train,
  Bike,
  Footprints,
  Mountain,
  TreePine,
  Flower,
  Leaf,
  PalmTree,
  Sprout,
  Apple,
  Coffee as CoffeeIcon,
  Utensils,
  Pizza,
  Cake,
  IceCream,
  Beer,
  Wine,
  GlassWater,
  Droplet,
  Waves,
  Sailboat,
  Ship,
  Anchor,
  Fish,
  Bird,
  Dog,
  Cat,
  Rabbit,
  Turtle,
  Bug,
  Butterfly,
  Bee,
  Ant,
  Spider,
  Scorpion,
  Dragonfly,
  Snail,
  Worm,
  Microscope,
  Flask,
  TestTube,
  Beaker,
  Atom,
  Dna,
  Brain,
  HeartPulse,
  Stethoscope,
  Pill,
  Syringe,
  Bandage,
  Hospital,
  Ambulance,
  Truck,
  Package,
  Box,
  Archive,
  Folder,
  FolderOpen,
  FolderPlus,
  FolderSearch,
  FolderMinus,
  FolderX,
  File,
  FilePlus,
  FileMinus,
  FileSearch,
  FileX,
  FileCheck,
  FileWarning,
  FileCog,
  FileQuestion,
  FileUser,
  FileCode,
  FileImage,
  FileAudio,
  FileVideo,
  FileSpreadsheet as FileSpreadsheetIcon,
  FileText as FileTextIcon,
  FileCheck as FileCheckIcon,
  FileX as FileXIcon,
  FileWarning as FileWarningIcon,
  FileCog as FileCogIcon,
  FileQuestion as FileQuestionIcon,
  FileUser as FileUserIcon,
  FileCode as FileCodeIcon,
  FileImage as FileImageIcon,
  FileAudio as FileAudioIcon,
  FileVideo as FileVideoIcon,
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  FolderPlus as FolderPlusIcon,
  FolderSearch as FolderSearchIcon,
  FolderMinus as FolderMinusIcon,
  FolderX as FolderXIcon,
  Archive as ArchiveIcon,
  Package as PackageIcon,
  Box as BoxIcon,
  Truck as TruckIcon,
  Ship as ShipIcon,
  Plane as PlaneIcon,
  Car as CarIcon,
  Bus as BusIcon,
  Train as TrainIcon,
  Bike as BikeIcon,
  Footprints as FootprintsIcon,
  Mountain as MountainIcon,
  TreePine as TreePineIcon,
  Flower as FlowerIcon,
  Leaf as LeafIcon,
  PalmTree as PalmTreeIcon,
  Sprout as SproutIcon,
  Apple as AppleIcon,
  Coffee as CoffeeIcon2,
  Utensils as UtensilsIcon,
  Pizza as PizzaIcon,
  Cake as CakeIcon,
  IceCream as IceCreamIcon,
  Beer as BeerIcon,
  Wine as WineIcon,
  GlassWater as GlassWaterIcon,
  Droplet as DropletIcon,
  Waves as WavesIcon,
  Sailboat as SailboatIcon,
  Ship as ShipIcon2,
  Anchor as AnchorIcon,
  Fish as FishIcon,
  Bird as BirdIcon,
  Dog as DogIcon,
  Cat as CatIcon,
  Rabbit as RabbitIcon,
  Turtle as TurtleIcon,
  Bug as BugIcon,
  Butterfly as ButterflyIcon,
  Bee as BeeIcon,
  Ant as AntIcon,
  Spider as SpiderIcon,
  Scorpion as ScorpionIcon,
  Dragonfly as DragonflyIcon,
  Snail as SnailIcon,
  Worm as WormIcon,
  Microscope as MicroscopeIcon,
  Flask as FlaskIcon,
  TestTube as TestTubeIcon,
  Beaker as BeakerIcon,
  Atom as AtomIcon,
  Dna as DnaIcon,
  Brain as BrainIcon,
  HeartPulse as HeartPulseIcon,
  Stethoscope as StethoscopeIcon,
  Pill as PillIcon,
  Syringe as SyringeIcon,
  Bandage as BandageIcon,
  Hospital as HospitalIcon,
  Ambulance as AmbulanceIcon,
  Truck as TruckIcon2,
  Package as PackageIcon2,
  Box as BoxIcon2,
  Archive as ArchiveIcon2,
  Folder as FolderIcon2,
  FolderOpen as FolderOpenIcon2,
  FolderPlus as FolderPlusIcon2,
  FolderSearch as FolderSearchIcon2,
  FolderMinus as FolderMinusIcon2,
  FolderX as FolderXIcon2,
  File as FileIcon,
  FilePlus as FilePlusIcon,
  FileMinus as FileMinusIcon,
  FileSearch as FileSearchIcon,
  FileX as FileXIcon2,
  FileCheck as FileCheckIcon2,
  FileWarning as FileWarningIcon2,
  FileCog as FileCogIcon2,
  FileQuestion as FileQuestionIcon2,
  FileUser as FileUserIcon2,
  FileCode as FileCodeIcon2,
  FileImage as FileImageIcon2,
  FileAudio as FileAudioIcon2,
  FileVideo as FileVideoIcon2
} from 'lucide-react';
import { paiementService, reservationService } from '../services/api';
import { formatEuro, formatDate, formatDateTime } from '../utils/helpers';
import { useWebSocketContext } from '../context/WebSocketContext';
import { notifyAjout } from '../components/ui/AjoutNotification';

// ============================================
// TYPES
// ============================================

type StatutPaiement = 'COMPLET' | 'PARTIEL' | 'EN_ATTENTE' | 'IMPREVU';
type ModePaiement = 'ESPECES' | 'CARTE' | 'VIREMENT' | 'CHEQUE';
type TypeVersement = 'ACOMPTE' | 'SOLDE' | 'ARRHES';
type StatutReservation = 'EN_ATTENTE_ACOMPTE' | 'CONFIRMEE' | 'ANNULEE' | 'TERMINEE' | 'NO_SHOW';
type NiveauAlerte = 'INFO' | 'WARNING' | 'CRITICAL';
type TypeCarte = 'CB' | 'VISA' | 'MASTERCARD' | 'AMEX';

interface Paiement {
  id: number;
  montant: number;
  modePaiement: ModePaiement;
  typePaiement: TypeVersement;
  datePaiement: string;
  reference: string;
  notes?: string;
  enregistrePar?: number;
  createdAt: string;
  numeroCheque?: string;
  banqueEmettrice?: string;
  typeCarte?: TypeCarte;
  numeroCarteMasque?: string;
  referenceVirement?: string;
}

interface AlertePaiement {
  id: number;
  type: 'ACOMPTE_NON_RECU' | 'ATTENTE_LONGUE' | 'IMPAYE';
  message: string;
  niveau: NiveauAlerte;
  lue: boolean;
  dateHeure: string;
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
  montantTotal: number;
  montantAcompte: number;
  montantSolde: number;
  montantRestantDu: number;
  statutPaiement: StatutPaiement;
  client: { id: number; prenom: string; nom: string; email: string; telephone: string; adresse?: string };
  chambre: { id: number; nom: string; numero: string };
  paiements: Paiement[];
  dateCreation: string;
  alertes?: AlertePaiement[];
  client_prenom?: string;
  client_nom?: string;
  client_email?: string;
  client_telephone?: string;
  chambre_nom?: string;
  chambre_numero?: string;
  petitDejeunerInclus?: boolean;
  services?: any[];
}

interface StatsData {
  total: number;
  complet: number;
  partiel: number;
  enAttente: number;
  imprevu: number;
  montantTotal: number;
  montantPaye: number;
  montantRestant: number;
  tauxRecouvrement: number;
}

// ============================================
// COMPOSANT — FACTURE MODAL (SANS EMOJI)
// ============================================

const FactureModal = ({
  isOpen,
  onClose,
  reservation
}: {
  isOpen: boolean;
  onClose: () => void;
  reservation: Reservation | null;
}) => {
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen || !reservation) return null;

  const formatDateFacture = (date: string) => new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric'
  });

  const totalServices = (reservation.services || []).reduce((sum, s) => sum + (s.montant || 0), 0);
  const totalTTC = (reservation.montantTotal || 0) + totalServices;

  const toNumber = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return parseFloat(value) || 0;
    return 0;
  };

  const safeFormat = (value: any, decimals: number = 0): string => {
    const num = toNumber(value);
    return num.toFixed(decimals);
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (!printWindow) {
        notifyAjout('error', 'Erreur', 'Veuillez autoriser les pop-ups pour exporter le PDF');
        setIsExporting(false);
        return;
      }

      const styles = `
        <style>
          @page { size: A4; margin: 20mm; }
          body { font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; color: #1a1a1a; background: white; padding: 20px; }
          .facture-container { max-width: 800px; margin: 0 auto; }
          .facture-header {
            background: linear-gradient(135deg, #065f46, #0d9488);
            color: white;
            padding: 24px 32px;
            border-radius: 12px 12px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .facture-header .logo { display: flex; align-items: center; gap: 14px; }
          .facture-header .logo .icon { font-size: 28px; }
          .facture-header .logo h1 { font-size: 22px; margin: 0; font-weight: 700; }
          .facture-header .logo p { font-size: 12px; opacity: 0.8; margin: 0; }
          .facture-body { padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; }
          .facture-identity { display: flex; justify-content: space-between; border-bottom: 2px solid #e5e7eb; padding-bottom: 16px; margin-bottom: 20px; }
          .facture-identity .gite h2 { color: #065f46; margin: 0; font-weight: 700; }
          .facture-identity .gite p { margin: 4px 0; font-size: 13px; color: #4b5563; }
          .facture-client { background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e5e7eb; }
          .facture-client h4 { font-size: 11px; text-transform: uppercase; color: #6b7280; margin: 0 0 6px 0; letter-spacing: 0.5px; font-weight: 600; }
          .facture-client p { margin: 4px 0; font-size: 14px; }
          .facture-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            background: #ecfdf5;
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 20px;
            border: 1px solid #a7f3d0;
          }
          .facture-details div p:first-child { font-size: 10px; text-transform: uppercase; color: #065f46; font-weight: 600; letter-spacing: 0.5px; margin: 0; }
          .facture-details div p:last-child { font-size: 14px; font-weight: 500; margin: 4px 0 0 0; }
          .facture-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
          .facture-table th { background: #f9fafb; padding: 12px 16px; text-align: left; font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: 600; border-bottom: 1px solid #e5e7eb; }
          .facture-table th:last-child, .facture-table td:last-child { text-align: right; }
          .facture-table td { padding: 12px 16px; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
          .facture-table tfoot td { border-top: 2px solid #d1d5db; font-weight: 600; }
          .facture-total {
            background: #ecfdf5;
            padding: 16px 20px;
            border-radius: 8px;
            display: flex;
            justify-content: space-between;
            font-size: 18px;
            font-weight: 700;
            border: 2px solid #065f46;
            margin-top: 12px;
          }
          .facture-total .label { color: #065f46; }
          .facture-total .amount { color: #065f46; }
          .facture-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 20px;
            padding-top: 16px;
            border-top: 1px solid #e5e7eb;
          }
          .facture-footer .logo-small { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #6b7280; }
          .facture-footer .logo-small .icon { font-size: 18px; }
          .facture-footer .text { font-size: 12px; color: #6b7280; }
          @media print { .no-print { display: none !important; } body { padding: 0; } .facture-container { max-width: 100%; } }
        </style>
      `;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Facture ${reservation.numeroReservation}</title>
          ${styles}
        </head>
        <body>
          <div class="facture-container">
            <div class="facture-header">
              <div class="logo">
                <span class="icon">🌴</span>
                <div>
                  <h1>Les Palmiers</h1>
                  <p>Gîte de charme - L'Entre-Deux</p>
                </div>
              </div>
              <div style="text-align:right;">
                <p style="margin:0;font-size:14px;font-weight:600;">Facture</p>
                <p style="margin:2px 0 0 0;font-size:13px;opacity:0.8;">N° ${reservation.numeroReservation}</p>
              </div>
            </div>
            <div class="facture-body">
              <div class="facture-identity">
                <div class="gite">
                  <h2>🌴 Les Palmiers</h2>
                  <p>12 Rue des Palmiers, 97440 L'Entre-Deux</p>
                  <p>La Réunion</p>
                  <p>Tél: 0262 12 34 56</p>
                </div>
                <div style="text-align:right;">
                  <p style="font-size:13px;color:#6b7280;margin:0;">Émise le ${new Date().toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
              <div class="facture-client">
                <h4>Client</h4>
                <p><strong>${reservation.client?.prenom || reservation.client_prenom || ''} ${reservation.client?.nom || reservation.client_nom || ''}</strong></p>
                <p>${reservation.client?.email || reservation.client_email || ''}</p>
                <p>${reservation.client?.telephone || reservation.client_telephone || ''}</p>
              </div>
              <div class="facture-details">
                <div><p>Arrivée</p><p>${formatDateFacture(reservation.dateArrivee)}</p></div>
                <div><p>Départ</p><p>${formatDateFacture(reservation.dateDepart)}</p></div>
                <div><p>Chambre</p><p>${reservation.chambre?.nom || reservation.chambre_nom || ''}</p></div>
                <div><p>Personnes</p><p>${reservation.nbAdultes} adultes${reservation.nbEnfants > 0 ? ` + ${reservation.nbEnfants} enfants` : ''}</p></div>
              </div>
              <table class="facture-table">
                <thead>
                  <tr><th>Description</th><th style="text-align:center;">Qté</th><th style="text-align:right;">Prix</th><th style="text-align:right;">Total</th></tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Hébergement - ${reservation.nbNuits} nuits</td>
                    <td style="text-align:center;">${reservation.nbNuits}</td>
                    <td style="text-align:right;">${safeFormat((reservation.montantTotal) / Math.max(1, reservation.nbNuits), 0)}€</td>
                    <td style="text-align:right;font-weight:600;">${safeFormat(reservation.montantTotal, 2)}€</td>
                  </tr>
                  ${reservation.petitDejeunerInclus ? `
                  <tr><td>Petit-déjeuner inclus</td><td style="text-align:center;">-</td><td style="text-align:right;">-</td><td style="text-align:right;color:#065f46;font-weight:600;">Inclus</td></tr>
                  ` : ''}
                  ${(reservation.services || []).map((s: any) => `
                  <tr>
                    <td>${s.libelle || s.type || 'Service'}</td>
                    <td style="text-align:center;">${s.quantite || 1}</td>
                    <td style="text-align:right;">${safeFormat((s.montant || 0) / Math.max(1, s.quantite || 1), 0)}€</td>
                    <td style="text-align:right;font-weight:600;">${safeFormat(s.montant, 2)}€</td>
                  </tr>
                  `).join('')}
                </tbody>
                <tfoot>
                  <tr><td colspan="3" style="text-align:right;font-weight:600;">Total TTC</td><td style="text-align:right;font-weight:700;font-size:16px;color:#065f46;">${safeFormat(totalTTC, 2)}€</td></tr>
                  ${reservation.montantAcompte > 0 ? `
                  <tr><td colspan="3" style="text-align:right;font-size:13px;color:#4b5563;">Acompte versé</td><td style="text-align:right;font-size:13px;color:#065f46;font-weight:600;">-${safeFormat(reservation.montantAcompte, 2)}€</td></tr>
                  ` : ''}
                  ${reservation.montantRestantDu > 0 ? `
                  <tr><td colspan="3" style="text-align:right;font-size:13px;font-weight:600;color:#dc2626;">Restant dû</td><td style="text-align:right;font-size:13px;font-weight:700;color:#dc2626;">${safeFormat(reservation.montantRestantDu, 2)}€</td></tr>
                  ` : ''}
                </tfoot>
              </table>
              <div class="facture-total"><span class="label">Total à payer</span><span class="amount">${safeFormat(totalTTC, 2)}€</span></div>
              <div class="facture-footer">
                <div class="logo-small"><span class="icon">🌴</span><span>Les Palmiers - Gîte de charme</span></div>
                <div class="text"><p style="margin:0;">Facture générée automatiquement</p><p style="margin:2px 0 0 0;">Merci de votre confiance</p></div>
              </div>
            </div>
          </div>
          <script>
            window.onload = function() { setTimeout(function() { window.print(); }, 500); };
          <\/script>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.onafterprint = function() { printWindow.close(); };
      notifyAjout('success', 'PDF généré', 'Le PDF a été généré avec succès');
    } catch (error) {
      console.error('Erreur export PDF:', error);
      notifyAjout('error', 'Erreur', 'Erreur lors de la génération du PDF');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-emerald-700 to-emerald-800 text-white px-6 py-4 flex justify-between items-center rounded-t-2xl">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm">
              <FileText size={28} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Facture</h3>
              <p className="text-emerald-200 text-sm">N° {reservation.numeroReservation}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/80 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <div id="facture-content" className="p-6 space-y-6">
          <div className="flex justify-between items-start border-b border-gray-200 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Palmtree size={20} className="text-emerald-700" />
                <h2 className="text-xl font-bold text-emerald-800">Les Palmiers</h2>
              </div>
              <p className="text-sm text-gray-600">Gîte de charme - L'Entre-Deux</p>
              <p className="text-xs text-gray-500">12 Rue des Palmiers, 97440 L'Entre-Deux</p>
              <p className="text-xs text-gray-500">Tél: 0262 12 34 56</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">Facture</p>
              <p className="text-xs text-gray-500">Émise le {new Date().toLocaleDateString('fr-FR')}</p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <User size={12} className="text-gray-400" />
              Client
            </p>
            <p className="font-medium text-gray-900">{reservation.client?.prenom || reservation.client_prenom || ''} {reservation.client?.nom || reservation.client_nom || ''}</p>
            <p className="text-sm text-gray-600">{reservation.client?.email || reservation.client_email || ''}</p>
            <p className="text-sm text-gray-600">{reservation.client?.telephone || reservation.client_telephone || ''}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-emerald-50 rounded-xl p-4 border border-emerald-200">
            <div>
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                <CalendarIcon size={12} className="text-emerald-500" />
                Arrivée
              </p>
              <p className="font-medium text-gray-900">{formatDateFacture(reservation.dateArrivee)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                <CalendarIcon size={12} className="text-emerald-500" />
                Départ
              </p>
              <p className="font-medium text-gray-900">{formatDateFacture(reservation.dateDepart)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                <Building size={12} className="text-emerald-500" />
                Chambre
              </p>
              <p className="font-medium text-gray-900">{reservation.chambre?.nom || reservation.chambre_nom || ''}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                <Users size={12} className="text-emerald-500" />
                Personnes
              </p>
              <p className="font-medium text-gray-900">{reservation.nbAdultes} adultes{reservation.nbEnfants > 0 ? ` + ${reservation.nbEnfants} enfants` : ''}</p>
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Description</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Qté</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Prix</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-4 py-2 text-gray-800">Hébergement - {reservation.nbNuits} nuits</td>
                  <td className="px-4 py-2 text-right text-gray-600">{reservation.nbNuits}</td>
                  <td className="px-4 py-2 text-right text-gray-600">{safeFormat((reservation.montantTotal) / Math.max(1, reservation.nbNuits), 0)}€</td>
                  <td className="px-4 py-2 text-right font-medium text-gray-900">{safeFormat(reservation.montantTotal, 2)}€</td>
                </tr>
                {reservation.petitDejeunerInclus && (
                  <tr>
                    <td className="px-4 py-2 text-gray-800">Petit-déjeuner inclus</td>
                    <td className="px-4 py-2 text-right text-gray-600">-</td>
                    <td className="px-4 py-2 text-right text-gray-600">-</td>
                    <td className="px-4 py-2 text-right font-medium text-emerald-600">Inclus</td>
                  </tr>
                )}
                {(reservation.services || []).map((s: any) => (
                  <tr key={s.id}>
                    <td className="px-4 py-2 text-gray-800">{s.libelle || s.type || 'Service'}</td>
                    <td className="px-4 py-2 text-right text-gray-600">{s.quantite || 1}</td>
                    <td className="px-4 py-2 text-right text-gray-600">{safeFormat((s.montant || 0) / Math.max(1, s.quantite || 1), 0)}€</td>
                    <td className="px-4 py-2 text-right font-medium text-gray-900">{safeFormat(s.montant || 0, 2)}€</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-gray-300 bg-gray-50">
                <tr>
                  <td colspan="3" className="px-4 py-3 text-right font-bold text-gray-900">Total TTC</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-700 text-lg">{safeFormat(totalTTC, 2)}€</td>
                </tr>
                {reservation.montantAcompte > 0 && (
                  <tr>
                    <td colspan="3" className="px-4 py-2 text-right text-sm text-gray-600">Acompte versé</td>
                    <td className="px-4 py-2 text-right text-sm text-emerald-600 font-medium">-{safeFormat(reservation.montantAcompte, 2)}€</td>
                  </tr>
                )}
                {reservation.montantRestantDu > 0 && (
                  <tr>
                    <td colspan="3" className="px-4 py-2 text-right text-sm font-semibold text-rose-600">Restant dû</td>
                    <td className="px-4 py-2 text-right text-sm font-bold text-rose-600">{safeFormat(reservation.montantRestantDu, 2)}€</td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-gray-200">
            <div className="flex items-center gap-3">
              <Palmtree size={20} className="text-emerald-600/60" />
              <div className="text-xs text-gray-500">
                <p>Facture générée automatiquement</p>
                <p>Merci de votre confiance</p>
              </div>
            </div>
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all duration-200 hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <><Loader2 size={16} className="animate-spin" /> Génération...</>
              ) : (
                <><Download size={16} /> Exporter PDF</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// COMPOSANT — MODAL
// ============================================

const Modal = ({ isOpen, onClose, title, children, footer, size = 'lg' }: {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (isOpen) requestAnimationFrame(() => setVisible(true));
    else setVisible(false);
  }, [isOpen]);
  if (!isOpen) return null;
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-3xl', '2xl': 'max-w-4xl' };
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${visible ? 'bg-black/40 backdrop-blur-sm' : 'bg-black/0'}`}>
      <div className={`bg-white rounded-2xl shadow-2xl ${sizes[size]} w-full max-h-[90vh] flex flex-col transition-all duration-300 ${visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'}`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">{title}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/60 rounded-b-2xl shrink-0">{footer}</div>}
      </div>
    </div>
  );
};

// ============================================
// COMPOSANT — CONFIRM DIALOG
// ============================================

const ConfirmDialog = ({ isOpen, title, message, onConfirm, onCancel, variant = 'default', confirmLabel = 'Confirmer' }: {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'default' | 'danger' | 'warning' | 'success';
  confirmLabel?: string;
}) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (isOpen) requestAnimationFrame(() => setVisible(true));
    else setVisible(false);
  }, [isOpen]);
  if (!isOpen) return null;
  const btnClass = {
    default: 'bg-emerald-600 hover:bg-emerald-700',
    danger: 'bg-rose-600 hover:bg-rose-700',
    warning: 'bg-amber-500 hover:bg-amber-600',
    success: 'bg-emerald-600 hover:bg-emerald-700',
  };
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${visible ? 'bg-black/40 backdrop-blur-sm' : 'bg-black/0'}`}>
      <div className={`bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 transition-all duration-300 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
        <h3 className="font-semibold text-gray-900 text-center">{title}</h3>
        <p className="text-sm text-gray-600 text-center mt-2">{message}</p>
        <div className="flex gap-3 justify-center mt-6">
          <button onClick={onCancel} className="px-5 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">Annuler</button>
          <button onClick={onConfirm} className={`px-5 py-2 text-sm font-medium text-white rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 ${btnClass[variant]}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// COMPOSANT — CONFIRMATION PAIEMENT
// ============================================

const PaymentConfirmation = ({
  isOpen,
  onClose,
  montant,
  client,
  modePaiement,
  reference,
  onPrint,
}: {
  isOpen: boolean;
  onClose: () => void;
  montant: number;
  client: { prenom: string; nom: string };
  modePaiement: ModePaiement;
  reference?: string;
  onPrint?: () => void;
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const modeLabels: Record<ModePaiement, { label: string; icon: React.ReactNode; color: string }> = {
    ESPECES: { label: 'Espèces', icon: <Banknote size={20} />, color: 'text-emerald-600' },
    CARTE: { label: 'Carte bancaire', icon: <CreditCard size={20} />, color: 'text-blue-600' },
    VIREMENT: { label: 'Virement', icon: <Landmark size={20} />, color: 'text-purple-600' },
    CHEQUE: { label: 'Chèque', icon: <ReceiptText size={20} />, color: 'text-amber-600' },
  };
  const mode = modeLabels[modePaiement];

  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`fixed inset-0 z-[60] flex items-center justify-center p-4 transition-all duration-500 ${visible ? 'bg-black/60 backdrop-blur-md' : 'bg-black/0 pointer-events-none'}`}>
      <div className={`bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden transition-all duration-500 ${visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-8'}`}>
        <div className="relative bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-8 text-center">
          <div className="relative z-10">
            <div className="w-20 h-20 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle size={40} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Paiement validé</h2>
            <p className="text-emerald-100 mt-1">Transaction effectuée avec succès</p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="text-center">
            <p className="text-sm text-gray-500">Montant</p>
            <p className="text-3xl font-bold text-gray-900">{formatEuro(montant)}</p>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Client</span>
              <span className="font-medium text-gray-800">{client.prenom} {client.nom}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Mode de paiement</span>
              <span className="font-medium text-gray-800 flex items-center gap-1.5">
                {mode.icon} {mode.label}
              </span>
            </div>
            {reference && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Référence</span>
                <span className="font-mono text-sm font-medium text-gray-800">{reference}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Date & heure</span>
              <span className="font-medium text-gray-800">{dateStr} à {timeStr}</span>
            </div>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-400 font-mono">
              Transaction #TX-{String(Date.now()).slice(-8)}
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onPrint}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <Printer size={16} /> Imprimer
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <CheckCircle size={16} /> Terminer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// COMPOSANT — SPINNER
// ============================================

const Spinner = () => (
  <div className="flex flex-col items-center justify-center py-20 gap-3">
    <div className="w-10 h-10 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
    <p className="text-sm text-gray-500 animate-pulse">Chargement des paiements…</p>
  </div>
);

// ============================================
// COMPOSANT — EMPTY STATE
// ============================================

const EmptyState = ({ icon, title, description, action }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) => (
  <div className="flex flex-col items-center justify-center py-16 gap-4">
    <div className="p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl text-gray-300">{icon}</div>
    <div className="text-center">
      <p className="font-semibold text-gray-800 text-lg">{title}</p>
      <p className="text-sm text-gray-500 mt-1 max-w-sm">{description}</p>
    </div>
    {action}
  </div>
);

// ============================================
// COMPOSANT — PAGINATION
// ============================================

const Pagination = ({ currentPage, totalPages, onPageChange }: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) => {
  const pages: number[] = [];
  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else if (currentPage <= 3) {
    for (let i = 1; i <= 5; i++) pages.push(i);
  } else if (currentPage >= totalPages - 2) {
    for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
  } else {
    for (let i = currentPage - 2; i <= currentPage + 2; i++) pages.push(i);
  }
  return (
    <div className="flex items-center justify-center gap-1 mt-4">
      <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}
        className="p-2 rounded-xl border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 text-gray-700 transition-all duration-200 hover:scale-105">
        <ChevronLeft size={16} />
      </button>
      {pages.map(p => (
        <button key={p} onClick={() => onPageChange(p)}
          className={`min-w-[38px] h-[38px] text-sm font-medium rounded-xl border transition-all duration-200 ${
            p === currentPage ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-200 scale-105' : 'border-gray-200 hover:bg-gray-50 text-gray-700 hover:scale-105'
          }`}>
          {p}
        </button>
      ))}
      <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}
        className="p-2 rounded-xl border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 text-gray-700 transition-all duration-200 hover:scale-105">
        <ChevronRight size={16} />
      </button>
    </div>
  );
};

// ============================================
// COMPOSANT — STATUT BADGE
// ============================================

const StatutBadge = ({ statut, size = 'sm' }: { statut: StatutPaiement; size?: 'sm' | 'md' }) => {
  const config: Record<StatutPaiement, { label: string; className: string; dot: string; icon: React.ReactNode; pulse: boolean }> = {
    COMPLET: {
      label: 'Complet',
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dot: 'bg-emerald-500',
      icon: <CheckCircle size={size === 'sm' ? 12 : 16} className="text-emerald-500" />,
      pulse: false,
    },
    PARTIEL: {
      label: 'Partiel',
      className: 'bg-amber-50 text-amber-700 border-amber-200',
      dot: 'bg-amber-500',
      icon: <Hourglass size={size === 'sm' ? 12 : 16} className="text-amber-500" />,
      pulse: false,
    },
    EN_ATTENTE: {
      label: 'En attente',
      className: 'bg-sky-50 text-sky-700 border-sky-200',
      dot: 'bg-sky-500',
      icon: <Clock size={size === 'sm' ? 12 : 16} className="text-sky-500" />,
      pulse: true,
    },
    IMPREVU: {
      label: 'Imprévu',
      className: 'bg-rose-50 text-rose-700 border-rose-200',
      dot: 'bg-rose-500',
      icon: <AlertTriangle size={size === 'sm' ? 12 : 16} className="text-rose-500" />,
      pulse: false,
    },
  };
  const c = config[statut] || config.EN_ATTENTE;
  const sizes = { sm: 'px-2.5 py-1 text-xs', md: 'px-3.5 py-1.5 text-sm' };
  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${sizes[size]} ${c.className}`}>
      {c.icon}
      {c.label}
      {c.pulse && <span className={`w-1.5 h-1.5 rounded-full ${c.dot} animate-pulse-dot`} />}
    </span>
  );
};

// ============================================
// COMPOSANT — MODE PAIEMENT ICON
// ============================================

const ModePaiementIcon = ({ mode }: { mode: ModePaiement }) => {
  const icons: Record<ModePaiement, { icon: React.ReactNode; label: string; color: string }> = {
    ESPECES: { icon: <Banknote size={14} />, label: 'Espèces', color: 'text-emerald-600 bg-emerald-50' },
    CARTE: { icon: <CreditCard size={14} />, label: 'Carte', color: 'text-blue-600 bg-blue-50' },
    VIREMENT: { icon: <Landmark size={14} />, label: 'Virement', color: 'text-purple-600 bg-purple-50' },
    CHEQUE: { icon: <ReceiptText size={14} />, label: 'Chèque', color: 'text-amber-600 bg-amber-50' },
  };
  const c = icons[mode] || icons.CARTE;
  return <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${c.color}`}>{c.icon} {c.label}</span>;
};

// ============================================
// COMPOSANT — RING DE RECOUVREMENT
// ============================================

const RecouvrementRing = ({ taux }: { taux: number }) => {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setProgress(taux), 300);
    return () => clearTimeout(t);
  }, [taux]);
  const offset = circumference - (progress / 100) * circumference;
  const color = taux >= 80 ? '#10b981' : taux >= 50 ? '#f59e0b' : '#f43f5e';

  return (
    <div className="relative w-14 h-14 shrink-0">
      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 52 52">
        <circle cx="26" cy="26" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="4" />
        <circle
          cx="26" cy="26" r={radius} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700">
        {taux}%
      </span>
    </div>
  );
};

// ============================================
// COMPOSANT — STAT CARD
// ============================================

function useCountUp(target: number, duration = 900, active = true) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active || target === 0) { setValue(target); return; }
    setValue(0);
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, active]);
  return value;
}

const StatCard = ({
  label,
  numericValue,
  displayValue,
  icon,
  color = 'emerald',
  subtitle,
  trend,
  trendValue,
  delay = 0,
  animate = true,
}: {
  label: string;
  numericValue: number;
  displayValue?: string;
  icon: React.ReactNode;
  color?: 'emerald' | 'amber' | 'rose' | 'sky' | 'purple' | 'slate';
  subtitle?: string;
  trend?: 'up' | 'down';
  trendValue?: string;
  delay?: number;
  animate?: boolean;
}) => {
  const counted = useCountUp(numericValue, 900, animate);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const palette = {
    emerald: { card: 'border-emerald-100/60 bg-white/80 backdrop-blur-sm hover:border-emerald-300 hover:bg-white', icon: 'bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-600' },
    amber:   { card: 'border-amber-100/60 bg-white/80 backdrop-blur-sm hover:border-amber-300 hover:bg-white', icon: 'bg-gradient-to-br from-amber-50 to-amber-100 text-amber-600' },
    rose:    { card: 'border-rose-100/60 bg-white/80 backdrop-blur-sm hover:border-rose-300 hover:bg-white', icon: 'bg-gradient-to-br from-rose-50 to-rose-100 text-rose-600' },
    sky:     { card: 'border-sky-100/60 bg-white/80 backdrop-blur-sm hover:border-sky-300 hover:bg-white', icon: 'bg-gradient-to-br from-sky-50 to-sky-100 text-sky-600' },
    purple:  { card: 'border-purple-100/60 bg-white/80 backdrop-blur-sm hover:border-purple-300 hover:bg-white', icon: 'bg-gradient-to-br from-purple-50 to-purple-100 text-purple-600' },
    slate:   { card: 'border-slate-100/60 bg-white/80 backdrop-blur-sm hover:border-slate-300 hover:bg-white', icon: 'bg-gradient-to-br from-slate-50 to-slate-100 text-slate-600' },
  };
  const p = palette[color] || palette.emerald;

  return (
    <div
      className={`rounded-xl border p-5 transition-all duration-500 hover:shadow-lg hover:-translate-y-1 ${p.card} ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest truncate">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1.5 tracking-tight tabular-nums">
            {displayValue ? displayValue.replace(/\d+/, String(counted)) : counted.toLocaleString('fr-FR')}
          </p>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          {trend && trendValue && (
            <p className={`flex items-center gap-1 text-xs font-medium mt-1.5 ${trend === 'up' ? 'text-emerald-600' : 'text-rose-500'}`}>
              {trend === 'up' ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {trendValue}
            </p>
          )}
        </div>
        <div className={`p-2.5 rounded-xl shrink-0 transition-transform duration-300 hover:scale-110 hover:rotate-3 ${p.icon}`}>{icon}</div>
      </div>
    </div>
  );
};

// ============================================
// COMPOSANT — ALERTE BANNER
// ============================================

const AlerteBanner = ({ alertes }: { alertes: AlertePaiement[] }) => {
  const nonLues = alertes.filter(a => !a.lue);
  if (nonLues.length === 0) return null;

  const critical = nonLues.filter(a => a.niveau === 'CRITICAL');
  const warnings = nonLues.filter(a => a.niveau === 'WARNING');

  return (
    <div className="space-y-2">
      {critical.map(a => (
        <div key={a.id} className="flex items-center gap-3 px-4 py-3 bg-rose-50 border-l-4 border-rose-500 rounded-xl shadow-sm animate-slide-in">
          <AlertCircle size={18} className="text-rose-500 shrink-0" />
          <p className="text-sm text-rose-800 flex-1">{a.message}</p>
          <span className="text-xs text-rose-500 font-medium px-2 py-0.5 bg-rose-100 rounded-full">CRITIQUE</span>
        </div>
      ))}
      {warnings.map(a => (
        <div key={a.id} className="flex items-center gap-3 px-4 py-3 bg-amber-50 border-l-4 border-amber-500 rounded-xl shadow-sm animate-slide-in" style={{ animationDelay: '100ms' }}>
          <AlertTriangle size={18} className="text-amber-500 shrink-0" />
          <p className="text-sm text-amber-800 flex-1">{a.message}</p>
          <span className="text-xs text-amber-500 font-medium px-2 py-0.5 bg-amber-100 rounded-full">ATTENTION</span>
        </div>
      ))}
    </div>
  );
};

// ============================================
// COMPOSANT — CHAMPS SPÉCIFIQUES SELON MODE DE PAIEMENT
// ============================================

const ModePaiementFields = ({
  mode,
  form,
  onChange,
}: {
  mode: ModePaiement;
  form: any;
  onChange: (field: string, value: any) => void;
}) => {
  switch (mode) {
    case 'CHEQUE':
      return (
        <div className="col-span-2 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Numéro de chèque <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={form.numeroCheque || ''}
              onChange={e => onChange('numeroCheque', e.target.value)}
              placeholder="Ex: 12345678"
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-400 outline-none placeholder-gray-400 font-mono"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Banque émettrice <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={form.banqueEmettrice || ''}
              onChange={e => onChange('banqueEmettrice', e.target.value)}
              placeholder="Ex: Crédit Agricole"
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-400 outline-none placeholder-gray-400"
              required
            />
          </div>
        </div>
      );

    case 'CARTE':
      return (
        <div className="col-span-2 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Type de carte <span className="text-rose-500">*</span>
            </label>
            <select
              value={form.typeCarte || 'CB'}
              onChange={e => onChange('typeCarte', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-700 focus:ring-2 focus:ring-emerald-400 outline-none bg-white"
              required
            >
              <option value="CB">Carte Bancaire (CB)</option>
              <option value="VISA">Visa</option>
              <option value="MASTERCARD">Mastercard</option>
              <option value="AMEX">American Express</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Numéro de carte (masqué)
            </label>
            <div className="relative">
              <input
                type="text"
                value={form.numeroCarteMasque || ''}
                onChange={e => onChange('numeroCarteMasque', e.target.value)}
                placeholder="**** **** **** 1234"
                maxLength={19}
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-400 outline-none placeholder-gray-400 font-mono"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Lock size={14} />
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Seuls les 4 derniers chiffres sont stockés</p>
          </div>
        </div>
      );

    case 'VIREMENT':
      return (
        <div className="col-span-2 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Référence virement <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={form.referenceVirement || ''}
              onChange={e => onChange('referenceVirement', e.target.value)}
              placeholder="Ex: VIR-2024-001"
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-400 outline-none placeholder-gray-400 font-mono"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Banque émettrice
            </label>
            <input
              type="text"
              value={form.banqueEmettrice || ''}
              onChange={e => onChange('banqueEmettrice', e.target.value)}
              placeholder="Ex: BNP Paribas"
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-400 outline-none placeholder-gray-400"
            />
          </div>
        </div>
      );

    case 'ESPECES':
      return (
        <div className="col-span-2">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-700 text-sm flex items-center gap-3">
            <Banknote size={20} className="text-emerald-500" />
            <div>
              <p className="font-medium">Paiement en espèces</p>
              <p className="text-emerald-600/80 text-xs">Aucune référence requise</p>
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
};

// ============================================
// COMPOSANT — LIGNE DU TABLEAU
// ============================================

const PaiementRow = ({
  r,
  onOpenPaiement,
  onRelance,
  onViewDetails,
  onPrintFacture,
  index,
  visible,
}: {
  r: Reservation;
  onOpenPaiement: (r: Reservation) => void;
  onRelance: (id: number) => void;
  onViewDetails: (r: Reservation) => void;
  onPrintFacture: (r: Reservation) => void;
  index: number;
  visible: boolean;
}) => {
  const solde = r.montantRestantDu;
  const hasDebt = solde > 0;

  const [isHovered, setIsHovered] = useState(false);

  return (
    <tr
      className={`group relative transition-all duration-500 ease-out ${
        index % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'
      } hover:bg-gradient-to-r hover:from-emerald-50/50 hover:to-transparent ${
        visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-3'
      }`}
      style={{ transitionDelay: visible ? `${index * 40}ms` : '0ms' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <td className="relative w-0 p-0">
        <span className={`absolute left-0 top-0 w-[3px] h-full bg-emerald-500 rounded-r-full transition-transform duration-300 origin-center ${
          isHovered ? 'scale-y-100' : 'scale-y-0'
        }`} />
      </td>

      <td className="px-5 py-3.5">
        <span className="font-mono text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
          {r.numeroReservation}
        </span>
      </td>

      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-semibold text-xs shrink-0 transition-transform duration-300 group-hover:scale-110">
            {r.client.prenom[0]}{r.client.nom[0]}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-900 text-sm truncate">
              {r.client.prenom} {r.client.nom}
              {r.nbEnfants > 0 && (
                <span className="ml-1.5 text-xs text-gray-400">+{r.nbEnfants} enf.</span>
              )}
            </p>
            <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
              <Mail size={10} className="text-gray-400 shrink-0" />
              {r.client.email}
            </p>
          </div>
        </div>
      </td>

      <td className="px-5 py-3.5">
        <p className="text-sm font-medium text-gray-800">{r.chambre.nom}</p>
        <p className="text-xs text-gray-500">N° {r.chambre.numero}</p>
      </td>

      <td className="px-5 py-3.5">
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <Calendar size={12} className="text-gray-400 shrink-0" />
          <span>{formatDate(r.dateArrivee)}</span>
          <span className="text-gray-300">→</span>
          <span>{formatDate(r.dateDepart)}</span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5 ml-5">{r.nbNuits} nuit{r.nbNuits > 1 ? 's' : ''}</p>
      </td>

      <td className="px-5 py-3.5 text-right">
        <p className="text-sm font-semibold text-gray-900">{formatEuro(r.montantTotal)}</p>
      </td>

      <td className="px-5 py-3.5 text-right">
        <p className="text-sm font-semibold text-emerald-600">{formatEuro(r.montantAcompte)}</p>
      </td>

      <td className="px-5 py-3.5 text-right">
        {hasDebt ? (
          <p className="text-sm font-bold text-rose-600">
            {formatEuro(solde)}
          </p>
        ) : (
          <CheckCircle size={18} className="text-emerald-500 ml-auto transition-transform duration-300 group-hover:scale-110" />
        )}
      </td>

      <td className="px-5 py-3.5">
        <StatutBadge statut={r.statutPaiement} size="sm" />
        {r.paiements && r.paiements.length > 0 && (
          <p className="text-xs text-gray-500 mt-1">{r.paiements.length} paiement{r.paiements.length > 1 ? 's' : ''}</p>
        )}
      </td>

      <td className="px-5 py-3.5">
        <div className="flex items-center gap-0.5 justify-end">
          {(r.statutPaiement === 'EN_ATTENTE' || r.statutPaiement === 'PARTIEL') && (
            <button
              onClick={() => onOpenPaiement(r)}
              className={`p-2 rounded-lg transition-all duration-300 text-emerald-600 hover:bg-emerald-50 ${
                isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2'
              }`}
              title="Enregistrer un paiement"
            >
              <Plus size={15} />
            </button>
          )}
          {(r.statutPaiement === 'EN_ATTENTE' || r.statutPaiement === 'PARTIEL') && (
            <button
              onClick={() => onRelance(r.id)}
              className={`p-2 rounded-lg transition-all duration-300 text-amber-500 hover:bg-amber-50 ${
                isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2'
              }`}
              style={{ transitionDelay: '30ms' }}
              title="Envoyer une relance"
            >
              <Send size={14} />
            </button>
          )}
          <button
            onClick={() => onViewDetails(r)}
            className={`p-2 rounded-lg transition-all duration-300 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 ${
              isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2'
            }`}
            style={{ transitionDelay: '60ms' }}
            title="Voir l'historique"
          >
            <Eye size={14} />
          </button>
          <button
            onClick={() => onPrintFacture(r)}
            className={`p-2 rounded-lg transition-all duration-300 text-sky-500 hover:text-sky-700 hover:bg-sky-50 ${
              isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2'
            }`}
            style={{ transitionDelay: '90ms' }}
            title="Voir la facture"
          >
            <FileText size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
};

// ============================================
// PAGE PRINCIPALE
// ============================================

export default function PaiementsPage() {
  // États
  const [loading, setLoading] = useState(true);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filteredReservations, setFilteredReservations] = useState<Reservation[]>([]);
  const [search, setSearch] = useState('');
  const [statutFilter, setStatutFilter] = useState<StatutPaiement | ''>('');
  const [page, setPage] = useState(1);
  const [mounted, setMounted] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [rowsVisible, setRowsVisible] = useState(false);
  const [alertes, setAlertes] = useState<AlertePaiement[]>([]);
  const PER_PAGE = 10;

  const { refreshChambres } = useWebSocketContext();

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [selectedResa, setSelectedResa] = useState<Reservation | null>(null);
  const [selectedForDetails, setSelectedForDetails] = useState<Reservation | null>(null);
  const [selectedForFacture, setSelectedForFacture] = useState<Reservation | null>(null);
  const [showFacture, setShowFacture] = useState(false);
  const [confirmRelance, setConfirmRelance] = useState<number | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationData, setConfirmationData] = useState<{
    montant: number;
    client: { prenom: string; nom: string };
    modePaiement: ModePaiement;
    reference?: string;
  } | null>(null);

  // Formulaire paiement
  const [paiementForm, setPaiementForm] = useState({
    montant: '',
    modePaiement: 'CARTE' as ModePaiement,
    typePaiement: 'SOLDE' as TypeVersement,
    datePaiement: new Date().toISOString().slice(0, 10),
    reference: '',
    notes: '',
    numeroCheque: '',
    banqueEmettrice: '',
    typeCarte: 'CB' as TypeCarte,
    numeroCarteMasque: '',
    referenceVirement: '',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Statistiques
  const [stats, setStats] = useState<StatsData>({
    total: 0,
    complet: 0,
    partiel: 0,
    enAttente: 0,
    imprevu: 0,
    montantTotal: 0,
    montantPaye: 0,
    montantRestant: 0,
    tauxRecouvrement: 0,
  });

  const modePaiementLabel: Record<ModePaiement, string> = {
    ESPECES: 'Espèces',
    CARTE: 'Carte bancaire',
    VIREMENT: 'Virement',
    CHEQUE: 'Chèque',
  };

  const typeVersementLabel: Record<TypeVersement, string> = {
    ACOMPTE: 'Acompte',
    SOLDE: 'Solde',
    ARRHES: 'Arrhes',
  };

  // ============================================
  // MAPPERS
  // ============================================

  const mapReservation = (data: any): Reservation => {
    const arrivee = new Date(data.dateArrivee);
    const depart = new Date(data.dateDepart);
    const nbNuits = Math.ceil((depart.getTime() - arrivee.getTime()) / (1000 * 60 * 60 * 24));

    return {
      id: data.id,
      numeroReservation: data.numero || data.numeroReservation || `RES-${String(data.id).padStart(4, '0')}`,
      dateArrivee: data.dateArrivee,
      dateDepart: data.dateDepart,
      nbAdultes: data.nbAdultes || 2,
      nbEnfants: data.nbEnfants || 0,
      nbNuits: nbNuits || 1,
      statut: data.statut || 'CONFIRMEE',
      montantTotal: data.montantTotal || 0,
      montantAcompte: data.montantAcompte || 0,
      montantSolde: data.montantSolde || 0,
      montantRestantDu: data.montantRestantDu || 0,
      statutPaiement: data.statutPaiement || 'EN_ATTENTE',
      client: data.client || { id: 0, prenom: data.client_prenom || '', nom: data.client_nom || '', email: data.client_email || '', telephone: data.client_telephone || '', adresse: '' },
      chambre: data.chambre || { id: 0, nom: data.chambre_nom || '', numero: data.chambre_numero || '' },
      paiements: data.paiements || [],
      dateCreation: data.createdAt || data.dateCreation || new Date().toISOString(),
      client_prenom: data.client_prenom || data.client?.prenom || '',
      client_nom: data.client_nom || data.client?.nom || '',
      client_email: data.client_email || data.client?.email || '',
      client_telephone: data.client_telephone || data.client?.telephone || '',
      chambre_nom: data.chambre_nom || data.chambre?.nom || '',
      chambre_numero: data.chambre_numero || data.chambre?.numero || '',
      petitDejeunerInclus: data.petitDejeunerInclus || false,
      services: data.services || [],
    };
  };

  // ============================================
  // GÉNÉRATION DES ALERTES
  // ============================================

  const generateAlertes = useCallback((reservationsList: Reservation[]): AlertePaiement[] => {
    const alertesList: AlertePaiement[] = [];
    const now = new Date();

    reservationsList.forEach(r => {
      const arrivee = new Date(r.dateArrivee);
      const daysToArrival = Math.ceil((arrivee.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const hoursSinceCreation = (now.getTime() - new Date(r.dateCreation).getTime()) / (1000 * 60 * 60);

      if (r.statut === 'EN_ATTENTE_ACOMPTE' && daysToArrival <= 2 && daysToArrival >= 0) {
        alertesList.push({
          id: alertesList.length + 1,
          type: 'ACOMPTE_NON_RECU',
          message: `Acompte non reçu pour ${r.client.prenom} ${r.client.nom} - arrivée dans ${daysToArrival} jour${daysToArrival > 1 ? 's' : ''}`,
          niveau: 'CRITICAL',
          lue: false,
          dateHeure: new Date().toISOString(),
        });
      }

      if (r.statut === 'EN_ATTENTE_ACOMPTE' && hoursSinceCreation > 24) {
        alertesList.push({
          id: alertesList.length + 1,
          type: 'ATTENTE_LONGUE',
          message: `Réservation ${r.numeroReservation} en attente depuis plus de 24h (${r.client.prenom} ${r.client.nom})`,
          niveau: 'WARNING',
          lue: false,
          dateHeure: new Date().toISOString(),
        });
      }

      if (r.montantRestantDu > 0 && (r.statut === 'CONFIRMEE' || r.statut === 'EN_ATTENTE_ACOMPTE')) {
        alertesList.push({
          id: alertesList.length + 1,
          type: 'IMPAYE',
          message: `Paiement restant dû pour ${r.client.prenom} ${r.client.nom} : ${formatEuro(r.montantRestantDu)}`,
          niveau: r.montantRestantDu > r.montantTotal * 0.5 ? 'CRITICAL' : 'WARNING',
          lue: false,
          dateHeure: new Date().toISOString(),
        });
      }
    });

    return alertesList;
  }, []);

  // ============================================
  // CHARGEMENT DES DONNÉES
  // ============================================

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reservationService.getAll({ include: ['client', 'chambre', 'paiements'] });

      let reservationsData: Reservation[] = [];
      if (res?.success && res.data) {
        reservationsData = (Array.isArray(res.data) ? res.data : [res.data]).map(mapReservation);
      }

      setReservations(reservationsData);
      const alertesList = generateAlertes(reservationsData);
      setAlertes(alertesList);

      const total = reservationsData.length;
      const complet = reservationsData.filter(r => r.statutPaiement === 'COMPLET').length;
      const partiel = reservationsData.filter(r => r.statutPaiement === 'PARTIEL').length;
      const enAttente = reservationsData.filter(r => r.statutPaiement === 'EN_ATTENTE').length;
      const imprevu = reservationsData.filter(r => r.statutPaiement === 'IMPREVU').length;
      const montantTotal = reservationsData.reduce((s, r) => s + r.montantTotal, 0);
      const montantPaye = reservationsData.reduce((s, r) => s + r.montantAcompte, 0);
      const montantRestant = reservationsData.reduce((s, r) => s + r.montantRestantDu, 0);
      const tauxRecouvrement = montantTotal > 0 ? Math.round((montantPaye / montantTotal) * 100) : 0;

      setStats({
        total,
        complet,
        partiel,
        enAttente,
        imprevu,
        montantTotal,
        montantPaye,
        montantRestant,
        tauxRecouvrement,
      });
    } catch (error) {
      console.error('Erreur loadData:', error);
      notifyAjout('error', 'Erreur', 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
      setTimeout(() => setMounted(true), 80);
      setTimeout(() => setRowsVisible(true), 200);
    }
  }, [generateAlertes]);

  // ============================================
  // FILTRAGE
  // ============================================

  useEffect(() => {
    const q = search.toLowerCase().trim();
    let filtered = reservations;

    if (q) {
      filtered = filtered.filter(r =>
        r.client.nom.toLowerCase().includes(q) ||
        r.client.prenom.toLowerCase().includes(q) ||
        r.chambre.nom.toLowerCase().includes(q) ||
        r.numeroReservation.toLowerCase().includes(q) ||
        r.client.email.toLowerCase().includes(q)
      );
    }

    if (statutFilter) {
      filtered = filtered.filter(r => r.statutPaiement === statutFilter);
    }

    setFilteredReservations(filtered);
    setPage(1);
    setRowsVisible(false);
    const t = setTimeout(() => setRowsVisible(true), 50);
    return () => clearTimeout(t);
  }, [reservations, search, statutFilter]);

  // ============================================
  // ACTIONS MÉTIER
  // ============================================

  const openPaiement = (resa: Reservation) => {
    setSelectedResa(resa);
    setPaiementForm({
      montant: resa.montantRestantDu > 0 ? resa.montantRestantDu.toFixed(2) : '',
      modePaiement: 'CARTE',
      typePaiement: 'SOLDE',
      datePaiement: new Date().toISOString().slice(0, 10),
      reference: '',
      notes: '',
      numeroCheque: '',
      banqueEmettrice: '',
      typeCarte: 'CB',
      numeroCarteMasque: '',
      referenceVirement: '',
    });
    setFormError('');
    setShowModal(true);
  };

  const openFacture = (resa: Reservation) => {
    setSelectedForFacture(resa);
    setShowFacture(true);
  };

  const closeFacture = () => {
    setShowFacture(false);
    setSelectedForFacture(null);
  };

  const handleSavePaiement = async () => {
    if (!selectedResa) return;
    const montant = Number(paiementForm.montant);
    if (!montant || montant <= 0) {
      setFormError('Le montant doit être supérieur à 0');
      return;
    }

    if (paiementForm.modePaiement === 'CHEQUE') {
      if (!paiementForm.numeroCheque) {
        setFormError('Veuillez saisir le numéro de chèque');
        return;
      }
      if (!paiementForm.banqueEmettrice) {
        setFormError('Veuillez saisir la banque émettrice');
        return;
      }
    }

    if (paiementForm.modePaiement === 'VIREMENT') {
      if (!paiementForm.referenceVirement) {
        setFormError('Veuillez saisir la référence du virement');
        return;
      }
    }

    if (paiementForm.modePaiement === 'CARTE') {
      if (!paiementForm.typeCarte) {
        setFormError('Veuillez sélectionner le type de carte');
        return;
      }
    }

    setConfirmationData({
      montant,
      client: { prenom: selectedResa.client.prenom, nom: selectedResa.client.nom },
      modePaiement: paiementForm.modePaiement,
      reference: paiementForm.modePaiement === 'CHEQUE' ? paiementForm.numeroCheque :
                 paiementForm.modePaiement === 'VIREMENT' ? paiementForm.referenceVirement :
                 paiementForm.reference || undefined,
    });
    setShowConfirmation(true);
  };

  const confirmPaiement = async () => {
    if (!selectedResa || !confirmationData) return;

    setSaving(true);
    setFormError('');

    try {
      const payload: any = {
        reservationId: selectedResa.id,
        montant: confirmationData.montant,
        modePaiement: paiementForm.modePaiement,
        typePaiement: paiementForm.typePaiement,
        datePaiement: paiementForm.datePaiement,
        reference: paiementForm.reference || undefined,
        notes: paiementForm.notes || undefined,
      };

      if (paiementForm.modePaiement === 'CHEQUE') {
        payload.numeroCheque = paiementForm.numeroCheque;
        payload.banqueEmettrice = paiementForm.banqueEmettrice;
      }
      if (paiementForm.modePaiement === 'CARTE') {
        payload.typeCarte = paiementForm.typeCarte;
        payload.numeroCarteMasque = paiementForm.numeroCarteMasque || '****';
      }
      if (paiementForm.modePaiement === 'VIREMENT') {
        payload.referenceVirement = paiementForm.referenceVirement;
        payload.banqueEmettrice = paiementForm.banqueEmettrice || '';
      }

      const response = await paiementService.create(payload);

      if (response?.success) {
        notifyAjout('success', 'Paiement enregistré', 'Le paiement a été enregistré avec succès');

        if (response.data?.reservation?.statut === 'CONFIRMEE') {
          notifyAjout('success', 'Réservation confirmée', 'Paiement complet reçu');
        }

        refreshChambres();
        try { localStorage.removeItem('chambres_cache'); } catch (e) { /* ignore */ }

        await loadData();

        setShowConfirmation(false);
        setShowModal(false);
        setSelectedResa(null);
        setConfirmationData(null);
      } else {
        setFormError(response?.message || 'Erreur lors de l\'enregistrement');
        setShowConfirmation(false);
      }
    } catch (error: any) {
      setFormError(error.response?.data?.message || 'Erreur lors de l\'enregistrement du paiement');
      setShowConfirmation(false);
    } finally {
      setSaving(false);
    }
  };

  const handlePrintConfirmation = () => {
    window.print();
  };

  const sendRelance = async (resaId: number) => {
    try {
      const response = await paiementService.envoyerRelance(resaId);
      if (response?.success) {
        notifyAjout('success', 'Relance envoyée', 'La relance a été envoyée avec succès');
        await loadData();
      } else {
        notifyAjout('error', 'Erreur', response?.message || 'Erreur lors de l\'envoi de la relance');
      }
    } catch (error: any) {
      notifyAjout('error', 'Erreur', error.response?.data?.message || 'Erreur lors de l\'envoi de la relance');
    } finally {
      setConfirmRelance(null);
    }
  };

  const generateFacture = async (resa: Reservation) => {
    try {
      const response = await paiementService.generateFacture(resa.id);
      if (response?.success) {
        notifyAjout('success', 'Facture générée', `Facture générée pour ${resa.client.prenom} ${resa.client.nom}`);
        await loadData();
      } else {
        notifyAjout('error', 'Erreur', response?.message || 'Erreur lors de la génération de la facture');
      }
    } catch (error: any) {
      if (error.response?.data?.message?.includes('existe déjà')) {
        notifyAjout('info', 'Information', 'Une facture existe déjà pour cette réservation');
      } else {
        notifyAjout('error', 'Erreur', error.response?.data?.message || 'Erreur lors de la génération de la facture');
      }
    }
  };

  const envoyerRelancesGroupes = async () => {
    const aRelancer = filteredReservations.filter(r =>
      r.statutPaiement === 'EN_ATTENTE' || r.statutPaiement === 'PARTIEL'
    );
    if (aRelancer.length === 0) {
      notifyAjout('info', 'Information', 'Aucune réservation à relancer');
      return;
    }
    try {
      const response = await paiementService.alerterImpayes();
      if (response?.success) {
        notifyAjout('success', 'Relances envoyées', `${aRelancer.length} relance(s) envoyée(s)`);
        await loadData();
      }
    } catch (error: any) {
      notifyAjout('error', 'Erreur', error.response?.data?.message || 'Erreur lors de l\'envoi des relances');
    }
  };

  // ============================================
  // PAGINATION
  // ============================================

  const paginatedReservations = filteredReservations.slice(
    (page - 1) * PER_PAGE,
    page * PER_PAGE
  );
  const totalPages = Math.ceil(filteredReservations.length / PER_PAGE);

  // ============================================
  // EFFETS
  // ============================================

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ============================================
  // RENDU
  // ============================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50/20 to-sky-50/30 p-4 lg:p-6 space-y-5 relative">

      {/* Décoration de fond */}
      <div className="fixed top-0 right-0 w-96 h-96 bg-emerald-200/20 rounded-full blur-3xl -z-10 animate-float-slow pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-72 h-72 bg-sky-200/15 rounded-full blur-3xl -z-10 animate-float-slow pointer-events-none" style={{ animationDelay: '2s' }} />

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-12px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulseDot {
          0%,100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(0.6); }
        }
        @keyframes floatSlow {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-20px, 20px) scale(1.05); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-in { animation: slideIn 0.4s ease-out forwards; }
        .animate-pulse-dot { animation: pulseDot 1.8s ease-in-out infinite; }
        .animate-float-slow { animation: floatSlow 12s ease-in-out infinite; }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>

      {/* En-tête */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all duration-500 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-xl transition-transform duration-300 hover:scale-110 hover:rotate-3">
            <BadgeDollarSign size={22} className="text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              Paiements
              <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {stats.total} réservation{stats.total > 1 ? 's' : ''}
              </span>
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <RecouvrementRing taux={stats.tauxRecouvrement} />
              <p className="text-sm text-gray-500 flex items-center gap-2 flex-wrap">
                <span className="text-emerald-600 font-medium">{stats.complet} soldées</span>
                {stats.partiel > 0 && <span className="text-amber-500 font-medium">· {stats.partiel} partielles</span>}
                {stats.enAttente > 0 && <span className="text-sky-500 font-medium">· {stats.enAttente} en attente</span>}
                <span className="text-gray-300">|</span>
                <span className="text-gray-400">Taux de recouvrement</span>
                <span className={`font-semibold ${stats.tauxRecouvrement >= 80 ? 'text-emerald-600' : stats.tauxRecouvrement >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>
                  {stats.tauxRecouvrement}%
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 no-print">
          {alertes.filter(a => !a.lue).length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
              <AlertCircle size={14} className="text-rose-500" />
              <span className="font-medium">{alertes.filter(a => !a.lue).length} alerte{alertes.filter(a => !a.lue).length > 1 ? 's' : ''}</span>
            </div>
          )}
          <button
            onClick={() => notifyAjout('success', 'Export', 'Export des données effectué')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-gray-700 border border-gray-200 bg-white rounded-xl hover:bg-gray-50 hover:scale-105 active:scale-95 transition-all duration-200"
          >
            <Download size={15} className="text-gray-500" /> Exporter
          </button>
          <button
            onClick={loadData}
            className="p-2 border border-gray-200 bg-white rounded-xl hover:bg-gray-50 text-gray-500 hover:text-gray-700 hover:scale-110 active:scale-95 transition-all duration-200"
            title="Rafraîchir"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Alertes */}
      <AlerteBanner alertes={alertes} />

      {/* Statistiques */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Réservations"
          numericValue={stats.total}
          icon={<Users size={18} />}
          color="emerald"
          subtitle={`${stats.complet} soldées · ${stats.enAttente} en attente`}
          delay={0}
          animate={mounted}
        />
        <StatCard
          label="Montant total"
          numericValue={Math.round(stats.montantTotal)}
          displayValue={`${Math.round(stats.montantTotal).toLocaleString('fr-FR')} €`}
          icon={<Euro size={18} />}
          color="emerald"
          subtitle={`${Math.round(stats.montantPaye).toLocaleString('fr-FR')} € encaissé`}
          delay={80}
          animate={mounted}
        />
        <StatCard
          label="En attente"
          numericValue={stats.enAttente + stats.partiel}
          icon={<Hourglass size={18} />}
          color="amber"
          subtitle={`${stats.enAttente} sans acompte · ${stats.partiel} partiel`}
          delay={160}
          animate={mounted}
        />
        <StatCard
          label="Solde restant"
          numericValue={Math.round(stats.montantRestant)}
          displayValue={`${Math.round(stats.montantRestant).toLocaleString('fr-FR')} €`}
          icon={<Coins size={18} />}
          color={stats.montantRestant > 0 ? 'rose' : 'emerald'}
          subtitle={stats.montantRestant > 0 ? 'À encaisser' : 'Tout est réglé'}
          trend={stats.montantRestant > 0 ? 'down' : 'up'}
          trendValue={stats.montantRestant > 0 ? `${stats.partiel + stats.enAttente} dossier(s) ouverts` : 'Recouvrement complet'}
          delay={240}
          animate={mounted}
        />
      </div>

      {/* Filtres */}
      <div
        className={`bg-white/90 backdrop-blur-sm rounded-xl border border-gray-200 overflow-hidden transition-all duration-500 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
        style={{ transitionDelay: '320ms' }}
      >
        <button
          onClick={() => setShowFilters(v => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors no-print"
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal size={15} className="text-gray-500" />
            Filtres
            <span className="px-2.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">
              {filteredReservations.length} résultat{filteredReservations.length > 1 ? 's' : ''}
            </span>
          </span>
          <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 ${showFilters ? 'rotate-180' : ''}`} />
        </button>

        <div className={`transition-all duration-300 overflow-hidden ${showFilters ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="px-5 pb-4 pt-1 border-t border-gray-100 flex flex-wrap gap-3 items-center no-print">
            <div className="relative flex-1 min-w-[220px]">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par nom, chambre, numéro..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none placeholder-gray-400 bg-gray-50 hover:bg-white transition-colors"
              />
            </div>

            <select
              value={statutFilter}
              onChange={e => setStatutFilter(e.target.value as StatutPaiement | '')}
              className="border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-700 bg-gray-50 hover:bg-white focus:ring-2 focus:ring-emerald-400 outline-none transition-colors"
            >
              <option value="">Tous les statuts</option>
              <option value="EN_ATTENTE">En attente</option>
              <option value="PARTIEL">Partiel</option>
              <option value="COMPLET">Complet</option>
              <option value="IMPREVU">Imprévu</option>
            </select>

            <div className="flex items-center gap-1.5 ml-auto flex-wrap">
              {((['', 'EN_ATTENTE', 'PARTIEL', 'COMPLET'] as const)).map(s => {
                const labels: Record<string, string> = {
                  '': 'Tous',
                  EN_ATTENTE: 'En attente',
                  PARTIEL: 'Partiel',
                  COMPLET: 'Complet'
                };
                const active = statutFilter === s;
                return (
                  <button
                    key={s}
                    onClick={() => setStatutFilter(s)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all duration-200 hover:scale-105 active:scale-95 ${
                      active ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {labels[s]}
                  </button>
                );
              })}
              {(search || statutFilter) && (
                <button
                  onClick={() => { setSearch(''); setStatutFilter(''); }}
                  className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
                >
                  <X size={12} className="inline mr-1" /> Réinitialiser
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tableau */}
      <div
        className={`bg-white/90 backdrop-blur-sm rounded-xl border border-gray-200 overflow-hidden transition-all duration-500 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
        style={{ transitionDelay: '380ms' }}
      >
        {loading ? (
          <Spinner />
        ) : filteredReservations.length === 0 ? (
          <EmptyState
            icon={<CreditCard size={32} />}
            title={search || statutFilter ? 'Aucun résultat' : 'Aucune réservation'}
            description={search || statutFilter ? 'Ajustez vos filtres pour voir plus de résultats.' : 'Les paiements apparaîtront ici lorsque des réservations seront créées.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="w-0 p-0" />
                  {['N°', 'Client', 'Chambre', 'Séjour', 'Total', 'Encaissé', 'Solde', 'Statut', 'Actions'].map(h => (
                    <th
                      key={h}
                      className={`px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-widest ${
                        ['Total', 'Encaissé', 'Solde'].includes(h) ? 'text-right' : h === 'Actions' ? 'text-center' : 'text-left'
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginatedReservations.map((r, idx) => (
                  <PaiementRow
                    key={r.id}
                    r={r}
                    index={idx}
                    visible={rowsVisible}
                    onOpenPaiement={openPaiement}
                    onRelance={setConfirmRelance}
                    onViewDetails={setSelectedForDetails}
                    onPrintFacture={openFacture}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredReservations.length > 0 && !loading && (
          <div className="border-t border-gray-100 px-5 py-3.5 bg-gray-50/40 flex flex-wrap items-center justify-between gap-3 no-print">
            <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
              <span>
                <span className="font-semibold text-gray-700">{filteredReservations.length}</span>
                {' '}réservation{filteredReservations.length > 1 ? 's' : ''}
              </span>
              <span className="w-px h-4 bg-gray-200" />
              <span>
                Total <span className="font-semibold text-gray-800">{stats.montantTotal.toLocaleString('fr-FR')} €</span>
              </span>
              <span className="w-px h-4 bg-gray-200" />
              <span>
                Encaissé <span className="font-semibold text-emerald-600">{stats.montantPaye.toLocaleString('fr-FR')} €</span>
              </span>
              <span className="w-px h-4 bg-gray-200" />
              <span>
                Restant <span className={`font-semibold ${stats.montantRestant > 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                  {stats.montantRestant.toLocaleString('fr-FR')} €
                </span>
              </span>
              <span className="w-px h-4 bg-gray-200" />
              <span className="flex items-center gap-1">
                <Sparkles size={12} className="text-emerald-400" />
                Taux de recouvrement <span className="font-semibold text-emerald-600">{stats.tauxRecouvrement}%</span>
              </span>
            </div>
            {(stats.enAttente > 0 || stats.partiel > 0) && (
              <button
                onClick={envoyerRelancesGroupes}
                className="flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 px-3.5 py-1.5 rounded-lg hover:bg-amber-100 hover:scale-105 active:scale-95 transition-all duration-200"
              >
                <Send size={13} />
                Envoyer les relances ({stats.enAttente + stats.partiel})
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}

      {/* Modal Paiement */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setSelectedResa(null); }}
        title={
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-lg">
              <CreditCard size={16} className="text-emerald-600" />
            </div>
            <span className="text-gray-900">Enregistrer un paiement</span>
            {selectedResa && (
              <span className="text-sm font-normal text-gray-500 ml-1">{selectedResa.numeroReservation}</span>
            )}
          </div>
        }
        size="2xl"
        footer={
          <div className="flex gap-3 justify-end no-print">
            <button
              onClick={() => { setShowModal(false); setSelectedResa(null); }}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSavePaiement}
              disabled={saving}
              className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2 shadow-lg shadow-emerald-200"
            >
              {saving ? (
                <><Loader2 size={15} className="animate-spin" />Enregistrement…</>
              ) : (
                <><Shield size={15} />Valider le paiement</>
              )}
            </button>
          </div>
        }
      >
        {selectedResa && (
          <div className="space-y-5">
            {formError && (
              <div className="flex items-center gap-2.5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm animate-slide-in">
                <AlertCircle size={16} className="shrink-0 text-rose-500" />
                {formError}
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total', value: formatEuro(selectedResa.montantTotal), cls: 'text-gray-900', icon: <Receipt size={14} className="text-gray-400" /> },
                { label: 'Déjà payé', value: formatEuro(selectedResa.montantAcompte), cls: 'text-emerald-600', icon: <CheckCircle size={14} className="text-emerald-400" /> },
                { label: 'Restant dû', value: formatEuro(selectedResa.montantRestantDu), cls: selectedResa.montantRestantDu > 0 ? 'text-rose-600' : 'text-emerald-600', icon: selectedResa.montantRestantDu > 0 ? <AlertTriangle size={14} className="text-rose-400" /> : <CheckCircle size={14} className="text-emerald-400" /> },
              ].map((item) => (
                <div
                  key={item.label}
                  className="text-center p-3.5 bg-gray-50 rounded-xl border border-gray-100 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
                >
                  <p className="text-xs text-gray-500 mb-1 flex items-center justify-center gap-1">{item.icon} {item.label}</p>
                  <p className={`text-lg font-bold ${item.cls}`}>{item.value}</p>
                </div>
              ))}
            </div>

            <div className="p-3.5 bg-gradient-to-r from-gray-50 to-emerald-50/30 rounded-xl border border-gray-100 grid grid-cols-2 gap-y-1.5 text-xs text-gray-600">
              <span className="flex items-center gap-1.5"><User size={12} className="text-gray-400" /> {selectedResa.client.prenom} {selectedResa.client.nom}</span>
              <span className="flex items-center gap-1.5"><Building size={12} className="text-gray-400" /> {selectedResa.chambre.nom}</span>
              <span className="flex items-center gap-1.5"><Calendar size={12} className="text-gray-400" /> {formatDate(selectedResa.dateArrivee)} → {formatDate(selectedResa.dateDepart)}</span>
              <span className="flex items-center gap-1.5"><Clock size={12} className="text-gray-400" /> {selectedResa.nbNuits} nuits · {selectedResa.nbAdultes} adultes{selectedResa.nbEnfants > 0 ? `, ${selectedResa.nbEnfants} enfants` : ''}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Montant (€) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">€</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={paiementForm.montant}
                    onChange={e => setPaiementForm(f => ({ ...f, montant: e.target.value }))}
                    className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none transition-shadow placeholder-gray-400"
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
                {selectedResa.montantRestantDu > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    Solde restant : {formatEuro(selectedResa.montantRestantDu)}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Mode de paiement</label>
                <select
                  value={paiementForm.modePaiement}
                  onChange={e => {
                    const mode = e.target.value as ModePaiement;
                    setPaiementForm(f => ({ 
                      ...f, 
                      modePaiement: mode,
                      numeroCheque: '',
                      banqueEmettrice: '',
                      referenceVirement: '',
                      numeroCarteMasque: '',
                    }));
                  }}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-700 focus:ring-2 focus:ring-emerald-400 outline-none bg-white"
                >
                  {Object.entries(modePaiementLabel).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Type de versement</label>
                <select
                  value={paiementForm.typePaiement}
                  onChange={e => setPaiementForm(f => ({ ...f, typePaiement: e.target.value as TypeVersement }))}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-700 focus:ring-2 focus:ring-emerald-400 outline-none bg-white"
                >
                  {Object.entries(typeVersementLabel).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Date</label>
                <input
                  type="date"
                  value={paiementForm.datePaiement}
                  onChange={e => setPaiementForm(f => ({ ...f, datePaiement: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-400 outline-none"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Référence / N° chèque
                </label>
                <input
                  type="text"
                  value={paiementForm.reference}
                  onChange={e => setPaiementForm(f => ({ ...f, reference: e.target.value }))}
                  placeholder="Optionnel"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-400 outline-none placeholder-gray-400"
                />
              </div>

              <ModePaiementFields
                mode={paiementForm.modePaiement}
                form={paiementForm}
                onChange={(field, value) => setPaiementForm(f => ({ ...f, [field]: value }))}
              />

              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Note interne</label>
                <input
                  type="text"
                  value={paiementForm.notes}
                  onChange={e => setPaiementForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Optionnel"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-400 outline-none placeholder-gray-400"
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-3 text-xs text-blue-700 no-print">
              <Shield size={16} className="text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Transaction sécurisée</p>
                <p className="text-blue-600/80">Les données de paiement sont chiffrées et ne sont pas stockées en clair.</p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirmation paiement */}
      {confirmationData && (
        <PaymentConfirmation
          isOpen={showConfirmation}
          onClose={() => {
            setShowConfirmation(false);
            setConfirmationData(null);
          }}
          montant={confirmationData.montant}
          client={confirmationData.client}
          modePaiement={confirmationData.modePaiement}
          reference={confirmationData.reference}
          onPrint={handlePrintConfirmation}
        />
      )}

      <ConfirmDialog
        isOpen={showConfirmation && !saving}
        title="Confirmer le paiement"
        message={`Voulez-vous confirmer le paiement de ${formatEuro(confirmationData?.montant || 0)} par ${confirmationData?.modePaiement ? modePaiementLabel[confirmationData.modePaiement] : ''} pour ${confirmationData?.client?.prenom} ${confirmationData?.client?.nom} ?`}
        onConfirm={confirmPaiement}
        onCancel={() => {
          setShowConfirmation(false);
          setConfirmationData(null);
        }}
        variant="success"
        confirmLabel="Confirmer"
      />

      {/* Modal Historique */}
      <Modal
        isOpen={!!selectedForDetails}
        onClose={() => setSelectedForDetails(null)}
        title={
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-lg">
              <History size={16} className="text-emerald-600" />
            </div>
            <span className="text-gray-900">Historique des paiements</span>
            {selectedForDetails && (
              <span className="text-sm font-normal text-gray-500 ml-1">{selectedForDetails.numeroReservation}</span>
            )}
          </div>
        }
        size="xl"
        footer={
          <div className="flex gap-3 justify-end no-print">
            <button
              onClick={() => setSelectedForDetails(null)}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Fermer
            </button>
            {selectedForDetails?.statutPaiement !== 'COMPLET' && (
              <button
                onClick={() => { openPaiement(selectedForDetails!); setSelectedForDetails(null); }}
                className="px-5 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                <Plus size={15} /> Nouveau paiement
              </button>
            )}
            {selectedForDetails && (
              <button
                onClick={() => openFacture(selectedForDetails)}
                className="px-5 py-2.5 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                <FileText size={15} /> Facture
              </button>
            )}
          </div>
        }
      >
        {selectedForDetails && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total', value: formatEuro(selectedForDetails.montantTotal), cls: 'text-gray-900' },
                { label: 'Encaissé', value: formatEuro(selectedForDetails.montantAcompte), cls: 'text-emerald-600' },
                { label: 'Restant', value: formatEuro(selectedForDetails.montantRestantDu), cls: selectedForDetails.montantRestantDu > 0 ? 'text-rose-600' : 'text-emerald-600' },
              ].map(item => (
                <div key={item.label} className="text-center p-3.5 bg-gray-50 rounded-xl border border-gray-100 hover:shadow-sm transition-all duration-200">
                  <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                  <p className={`text-lg font-bold ${item.cls}`}>{item.value}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 text-sm">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-semibold text-xs">
                {selectedForDetails.client.prenom[0]}{selectedForDetails.client.nom[0]}
              </div>
              <div>
                <p className="font-medium text-gray-800">{selectedForDetails.client.prenom} {selectedForDetails.client.nom}</p>
                <p className="text-xs text-gray-500">{selectedForDetails.client.email} · {selectedForDetails.client.telephone}</p>
              </div>
              <div className="ml-auto text-right text-xs text-gray-500">
                <p>{selectedForDetails.chambre.nom} · N°{selectedForDetails.chambre.numero}</p>
                <p>{formatDate(selectedForDetails.dateArrivee)} → {formatDate(selectedForDetails.dateDepart)}</p>
              </div>
            </div>

            {!selectedForDetails.paiements || selectedForDetails.paiements.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <CreditCard size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm text-gray-500">Aucun paiement enregistré pour cette réservation</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <Receipt size={13} className="text-gray-400" />
                  {selectedForDetails.paiements.length} paiement{selectedForDetails.paiements.length > 1 ? 's' : ''}
                </p>
                {selectedForDetails.paiements.map((p, i) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3.5 border border-gray-100 rounded-xl hover:border-emerald-200 hover:shadow-md transition-all duration-300 animate-slide-in"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg transition-transform duration-200 hover:scale-110 ${
                        p.typePaiement === 'ACOMPTE' ? 'bg-emerald-50 text-emerald-600' :
                        p.typePaiement === 'SOLDE' ? 'bg-emerald-50 text-emerald-600' :
                        'bg-amber-50 text-amber-600'
                      }`}>
                        {p.typePaiement === 'ACOMPTE' ? <PiggyBank size={14} /> :
                         p.typePaiement === 'SOLDE' ? <CheckCircle size={14} /> :
                         <Gift size={14} />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{typeVersementLabel[p.typePaiement]}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1.5 flex-wrap">
                          <ModePaiementIcon mode={p.modePaiement} />
                          <span className="text-gray-300">·</span>
                          {formatDateTime(p.datePaiement)}
                          {p.reference && <span className="text-gray-300">·</span>}
                          {p.reference && <span className="font-mono text-xs text-gray-400">Réf. {p.reference}</span>}
                          {(p as any).numeroCheque && (
                            <span className="text-gray-300">·</span>
                          )}
                          {(p as any).numeroCheque && (
                            <span className="font-mono text-xs text-amber-600">Chèque #{p.numeroCheque}</span>
                          )}
                          {(p as any).typeCarte && (
                            <span className="font-mono text-xs text-blue-600">{p.typeCarte}</span>
                          )}
                        </p>
                        {p.notes && <p className="text-xs text-gray-500 mt-0.5 italic">📝 {p.notes}</p>}
                      </div>
                    </div>
                    <p className="text-base font-bold text-emerald-600">{formatEuro(p.montant)}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-sm">
              <div>
                <p className="text-xs text-gray-500">Statut paiement</p>
                <StatutBadge statut={selectedForDetails.statutPaiement} size="md" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Réservation</p>
                <p className="font-medium text-gray-800">{selectedForDetails.numeroReservation}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Facture */}
      <FactureModal
        isOpen={showFacture}
        onClose={closeFacture}
        reservation={selectedForFacture}
      />

      <ConfirmDialog
        isOpen={!!confirmRelance}
        title="Envoyer une relance"
        message="Un email de rappel pour paiement en attente sera envoyé au client."
        onConfirm={() => confirmRelance && sendRelance(confirmRelance)}
        onCancel={() => setConfirmRelance(null)}
        variant="warning"
      />

    </div>
  );
}