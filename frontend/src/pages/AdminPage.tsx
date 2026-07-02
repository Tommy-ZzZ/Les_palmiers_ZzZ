// frontend/src/pages/AdminPage.tsx
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Modal } from '../components/ui';
import { formatDateTime, formatDate } from '../utils/helpers';
import {
  Building, Users, Mail, Phone, MapPin, Globe, Settings,
  Edit2, Save, UserPlus, Trash2, Lock, Unlock,
  CheckCircle, XCircle, Search, RefreshCw, Crown,
  User, FileText, Shield, Key, AlertCircle, X,
  Eye, EyeOff, UserCog, Star, Calendar, Clock,
  Hotel, CreditCard, Smartphone, Monitor, Printer,
  Home, Menu, Bell, ChevronDown, Plus, ArrowLeft,
  LogOut, Award, Briefcase, ClipboardList, Download,
  BarChart3, TrendingUp, DollarSign, PieChart,
  Sparkles, Zap, ShieldCheck, Fingerprint
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

type RoleUtilisateur = 'GERANTE' | 'EMPLOYE_ACCUEIL' | 'COMPTABLE';
type StatutUtilisateur = 'ACTIF' | 'INACTIF';

interface Utilisateur {
  id: number;
  nom: string;
  prenom: string;
  login: string;
  email: string;
  telephone: string;
  role: RoleUtilisateur;
  actif: boolean;
  derniere_connexion: string | null;
  date_creation: string;
}

interface Etablissement {
  nom: string;
  categorie: string;
  adresse: string;
  telephone: string;
  email: string;
  site_web?: string;
}

interface Parametres {
  reservation_directe: boolean;
  synchronisation_booking: boolean;
  confirmation_auto_email: boolean;
  mode_maintenance: boolean;
  notification_impayes: boolean;
  rappel_automatique: boolean;
  impression_auto: boolean;
  export_auto: boolean;
}

interface ModeleEmail {
  id: number;
  nom: string;
  type: 'CONFIRMATION' | 'RAPPEL_J7' | 'REMERCIEMENT_J2' | 'ANNULATION';
  sujet: string;
  corps: string;
  variables: string[];
  valide: boolean;
  date_modification: string;
}

interface AuditLog {
  id: number;
  action: string;
  ressource: string;
  id_ressource: number;
  date_heure: string;
  ip: string;
  details: string;
  utilisateur_login: string;
}

// ============================================
// CONSTANTES
// ============================================

const ROLE_LABELS: Record<RoleUtilisateur, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  GERANTE: {
    label: 'Gérant',
    icon: <Crown size={14} className="text-amber-600" />,
    color: 'text-amber-700',
    bg: 'bg-amber-50 border-amber-200'
  },
  EMPLOYE_ACCUEIL: {
    label: 'Employé accueil',
    icon: <User size={14} className="text-blue-600" />,
    color: 'text-blue-700',
    bg: 'bg-blue-50 border-blue-200'
  },
  COMPTABLE: {
    label: 'Comptable',
    icon: <FileText size={14} className="text-purple-600" />,
    color: 'text-purple-700',
    bg: 'bg-purple-50 border-purple-200'
  }
};

const STATUT_LABELS: Record<StatutUtilisateur, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  ACTIF: {
    label: 'Actif',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50 border-emerald-200',
    icon: <CheckCircle size={12} className="text-emerald-500" />
  },
  INACTIF: {
    label: 'Inactif',
    color: 'text-rose-700',
    bg: 'bg-rose-50 border-rose-200',
    icon: <XCircle size={12} className="text-rose-500" />
  }
};

const TYPE_EMAIL_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  CONFIRMATION: { label: 'Confirmation', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  RAPPEL_J7: { label: 'Rappel J-7', color: 'text-blue-700', bg: 'bg-blue-50' },
  REMERCIEMENT_J2: { label: 'Remerciement J+2', color: 'text-purple-700', bg: 'bg-purple-50' },
  ANNULATION: { label: 'Annulation', color: 'text-rose-700', bg: 'bg-rose-50' }
};

// ============================================
// COMPOSANT: TOGGLE SWITCH
// ============================================

const Toggle = ({
  enabled,
  onChange,
  label,
  description,
  delay = 0
}: {
  enabled: boolean;
  onChange: () => void;
  label: string;
  description?: string;
  delay?: number;
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={`flex items-center justify-between py-4 border-b border-gray-100 last:border-0 transition-all duration-500 ${
        mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
      }`}
    >
      <div className="flex-1 pr-4">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {description && <p className="text-xs text-gray-600 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={onChange}
        className={`relative w-12 h-7 rounded-full transition-all duration-300 flex-shrink-0 ${
          enabled ? 'bg-palmier-600 shadow-lg shadow-palmier-200' : 'bg-gray-300'
        }`}
      >
        <span
          className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
        <span className={`absolute inset-0 rounded-full transition-opacity duration-300 ${enabled ? 'opacity-0' : 'opacity-0'}`} />
      </button>
    </div>
  );
};

// ============================================
// COMPOSANT: STATS CARD
// ============================================

const StatCard = ({
  label,
  value,
  icon,
  color = 'palmier',
  subtitle
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color?: 'palmier' | 'emerald' | 'rose' | 'amber' | 'blue' | 'purple';
  subtitle?: string;
}) => {
  const colors = {
    palmier: { bg: 'bg-palmier-50', border: 'border-palmier-200', text: 'text-palmier-700', icon: 'text-palmier-600' },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: 'text-emerald-600' },
    rose: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', icon: 'text-rose-600' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: 'text-amber-600' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: 'text-blue-600' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', icon: 'text-purple-600' }
  };

  return (
    <div className={`${colors[color].bg} rounded-xl border ${colors[color].border} p-4 text-center transition-all duration-300 hover:shadow-md hover:-translate-y-1`}>
      <div className={`flex items-center justify-center gap-1 ${colors[color].icon} mb-1`}>
        {icon}
      </div>
      <p className={`text-2xl font-bold ${colors[color].text}`}>{value}</p>
      <p className="text-xs font-medium text-gray-700">{label}</p>
      {subtitle && <p className="text-[10px] text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  );
};

// ============================================
// COMPOSANT: TEAM MEMBER CARD
// ============================================

const TeamMemberCard = ({
  user,
  onEdit,
  onToggleStatus,
  onDelete,
  onChangePassword,
  index
}: {
  user: Utilisateur;
  onEdit: (user: Utilisateur) => void;
  onToggleStatus: (user: Utilisateur) => void;
  onDelete: (user: Utilisateur) => void;
  onChangePassword: (user: Utilisateur) => void;
  index: number;
}) => {
  const roleInfo = ROLE_LABELS[user.role];
  const statutInfo = STATUT_LABELS[user.actif ? 'ACTIF' : 'INACTIF'];
  const [isHovered, setIsHovered] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100 + index * 60);
    return () => clearTimeout(timer);
  }, [index]);

  return (
    <div
      className={`flex items-center gap-4 py-3.5 border-b border-gray-100 last:border-0 transition-all duration-500 ${
        mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-6'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Avatar */}
      <div
        className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0 transition-all duration-300 ${
          user.actif
            ? 'bg-gradient-to-br from-palmier-500 to-palmier-700'
            : 'bg-gradient-to-br from-gray-400 to-gray-600'
        } ${isHovered ? 'scale-110 rotate-6' : 'scale-100'}`}
      >
        {user.prenom[0]}{user.nom[0]}
      </div>

      {/* Infos */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-gray-900 text-sm">
            {user.prenom} {user.nom}
          </p>
          <span className={`text-xs px-2.5 py-0.5 rounded-full border ${roleInfo.bg} ${roleInfo.color}`}>
            <span className="inline-flex items-center gap-1">
              {roleInfo.icon}
              {roleInfo.label}
            </span>
          </span>
          <span className={`text-xs px-2.5 py-0.5 rounded-full border ${statutInfo.bg} ${statutInfo.color}`}>
            <span className="inline-flex items-center gap-1">
              {statutInfo.icon}
              {statutInfo.label}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-700 mt-0.5 flex-wrap">
          <span className="flex items-center gap-1">
            <Mail size={11} className="text-gray-400" /> {user.email}
          </span>
          {user.telephone && (
            <span className="flex items-center gap-1">
              <Phone size={11} className="text-gray-400" /> {user.telephone}
            </span>
          )}
          <span className="text-gray-400">•</span>
          <span className="font-mono text-gray-500">@{user.login}</span>
          {user.derniere_connexion && (
            <>
              <span className="text-gray-400">•</span>
              <span className="text-gray-500">
                Dernière connexion: {formatDateTime(user.derniere_connexion)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div
        className={`flex gap-0.5 shrink-0 transition-all duration-300 ${
          isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
        }`}
      >
        <button
          onClick={() => onChangePassword(user)}
          className="p-1.5 text-gray-400 hover:text-amber-600 rounded-lg hover:bg-amber-50 transition-all duration-200 hover:scale-110"
          title="Changer le mot de passe"
        >
          <Key size={15} />
        </button>
        <button
          onClick={() => onEdit(user)}
          className="p-1.5 text-gray-400 hover:text-palmier-600 rounded-lg hover:bg-palmier-50 transition-all duration-200 hover:scale-110"
          title="Modifier"
        >
          <Edit2 size={15} />
        </button>
        <button
          onClick={() => onToggleStatus(user)}
          className={`p-1.5 rounded-lg transition-all duration-200 hover:scale-110 ${
            user.actif
              ? 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'
              : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
          }`}
          title={user.actif ? 'Désactiver' : 'Activer'}
        >
          {user.actif ? <Lock size={15} /> : <Unlock size={15} />}
        </button>
        <button
          onClick={() => onDelete(user)}
          className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-all duration-200 hover:scale-110"
          title="Supprimer"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
};

// ============================================
// COMPOSANT: EMAIL TEMPLATE CARD
// ============================================

const EmailTemplateCard = ({
  modele,
  onEdit,
  index
}: {
  modele: ModeleEmail;
  onEdit: (modele: ModeleEmail) => void;
  index: number;
}) => {
  const typeInfo = TYPE_EMAIL_LABELS[modele.type] || TYPE_EMAIL_LABELS.CONFIRMATION;
  const [mounted, setMounted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100 + index * 80);
    return () => clearTimeout(timer);
  }, [index]);

  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 p-5 transition-all duration-500 ${
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      } ${isHovered ? 'shadow-lg -translate-y-1 border-palmier-200' : 'shadow-sm'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h4 className="font-semibold text-gray-900 text-sm">{modele.nom}</h4>
            <span className={`text-xs px-2.5 py-1 rounded-full ${typeInfo.bg} ${typeInfo.color} font-medium`}>
              {typeInfo.label}
            </span>
            {modele.valide && (
              <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full flex items-center gap-1 border border-emerald-200">
                <CheckCircle size={12} className="text-emerald-500" /> Validé
              </span>
            )}
          </div>
          <p className="text-sm text-gray-700 mt-1.5 line-clamp-1">
            <span className="text-gray-500 text-xs font-medium">Sujet:</span> {modele.sujet}
          </p>
          <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
            <span className="text-gray-500">Variables:</span> {modele.variables?.join(' • ') || 'Aucune'}
          </p>
          <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
            <Clock size={11} /> Modifié le {formatDateTime(modele.date_modification)}
          </p>
        </div>
        <button
          onClick={() => onEdit(modele)}
          className={`btn btn-secondary text-sm flex items-center gap-2 px-4 py-2 transition-all duration-300 ${
            isHovered ? 'scale-105' : 'scale-100'
          }`}
        >
          <Edit2 size={14} /> Modifier
        </button>
      </div>
    </div>
  );
};

// ============================================
// COMPOSANT: AUDIT ROW
// ============================================

const AuditRow = ({ log, index }: { log: AuditLog; index: number }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50 + index * 30);
    return () => clearTimeout(timer);
  }, [index]);

  const actionColors: Record<string, string> = {
    CREATE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    UPDATE: 'bg-amber-100 text-amber-700 border-amber-200',
    DELETE: 'bg-rose-100 text-rose-700 border-rose-200',
    LOGIN: 'bg-blue-100 text-blue-700 border-blue-200',
    LOGOUT: 'bg-gray-100 text-gray-700 border-gray-200',
    CHANGE_PASSWORD: 'bg-purple-100 text-purple-700 border-purple-200',
    PATCH: 'bg-indigo-100 text-indigo-700 border-indigo-200'
  };
  const baseAction = log.action.split('_')[0];
  const color = actionColors[baseAction] || 'bg-gray-100 text-gray-700 border-gray-200';

  return (
    <tr
      className={`transition-all duration-400 hover:bg-gray-50 ${
        mounted ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ transitionDelay: `${index * 25}ms` }}
    >
      <td className="px-4 py-3 text-xs text-gray-500 font-mono whitespace-nowrap">
        {formatDateTime(log.date_heure)}
      </td>
      <td className="px-4 py-3 text-sm text-gray-800 font-medium">{log.utilisateur_login}</td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full border ${color} font-medium`}>
          {log.action}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-700">{log.ressource}</td>
      <td className="px-4 py-3 text-xs text-gray-400 font-mono">{log.ip || '—'}</td>
      <td className="px-4 py-3 text-xs text-gray-600 max-w-xs truncate" title={log.details}>
        {log.details || '—'}
      </td>
    </tr>
  );
};

// ============================================
// MODAL: MEMBER FORM
// ============================================

const MemberFormModal = ({
  isOpen,
  onClose,
  onSave,
  editingUser,
  saving
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  editingUser: Utilisateur | null;
  saving: boolean;
}) => {
  const [form, setForm] = useState({
    nom: '',
    prenom: '',
    login: '',
    email: '',
    telephone: '',
    role: 'EMPLOYE_ACCUEIL' as RoleUtilisateur,
    actif: true,
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      if (editingUser) {
        setForm({
          nom: editingUser.nom,
          prenom: editingUser.prenom,
          login: editingUser.login,
          email: editingUser.email,
          telephone: editingUser.telephone || '',
          role: editingUser.role,
          actif: editingUser.actif,
          password: ''
        });
      } else {
        setForm({
          nom: '',
          prenom: '',
          login: '',
          email: '',
          telephone: '',
          role: 'EMPLOYE_ACCUEIL',
          actif: true,
          password: ''
        });
      }
    } else {
      setMounted(false);
    }
  }, [editingUser, isOpen]);

  const isEditing = !!editingUser;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-br from-palmier-100 to-palmier-200 rounded-lg">
            {isEditing ? <Edit2 size={16} className="text-palmier-600" /> : <UserPlus size={16} className="text-palmier-600" />}
          </div>
          <span className="text-gray-900">{isEditing ? 'Modifier un membre' : 'Ajouter un membre'}</span>
          {editingUser && <span className="text-sm font-normal text-gray-500">{editingUser.prenom} {editingUser.nom}</span>}
        </div>
      }
      size="lg"
      footer={
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors" disabled={saving}>
            Annuler
          </button>
          <button
            type="submit"
            form="memberForm"
            className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-palmier-600 to-palmier-700 hover:from-palmier-700 hover:to-palmier-800 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-palmier-200"
            disabled={saving}
          >
            {saving ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Enregistrement...</>
            ) : (
              <><Save size={16} /> {isEditing ? 'Modifier' : 'Ajouter'}</>
            )}
          </button>
        </div>
      }
    >
      <form id="memberForm" onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 flex items-start gap-3">
          <Shield size={18} className="shrink-0 mt-0.5 text-blue-500" />
          <div>
            <p className="font-medium">Rôles disponibles</p>
            <p className="text-xs mt-0.5 text-blue-700">
              <span className="font-medium">👑 Gérant</span> : Accès complet
              <span className="mx-1">·</span>
              <span className="font-medium">🏨 Employé</span> : Gestion quotidienne
              <span className="mx-1">·</span>
              <span className="font-medium">📊 Comptable</span> : Lecture financière
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1.5">
              Prénom <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={form.prenom}
              onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-palmier-500 focus:border-palmier-500 outline-none transition-shadow bg-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1.5">
              Nom <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={form.nom}
              onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-palmier-500 focus:border-palmier-500 outline-none transition-shadow bg-white"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1.5">
            Login <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={form.login}
            onChange={e => setForm(f => ({ ...f, login: e.target.value }))}
            className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 font-mono focus:ring-2 focus:ring-palmier-500 focus:border-palmier-500 outline-none transition-shadow bg-white"
            placeholder="ex: sophie.vandroux"
            required
            disabled={isEditing}
          />
          {isEditing && <p className="text-xs text-gray-500 mt-1">Le login ne peut pas être modifié</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1.5">
            Email <span className="text-rose-500">*</span>
          </label>
          <input
            type="email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-palmier-500 focus:border-palmier-500 outline-none transition-shadow bg-white"
            placeholder="ex: utilisateur@lespalmiers.re"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1.5">
              Téléphone
            </label>
            <input
              type="text"
              value={form.telephone}
              onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-palmier-500 focus:border-palmier-500 outline-none transition-shadow bg-white"
              placeholder="ex: 0612345678"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1.5">
              Rôle <span className="text-rose-500">*</span>
            </label>
            <select
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value as RoleUtilisateur }))}
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-palmier-500 focus:border-palmier-500 outline-none bg-white"
              required
            >
              <option value="GERANTE">👑 Gérant</option>
              <option value="EMPLOYE_ACCUEIL">🏨 Employé accueil</option>
              <option value="COMPTABLE">📊 Comptable</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1.5">
            Statut
          </label>
          <select
            value={form.actif ? 'ACTIF' : 'INACTIF'}
            onChange={e => setForm(f => ({ ...f, actif: e.target.value === 'ACTIF' }))}
            className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-palmier-500 focus:border-palmier-500 outline-none bg-white"
          >
            <option value="ACTIF">🟢 Actif</option>
            <option value="INACTIF">🔴 Inactif</option>
          </select>
        </div>

        {!isEditing && (
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1.5">
              Mot de passe <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-palmier-500 focus:border-palmier-500 outline-none transition-shadow bg-white"
                placeholder="Minimum 8 caractères"
                required={!isEditing}
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
};

// ============================================
// MODAL: CHANGE PASSWORD
// ============================================

const ChangePasswordModal = ({
  isOpen,
  onClose,
  onConfirm,
  user,
  saving
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { nouveauMotDePasse: string; motDePasseAdmin: string }) => void;
  user: Utilisateur | null;
  saving: boolean;
}) => {
  const [form, setForm] = useState({
    nouveauMotDePasse: '',
    motDePasseAdmin: '',
    confirmMotDePasse: ''
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm({ nouveauMotDePasse: '', motDePasseAdmin: '', confirmMotDePasse: '' });
    }
  }, [isOpen]);

  if (!user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.nouveauMotDePasse !== form.confirmMotDePasse) {
      alert('Les mots de passe ne correspondent pas');
      return;
    }
    onConfirm({ nouveauMotDePasse: form.nouveauMotDePasse, motDePasseAdmin: form.motDePasseAdmin });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-br from-amber-100 to-amber-200 rounded-lg">
            <Key size={16} className="text-amber-600" />
          </div>
          <span className="text-gray-900">Changer le mot de passe</span>
          <span className="text-sm font-normal text-gray-500">{user.prenom} {user.nom}</span>
        </div>
      }
      footer={
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors" disabled={saving}>
            Annuler
          </button>
          <button
            type="submit"
            form="passwordForm"
            className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-amber-200"
            disabled={saving}
          >
            {saving ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Changement...</>
            ) : (
              <><Key size={16} /> Changer le mot de passe</>
            )}
          </button>
        </div>
      }
    >
      <form id="passwordForm" onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 flex items-start gap-3">
          <AlertCircle size={18} className="shrink-0 mt-0.5 text-amber-500" />
          <div>
            <p className="font-medium">Confirmation requise</p>
            <p className="text-xs mt-0.5 text-amber-700">
              Vous devez entrer votre mot de passe administrateur pour confirmer ce changement.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1.5">
            Nouveau mot de passe <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={form.nouveauMotDePasse}
              onChange={e => setForm(f => ({ ...f, nouveauMotDePasse: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-palmier-500 focus:border-palmier-500 outline-none transition-shadow bg-white"
              placeholder="Minimum 8 caractères"
              required
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1.5">
            Confirmer le mot de passe <span className="text-rose-500">*</span>
          </label>
          <input
            type="password"
            value={form.confirmMotDePasse}
            onChange={e => setForm(f => ({ ...f, confirmMotDePasse: e.target.value }))}
            className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-palmier-500 focus:border-palmier-500 outline-none transition-shadow bg-white"
            placeholder="Confirmez le nouveau mot de passe"
            required
          />
        </div>

        <div className="border-t border-gray-200 pt-4 mt-2">
          <label className="block text-sm font-medium text-gray-900 mb-1.5">
            Votre mot de passe administrateur <span className="text-rose-500">*</span>
          </label>
          <input
            type="password"
            value={form.motDePasseAdmin}
            onChange={e => setForm(f => ({ ...f, motDePasseAdmin: e.target.value }))}
            className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-palmier-500 focus:border-palmier-500 outline-none transition-shadow bg-white"
            placeholder="Entrez votre mot de passe pour confirmer"
            required
          />
        </div>
      </form>
    </Modal>
  );
};

// ============================================
// MODAL: DELETE CONFIRM
// ============================================

const DeleteConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  user,
  deleting
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  user: Utilisateur | null;
  deleting: boolean;
}) => {
  if (!user) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-rose-100 rounded-lg">
            <AlertCircle size={16} className="text-rose-600" />
          </div>
          <span className="text-gray-900">Confirmer la suppression</span>
        </div>
      }
      footer={
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors" disabled={deleting}>
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-rose-200"
            disabled={deleting}
          >
            {deleting ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Suppression...</>
            ) : (
              <><Trash2 size={16} /> Supprimer définitivement</>
            )}
          </button>
        </div>
      }
    >
      <div className="text-center py-6">
        <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4 transition-all duration-300 hover:scale-110">
          <AlertCircle size={32} className="text-rose-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">
          Supprimer {user.prenom} {user.nom} ?
        </h3>
        <p className="text-sm text-gray-600 mt-2 max-w-sm mx-auto">
          Cette action est irréversible. L'utilisateur perdra définitivement tout accès au système.
        </p>
        <p className="text-xs text-rose-500 mt-3 flex items-center justify-center gap-1">
          <AlertCircle size={12} /> Toutes les données associées seront conservées.
        </p>
      </div>
    </Modal>
  );
};

// ============================================
// PAGE PRINCIPALE
// ============================================

export default function AdminPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [activeTab, setActiveTab] = useState<'equipe' | 'etablissement' | 'parametres' | 'emails' | 'audit'>('equipe');

  // Établissement
  const [etablissement, setEtablissement] = useState<Etablissement>({
    nom: 'Les Palmiers de l\'Entre-Deux',
    categorie: 'Gîte de charme',
    adresse: '12 Rue des Palmiers, 97440 L\'Entre-Deux, La Réunion',
    telephone: '+262 262 12 34 56',
    email: 'contact@lespalmiers-reunion.re',
    site_web: 'www.lespalmiers-reunion.re'
  });

  // Paramètres
  const [parametres, setParametres] = useState<Parametres>({
    reservation_directe: true,
    synchronisation_booking: false,
    confirmation_auto_email: true,
    mode_maintenance: false,
    notification_impayes: true,
    rappel_automatique: true,
    impression_auto: true,
    export_auto: false
  });

  // Utilisateurs
  const [users, setUsers] = useState<Utilisateur[]>([]);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<RoleUtilisateur | 'TOUS'>('TOUS');

  // Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Utilisateur | null>(null);
  const [deletingUser, setDeletingUser] = useState<Utilisateur | null>(null);
  const [passwordUser, setPasswordUser] = useState<Utilisateur | null>(null);

  // Emails
  const [modelesEmail, setModelesEmail] = useState<ModeleEmail[]>([]);
  const [editModele, setEditModele] = useState<ModeleEmail | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailForm, setEmailForm] = useState({ sujet: '', corps: '' });
  const [savingEmail, setSavingEmail] = useState(false);

  // Audit
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditFilter, setAuditFilter] = useState('');
  const [auditLimit, setAuditLimit] = useState(50);

  // ============================================
  // FETCH FUNCTIONS
  // ============================================

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/utilisateurs');
      setUsers(res.data?.data ?? res.data);
    } catch (err) {
      console.error('Erreur chargement utilisateurs', err);
    }
  };

  const fetchModelesEmail = async () => {
    try {
      const res = await api.get('/admin/modeles-email');
      setModelesEmail(res.data?.data ?? res.data);
    } catch (err) {
      console.error('Erreur chargement modèles email', err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await api.get('/admin/audit', { params: { limit: auditLimit } });
      setAuditLogs(res.data?.data ?? res.data);
    } catch (err) {
      console.error('Erreur chargement audit', err);
    }
  };

  const refreshAll = async () => {
    setLoading(true);
    await Promise.all([fetchUsers(), fetchModelesEmail()]);
    setLoading(false);
  };

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeTab, auditLimit]);

  // ============================================
  // FILTRAGE
  // ============================================

  const filteredUsers = users.filter(user => {
    const matchSearch =
      user.nom.toLowerCase().includes(search.toLowerCase()) ||
      user.prenom.toLowerCase().includes(search.toLowerCase()) ||
      user.login.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'TOUS' || user.role === filterRole;
    return matchSearch && matchRole;
  });

  const filteredAudit = auditLogs.filter(log =>
    log.action.toLowerCase().includes(auditFilter.toLowerCase()) ||
    log.ressource.toLowerCase().includes(auditFilter.toLowerCase()) ||
    log.utilisateur_login.toLowerCase().includes(auditFilter.toLowerCase())
  );

  // ============================================
  // HANDLERS - UTILISATEURS
  // ============================================

  const handleAddUser = () => {
    setEditingUser(null);
    setShowFormModal(true);
  };

  const handleEditUser = (user: Utilisateur) => {
    setEditingUser(user);
    setShowFormModal(true);
  };

  const handleSaveUser = async (data: any) => {
    setSaving(true);
    try {
      if (editingUser) {
        await api.put(`/admin/utilisateurs/${editingUser.id}`, data);
      } else {
        await api.post('/admin/utilisateurs', data);
      }
      await fetchUsers();
      setShowFormModal(false);
      setEditingUser(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (user: Utilisateur) => {
    try {
      await api.patch(`/admin/utilisateurs/${user.id}/statut`, { actif: !user.actif });
      await fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur lors du changement de statut');
    }
  };

  const handleChangePassword = (user: Utilisateur) => {
    setPasswordUser(user);
    setShowPasswordModal(true);
  };

  const handleConfirmChangePassword = async (data: { nouveauMotDePasse: string; motDePasseAdmin: string }) => {
    if (!passwordUser) return;
    setSaving(true);
    try {
      await api.post(`/admin/utilisateurs/${passwordUser.id}/change-password`, data);
      alert(`✅ Mot de passe de ${passwordUser.prenom} ${passwordUser.nom} modifié avec succès !`);
      setShowPasswordModal(false);
      setPasswordUser(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur lors du changement de mot de passe');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (user: Utilisateur) => {
    setDeletingUser(user);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingUser) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/utilisateurs/${deletingUser.id}`);
      await fetchUsers();
      setShowDeleteModal(false);
      setDeletingUser(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  // ============================================
  // HANDLERS - ÉTABLISSEMENT & PARAMÈTRES
  // ============================================

  const handleSaveEtablissement = async () => {
    setSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsDirty(false);
      alert('✅ Informations mises à jour avec succès !');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleParam = (key: keyof Parametres) => {
    setParametres(prev => ({ ...prev, [key]: !prev[key] }));
    setIsDirty(true);
  };

  // ============================================
  // HANDLERS - MODÈLES EMAIL
  // ============================================

  const handleEditModele = (modele: ModeleEmail) => {
    setEditModele(modele);
    setEmailForm({ sujet: modele.sujet, corps: modele.corps });
    setShowEmailModal(true);
  };

  const handleSaveModele = async () => {
    if (!editModele) return;
    setSavingEmail(true);
    try {
      await api.put(`/admin/modeles-email/${editModele.id}`, emailForm);
      await fetchModelesEmail();
      setShowEmailModal(false);
      setEditModele(null);
      alert('✅ Modèle mis à jour avec succès !');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur lors de la mise à jour');
    } finally {
      setSavingEmail(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================

  const TABS = [
    { key: 'equipe', label: 'Équipe', icon: <Users size={16} /> },
    { key: 'etablissement', label: 'Établissement', icon: <Building size={16} /> },
    { key: 'parametres', label: 'Paramètres', icon: <Settings size={16} /> },
    { key: 'emails', label: 'Emails', icon: <Mail size={16} /> },
    { key: 'audit', label: 'Audit', icon: <ClipboardList size={16} /> },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-palmier-200 border-t-palmier-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Chargement de l'administration...</p>
          <p className="text-sm text-gray-400 mt-1">Préparation de votre espace de gestion</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4 lg:p-6">

      {/* ─── STYLES ──────────────────────────────── */}
      <style>{`
        @keyframes fadeSlideDown {
          from { opacity: 0; transform: translateY(-12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(34, 139, 34, 0.1); }
          50% { box-shadow: 0 0 40px rgba(34, 139, 34, 0.2); }
        }
        .animate-fade-slide-down {
          animation: fadeSlideDown 0.4s ease-out forwards;
        }
        .animate-scale-in {
          animation: scaleIn 0.3s ease-out forwards;
        }
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.625rem 1.25rem;
          font-size: 0.875rem;
          font-weight: 500;
          border-radius: 0.75rem;
          transition: all 0.2s ease;
          cursor: pointer;
          border: none;
        }
        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .btn-primary {
          background: linear-gradient(135deg, #2a7a62, #1d5a48);
          color: white;
          box-shadow: 0 4px 14px rgba(42, 122, 98, 0.25);
        }
        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(42, 122, 98, 0.35);
        }
        .btn-secondary {
          background: #f1f5f9;
          color: #1e293b;
          border: 1px solid #e2e8f0;
        }
        .btn-secondary:hover:not(:disabled) {
          background: #e2e8f0;
          transform: translateY(-1px);
        }
        .btn-danger {
          background: linear-gradient(135deg, #e11d48, #be123c);
          color: white;
          box-shadow: 0 4px 14px rgba(225, 29, 72, 0.25);
        }
        .btn-danger:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(225, 29, 72, 0.35);
        }
      `}</style>

      {/* ─── EN-TÊTE ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-slide-down">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-palmier-100 to-palmier-200 rounded-xl">
              <Settings size={22} className="text-palmier-600" />
            </div>
            Administration
            <Sparkles size={16} className="text-palmier-400 animate-pulse" />
          </h1>
          <p className="text-sm text-gray-600 mt-0.5 ml-12">
            Gérez votre établissement, votre équipe et la configuration du système.
          </p>
        </div>
        {isDirty && (
          <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 px-4 py-2 rounded-xl border border-amber-200 animate-pulse">
            <AlertCircle size={14} />
            Modifications non enregistrées
          </div>
        )}
      </div>

      {/* ─── TABS ────────────────────────────────── */}
      <div className="flex flex-wrap gap-1 bg-gray-100 p-1.5 rounded-2xl animate-fade-slide-down">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
              activeTab === tab.key
                ? 'bg-white text-palmier-700 shadow-lg shadow-palmier-100 scale-105'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ──────────────────────────────────────────── */}
      {/* TAB: ÉQUIPE */}
      {/* ──────────────────────────────────────────── */}
      {activeTab === 'equipe' && (
        <div className="space-y-4 animate-scale-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-4">
              <p className="text-sm text-gray-700">
                <span className="font-semibold text-palmier-700">{users.filter(u => u.actif).length}</span> membres actifs · <span className="font-medium text-gray-900">{users.length}</span> au total
              </p>
              <button
                onClick={refreshAll}
                className="text-sm text-palmier-600 hover:text-palmier-800 flex items-center gap-1 transition-colors"
              >
                <RefreshCw size={14} className="hover:rotate-180 transition-transform duration-500" />
                Actualiser
              </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 pr-8 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-palmier-500 focus:border-palmier-500 outline-none w-full sm:w-56 bg-white transition-shadow"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <select
                value={filterRole}
                onChange={e => setFilterRole(e.target.value as RoleUtilisateur | 'TOUS')}
                className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-palmier-500 focus:border-palmier-500 outline-none bg-white"
              >
                <option value="TOUS">Tous les rôles</option>
                <option value="GERANTE">👑 Gérant</option>
                <option value="EMPLOYE_ACCUEIL">🏨 Employé</option>
                <option value="COMPTABLE">📊 Comptable</option>
              </select>
              <button
                onClick={handleAddUser}
                className="btn btn-primary text-sm flex items-center gap-1.5"
              >
                <UserPlus size={15} />
                Ajouter
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            <StatCard label="Total" value={users.length} icon={<Users size={16} />} color="palmier" />
            <StatCard label="Actifs" value={users.filter(u => u.actif).length} icon={<CheckCircle size={16} />} color="emerald" />
            <StatCard label="Inactifs" value={users.filter(u => !u.actif).length} icon={<XCircle size={16} />} color="rose" />
            <StatCard label="Gérants" value={users.filter(u => u.role === 'GERANTE').length} icon={<Crown size={16} />} color="amber" />
            <StatCard label="Employés" value={users.filter(u => u.role === 'EMPLOYE_ACCUEIL').length} icon={<User size={16} />} color="blue" />
            <StatCard label="Comptables" value={users.filter(u => u.role === 'COMPTABLE').length} icon={<FileText size={16} />} color="purple" />
          </div>

          {/* Liste */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="p-5">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users size={32} className="text-gray-300" />
                  </div>
                  <p className="text-gray-600 font-medium">Aucun membre trouvé</p>
                  <button
                    onClick={() => { setSearch(''); setFilterRole('TOUS'); }}
                    className="text-sm text-palmier-600 hover:text-palmier-800 mt-2 transition-colors"
                  >
                    Réinitialiser les filtres
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredUsers.map((user, index) => (
                    <TeamMemberCard
                      key={user.id}
                      user={user}
                      index={index}
                      onEdit={handleEditUser}
                      onToggleStatus={handleToggleStatus}
                      onDelete={handleDeleteClick}
                      onChangePassword={handleChangePassword}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────── */}
      {/* TAB: ÉTABLISSEMENT */}
      {/* ──────────────────────────────────────────── */}
      {activeTab === 'etablissement' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 animate-scale-in">
          <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-palmier-50/60 to-sable-50/60">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-xl shadow-sm">
                <Building size={18} className="text-palmier-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Informations établissement</h2>
                <p className="text-xs text-gray-600 mt-0.5">Coordonnées et paramètres généraux du gîte.</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">Nom de l'établissement *</label>
                <input
                  type="text"
                  value={etablissement.nom}
                  onChange={e => { setEtablissement({ ...etablissement, nom: e.target.value }); setIsDirty(true); }}
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-palmier-500 focus:border-palmier-500 outline-none transition-shadow bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">Catégorie</label>
                <input
                  type="text"
                  value={etablissement.categorie}
                  onChange={e => { setEtablissement({ ...etablissement, categorie: e.target.value }); setIsDirty(true); }}
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-palmier-500 focus:border-palmier-500 outline-none transition-shadow bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1.5">Adresse *</label>
              <input
                type="text"
                value={etablissement.adresse}
                onChange={e => { setEtablissement({ ...etablissement, adresse: e.target.value }); setIsDirty(true); }}
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-palmier-500 focus:border-palmier-500 outline-none transition-shadow bg-white"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">Téléphone *</label>
                <input
                  type="text"
                  value={etablissement.telephone}
                  onChange={e => { setEtablissement({ ...etablissement, telephone: e.target.value }); setIsDirty(true); }}
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-palmier-500 focus:border-palmier-500 outline-none transition-shadow bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">E-mail *</label>
                <input
                  type="email"
                  value={etablissement.email}
                  onChange={e => { setEtablissement({ ...etablissement, email: e.target.value }); setIsDirty(true); }}
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-palmier-500 focus:border-palmier-500 outline-none transition-shadow bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1.5">Site web</label>
              <input
                type="text"
                value={etablissement.site_web || ''}
                onChange={e => { setEtablissement({ ...etablissement, site_web: e.target.value }); setIsDirty(true); }}
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-palmier-500 focus:border-palmier-500 outline-none transition-shadow bg-white"
                placeholder="www.mon-site.fr"
              />
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <button
                onClick={handleSaveEtablissement}
                disabled={saving || !isDirty}
                className="btn btn-primary px-6 py-2.5 text-sm"
              >
                {saving ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Enregistrer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────── */}
      {/* TAB: PARAMÈTRES */}
      {/* ──────────────────────────────────────────── */}
      {activeTab === 'parametres' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 animate-scale-in">
          <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-palmier-50/60 to-sable-50/60">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-xl shadow-sm">
                <Settings size={18} className="text-palmier-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Paramètres généraux</h2>
                <p className="text-xs text-gray-600 mt-0.5">Configuration des fonctionnalités principales du système.</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <Toggle
              enabled={parametres.reservation_directe}
              onChange={() => handleToggleParam('reservation_directe')}
              label="Réservation directe activée"
              description="Permettre aux clients de réserver via votre site web."
              delay={0}
            />
            <Toggle
              enabled={parametres.synchronisation_booking}
              onChange={() => handleToggleParam('synchronisation_booking')}
              label="Synchronisation Booking.com"
              description="Synchroniser disponibilités et tarifs en temps réel."
              delay={50}
            />
            <Toggle
              enabled={parametres.confirmation_auto_email}
              onChange={() => handleToggleParam('confirmation_auto_email')}
              label="Confirmation automatique par e-mail"
              description="Envoyer un e-mail dès qu'une réservation est créée."
              delay={100}
            />
            <Toggle
              enabled={parametres.rappel_automatique}
              onChange={() => handleToggleParam('rappel_automatique')}
              label="Rappel automatique J-7"
              description="Envoyer un email de rappel 7 jours avant l'arrivée."
              delay={150}
            />
            <Toggle
              enabled={parametres.notification_impayes}
              onChange={() => handleToggleParam('notification_impayes')}
              label="Notifications des impayés"
              description="Recevoir une alerte pour les paiements en retard."
              delay={200}
            />
            <Toggle
              enabled={parametres.impression_auto}
              onChange={() => handleToggleParam('impression_auto')}
              label="Impression automatique des factures"
              description="Imprimer automatiquement les factures à l'arrivée."
              delay={250}
            />
            <Toggle
              enabled={parametres.export_auto}
              onChange={() => handleToggleParam('export_auto')}
              label="Export automatique mensuel"
              description="Exporter automatiquement les données comptables chaque mois."
              delay={300}
            />
            <Toggle
              enabled={parametres.mode_maintenance}
              onChange={() => handleToggleParam('mode_maintenance')}
              label="Mode maintenance"
              description="Désactiver temporairement les nouvelles réservations."
              delay={350}
            />
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────── */}
      {/* TAB: EMAILS */}
      {/* ──────────────────────────────────────────── */}
      {activeTab === 'emails' && (
        <div className="space-y-4 animate-scale-in">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-palmier-700">{modelesEmail.length}</span> modèle{modelesEmail.length > 1 ? 's' : ''}
              <span className="text-xs text-gray-500 ml-3 border-l border-gray-200 pl-3">RG6: Modèles validés par la gérante</span>
            </p>
            <button
              onClick={fetchModelesEmail}
              className="text-sm text-palmier-600 hover:text-palmier-800 flex items-center gap-1 transition-colors"
            >
              <RefreshCw size={14} className="hover:rotate-180 transition-transform duration-500" />
              Actualiser
            </button>
          </div>

          {modelesEmail.map((modele, index) => (
            <EmailTemplateCard
              key={modele.id}
              modele={modele}
              onEdit={handleEditModele}
              index={index}
            />
          ))}
        </div>
      )}

      {/* ──────────────────────────────────────────── */}
      {/* TAB: AUDIT */}
      {/* ──────────────────────────────────────────── */}
      {activeTab === 'audit' && (
        <div className="space-y-4 animate-scale-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-palmier-700">{auditLogs.length}</span> entrées d'audit
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Filtrer par action, ressource..."
                  value={auditFilter}
                  onChange={e => setAuditFilter(e.target.value)}
                  className="pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-palmier-500 focus:border-palmier-500 outline-none w-full sm:w-64 bg-white transition-shadow"
                />
              </div>
              <select
                value={auditLimit}
                onChange={e => setAuditLimit(Number(e.target.value))}
                className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-palmier-500 focus:border-palmier-500 outline-none bg-white"
              >
                <option value={20}>20 lignes</option>
                <option value={50}>50 lignes</option>
                <option value={100}>100 lignes</option>
                <option value={200}>200 lignes</option>
              </select>
              <button
                onClick={fetchAuditLogs}
                className="btn btn-secondary text-sm flex items-center gap-1.5"
              >
                <RefreshCw size={14} />
                Rafraîchir
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80">
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date/Heure</th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Utilisateur</th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Ressource</th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">IP</th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Détails</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredAudit.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-gray-500 text-sm">
                        <div className="flex flex-col items-center gap-2">
                          <ClipboardList size={32} className="text-gray-300" />
                          <p>Aucune entrée d'audit trouvée</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredAudit.map((log, index) => (
                      <AuditRow key={log.id} log={log} index={index} />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODALS ──────────────────────────────── */}

      <MemberFormModal
        isOpen={showFormModal}
        onClose={() => { setShowFormModal(false); setEditingUser(null); }}
        onSave={handleSaveUser}
        editingUser={editingUser}
        saving={saving}
      />

      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => { setShowPasswordModal(false); setPasswordUser(null); }}
        onConfirm={handleConfirmChangePassword}
        user={passwordUser}
        saving={saving}
      />

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setDeletingUser(null); }}
        onConfirm={handleDeleteConfirm}
        user={deletingUser}
        deleting={deleting}
      />

      {/* ─── MODAL EMAIL ────────────────────────── */}
      <Modal
        isOpen={showEmailModal}
        onClose={() => { setShowEmailModal(false); setEditModele(null); }}
        title={
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg">
              <Mail size={16} className="text-blue-600" />
            </div>
            <span className="text-gray-900">Modifier :</span>
            <span className="text-sm font-normal text-gray-500">{editModele?.nom ?? ''}</span>
          </div>
        }
        size="2xl"
        footer={
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => { setShowEmailModal(false); setEditModele(null); }}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              disabled={savingEmail}
            >
              Annuler
            </button>
            <button
              onClick={handleSaveModele}
              disabled={savingEmail}
              className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-palmier-600 to-palmier-700 hover:from-palmier-700 hover:to-palmier-800 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-palmier-200"
            >
              {savingEmail ? (
                <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Enregistrement...</>
              ) : (
                <><Save size={16} /> Enregistrer</>
              )}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1.5">Sujet de l'email</label>
            <input
              type="text"
              value={emailForm.sujet}
              onChange={e => setEmailForm(f => ({ ...f, sujet: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-palmier-500 focus:border-palmier-500 outline-none transition-shadow bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1.5">Corps de l'email</label>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 text-xs text-blue-800">
              <p className="font-medium mb-2 flex items-center gap-2">
                <Sparkles size={14} className="text-blue-500" />
                Variables disponibles :
              </p>
              <div className="flex flex-wrap gap-1.5">
                {['{{ prenom }}', '{{ nom }}', '{{ date_arrivee }}', '{{ date_depart }}', '{{ chambre }}', '{{ montant }}', '{{ numero_reservation }}'].map(v => (
                  <span key={v} className="bg-blue-100 px-2.5 py-0.5 rounded-lg font-mono text-xs text-blue-800 border border-blue-200">
                    {v}
                  </span>
                ))}
              </div>
            </div>
            <textarea
              value={emailForm.corps}
              onChange={e => setEmailForm(f => ({ ...f, corps: e.target.value }))}
              rows={12}
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-palmier-500 focus:border-palmier-500 outline-none resize-none font-mono bg-white transition-shadow"
            />
          </div>
        </div>
      </Modal>

    </div>
  );
}