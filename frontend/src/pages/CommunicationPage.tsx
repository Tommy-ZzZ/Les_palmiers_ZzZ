// frontend/src/pages/CommunicationPage.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  Mail, Send, FileText, Users, Search,
  Eye, Edit, Trash2, Plus, Clock, CheckCircle,
  XCircle, AlertCircle, Download, Printer, MessageSquare,
  Inbox, Star, User, Calendar, Euro, Phone,
  RefreshCw, Sparkles, TrendingUp, TrendingDown,
  ChevronDown, ChevronUp, Loader2, X, AlertTriangle,
  BookOpen, Save, Check, RotateCw, Zap,
  Filter, ExternalLink, Copy, Tag, Hash, Briefcase,
  Smile, Heart, Award, Shield, Layers, Grid, List,
  ArrowUp, ArrowDown, MoreVertical, SendHorizontal
} from 'lucide-react';
import { communicationService, clientService } from '../services/api';
import {
  ModeleMessage,
  MessageEmail,
  CommunicationStats,
  TypeMessage,
  ContactClient,
  StatutClient
} from '../types';

// ============================================
// CONSTANTES
// ============================================

const TYPE_LABELS: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  CONFIRMATION: {
    label: 'Confirmation',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: <CheckCircle size={12} className="text-emerald-500" />
  },
  RAPPEL_J7: {
    label: 'Rappel J-7',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: <Clock size={12} className="text-blue-500" />
  },
  REMERCIEMENT_J2: {
    label: 'Remerciement',
    className: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: <Heart size={12} className="text-purple-500" />
  },
  ANNULATION: {
    label: 'Annulation',
    className: 'bg-red-50 text-red-700 border-red-200',
    icon: <XCircle size={12} className="text-red-500" />
  },
  RELANCE_PAIEMENT: {
    label: 'Relance paiement',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: <AlertTriangle size={12} className="text-amber-500" />
  },
  MANUEL: {
    label: 'Manuel',
    className: 'bg-gray-50 text-gray-700 border-gray-200',
    icon: <Send size={12} className="text-gray-500" />
  }
};

const STATUT_CONFIG: Record<string, { label: string; className: string; icon: React.ReactNode; dotColor: string }> = {
  ENVOYE: {
    label: 'Envoyé',
    className: 'bg-green-50 text-green-700 border-green-200',
    icon: <CheckCircle size={14} className="text-green-500" />,
    dotColor: 'bg-green-500'
  },
  OUVERT: {
    label: 'Lu',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: <Eye size={14} className="text-blue-500" />,
    dotColor: 'bg-blue-500'
  },
  EN_ATTENTE: {
    label: 'En attente',
    className: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    icon: <Clock size={14} className="text-yellow-500" />,
    dotColor: 'bg-yellow-500 animate-pulse'
  },
  ECHEC: {
    label: 'Échec',
    className: 'bg-red-50 text-red-700 border-red-200',
    icon: <XCircle size={14} className="text-red-500" />,
    dotColor: 'bg-red-500'
  }
};

// ============================================
// COMPOSANTS UI
// ============================================

const Spinner = () => (
  <div className="flex flex-col items-center justify-center py-16 gap-3">
    <div className="relative">
      <div className="w-12 h-12 border-3 border-palmier-200 border-t-palmier-600 rounded-full animate-spin" />
      <div className="absolute inset-0 flex items-center justify-center">
        <Sparkles size={14} className="text-palmier-400 animate-pulse" />
      </div>
    </div>
    <p className="text-sm text-gray-500 animate-pulse">Chargement...</p>
  </div>
);

const EmptyState = ({ icon, title, description, action }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) => (
  <div className="flex flex-col items-center justify-center py-16 gap-4">
    <div className="p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl text-gray-300">
      {icon}
    </div>
    <div className="text-center">
      <p className="font-semibold text-gray-800 text-lg">{title}</p>
      <p className="text-sm text-gray-500 mt-1 max-w-sm">{description}</p>
    </div>
    {action && <div className="mt-2">{action}</div>}
  </div>
);

const StatutBadge = ({ statut }: { statut: string }) => {
  const c = STATUT_CONFIG[statut] || STATUT_CONFIG.EN_ATTENTE;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${c.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dotColor}`} />
      {c.icon}
      {c.label}
    </span>
  );
};

const TypeBadge = ({ type }: { type: TypeMessage | string }) => {
  const c = TYPE_LABELS[type] || TYPE_LABELS.MANUEL;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${c.className}`}>
      {c.icon}
      {c.label}
    </span>
  );
};

const StatutClientBadge = ({ statut }: { statut: StatutClient }) => {
  const config: Record<StatutClient, { label: string; className: string; icon: React.ReactNode }> = {
    VIP: { label: '⭐ VIP', className: 'bg-purple-100 text-purple-800', icon: <Award size={12} className="text-purple-500" /> },
    REGULIER: { label: '🔄 Régulier', className: 'bg-blue-100 text-blue-800', icon: <User size={12} className="text-blue-500" /> },
    NOUVEAU: { label: '🆕 Nouveau', className: 'bg-gray-100 text-gray-800', icon: <User size={12} className="text-gray-500" /> }
  };
  const c = config[statut] || config.NOUVEAU;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs rounded-full ${c.className}`}>
      {c.icon}
      {c.label}
    </span>
  );
};

// ─── MODAL ───
const Modal = ({ isOpen, onClose, title, children, footer, size = 'lg' }: {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (isOpen) requestAnimationFrame(() => setVisible(true));
    else setVisible(false);
  }, [isOpen]);
  if (!isOpen) return null;
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
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

// ─── CONFIRM DIALOG ───
const ConfirmDialog = ({ isOpen, title, message, onConfirm, onCancel, variant = 'default' }: {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'default' | 'danger' | 'warning';
}) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (isOpen) requestAnimationFrame(() => setVisible(true));
    else setVisible(false);
  }, [isOpen]);
  if (!isOpen) return null;
  const btnClass = {
    default: 'bg-palmier-600 hover:bg-palmier-700',
    danger: 'bg-red-600 hover:bg-red-700',
    warning: 'bg-amber-500 hover:bg-amber-600'
  };
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${visible ? 'bg-black/40 backdrop-blur-sm' : 'bg-black/0'}`}>
      <div className={`bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 transition-all duration-300 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mb-3">
            <AlertTriangle size={24} className="text-amber-500" />
          </div>
          <h3 className="font-semibold text-gray-900 text-lg">{title}</h3>
          <p className="text-sm text-gray-600 mt-2">{message}</p>
        </div>
        <div className="flex gap-3 justify-center mt-6">
          <button onClick={onCancel} className="px-5 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            Annuler
          </button>
          <button onClick={onConfirm} className={`px-5 py-2.5 text-sm font-medium text-white rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 ${btnClass[variant]}`}>
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── QUICK STATS ───
const QuickStats = ({ stats, loading }: { stats: CommunicationStats | null; loading: boolean }) => {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
            <div className="h-8 w-16 bg-gray-200 rounded mb-2" />
            <div className="h-4 w-20 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const items = [
    { label: 'Emails envoyés', value: stats.totalEnvoyes, color: 'text-palmier-600', bg: 'bg-palmier-50', icon: <Mail size={18} /> },
    { label: `Ouverts (${stats.tauxOuverture}%)`, value: stats.ouverts, color: 'text-blue-600', bg: 'bg-blue-50', icon: <Eye size={18} /> },
    { label: 'En attente', value: stats.enAttente, color: 'text-amber-600', bg: 'bg-amber-50', icon: <Clock size={18} /> },
    { label: 'Échecs', value: stats.echecs, color: 'text-red-600', bg: 'bg-red-50', icon: <XCircle size={18} /> }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((item, i) => (
        <div
          key={i}
          className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-default"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-2xl font-bold text-gray-900">{item.value}</p>
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                {item.icon}
                {item.label}
              </p>
            </div>
            <div className={`p-2 rounded-xl ${item.bg}`}>
              <span className={item.color}>{item.icon}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ============================================
// TAB : MESSAGES
// ============================================

const MessagesTab = ({
  messages,
  loading,
  onRefresh,
  onSend,
  onReessayer,
  onDelete
}: {
  messages: MessageEmail[];
  loading: boolean;
  onRefresh: () => void;
  onSend: () => void;
  onReessayer: (id: number) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('TOUS');
  const [filterStatut, setFilterStatut] = useState<string>('TOUS');
  const [selectedMessage, setSelectedMessage] = useState<MessageEmail | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const filtered = messages.filter((m: MessageEmail) => {
    const matchSearch = m.destinataire.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        m.sujet.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = filterType === 'TOUS' || m.type === filterType;
    const matchStatut = filterStatut === 'TOUS' || m.statut === filterStatut;
    return matchSearch && matchType && matchStatut;
  });

  const handleReessayer = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await onReessayer(id);
  };

  const handleDeleteClick = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDelete(id);
  };

  const confirmDeleteMessage = async () => {
    if (confirmDelete) {
      await onDelete(confirmDelete);
      setConfirmDelete(null);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par email, sujet..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-palmier-500 text-gray-900 placeholder-gray-400 bg-gray-50 hover:bg-white transition-colors"
              />
            </div>
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-palmier-500 text-gray-700 bg-gray-50 hover:bg-white transition-colors"
          >
            <option value="TOUS">Tous les types</option>
            {Object.keys(TYPE_LABELS).map((key: string) => (
              <option key={key} value={key}>{TYPE_LABELS[key].label}</option>
            ))}
          </select>
          <select
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-palmier-500 text-gray-700 bg-gray-50 hover:bg-white transition-colors"
          >
            <option value="TOUS">Tous les statuts</option>
            <option value="ENVOYE">Envoyé</option>
            <option value="OUVERT">Ouvert</option>
            <option value="EN_ATTENTE">En attente</option>
            <option value="ECHEC">Échec</option>
          </select>
          <button
            onClick={onSend}
            className="px-4 py-2.5 bg-palmier-600 text-white rounded-xl text-sm hover:bg-palmier-700 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm shadow-palmier-200"
          >
            <Plus size={16} />
            Nouveau message
          </button>
          <button
            onClick={onRefresh}
            className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            title="Rafraîchir"
          >
            <RefreshCw size={16} className="text-gray-500" />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-100">
          {['TOUS', 'CONFIRMATION', 'RAPPEL_J7', 'REMERCIEMENT_J2', 'ANNULATION', 'RELANCE_PAIEMENT'].map((type: string) => {
            const count = messages.filter((m: MessageEmail) => type === 'TOUS' || m.type === type).length;
            const active = filterType === type;
            const label = type === 'TOUS' ? 'Tous' : (TYPE_LABELS[type]?.label || type);
            return (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1 text-xs rounded-full border transition-all hover:scale-105 ${
                  active
                    ? 'bg-palmier-500 text-white border-palmier-500 shadow-sm'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Inbox size={32} />}
            title="Aucun message"
            description={searchTerm || filterType !== 'TOUS' || filterStatut !== 'TOUS' ? 'Ajustez vos filtres' : 'Aucun email envoyé pour l\'instant'}
            action={
              <button
                onClick={onSend}
                className="px-4 py-2 bg-palmier-600 text-white rounded-xl text-sm hover:bg-palmier-700 flex items-center gap-2"
              >
                <Send size={16} /> Envoyer un message
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200">
                  <th className="px-4 py-3 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">Destinataire</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">Sujet</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">Statut</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600 text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((msg: MessageEmail) => (
                  <tr
                    key={msg.id}
                    className="hover:bg-gray-50/50 transition-colors cursor-pointer group"
                    onClick={() => { setSelectedMessage(msg); setShowDetails(true); }}
                  >
                    <td className="px-4 py-3 text-gray-700 text-sm">
                      {new Date(msg.dateEnvoi).toLocaleDateString('fr-FR')}
                      <br />
                      <span className="text-xs text-gray-400">{new Date(msg.dateEnvoi).toLocaleTimeString('fr-FR')}</span>
                    </td>
                    <td className="px-4 py-3"><TypeBadge type={msg.type} /></td>
                    <td className="px-4 py-3 text-gray-700 text-sm truncate max-w-[150px]">{msg.destinataire}</td>
                    <td className="px-4 py-3 text-gray-700 text-sm truncate max-w-[200px]">{msg.sujet}</td>
                    <td className="px-4 py-3"><StatutBadge statut={msg.statut} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedMessage(msg); setShowDetails(true); }}
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
                          title="Voir les détails"
                        >
                          <Eye size={15} />
                        </button>
                        {msg.statut === 'ECHEC' && (
                          <button
                            onClick={(e) => handleReessayer(msg.id, e)}
                            className="p-1.5 hover:bg-amber-50 rounded-lg transition-colors text-amber-500 hover:text-amber-700"
                            title="Réessayer l'envoi"
                          >
                            <RotateCw size={15} />
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDeleteClick(msg.id, e)}
                          className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100"
                          title="Supprimer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={showDetails}
        onClose={() => { setShowDetails(false); setSelectedMessage(null); }}
        title={
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-palmier-100 rounded-lg">
              <Mail size={16} className="text-palmier-600" />
            </div>
            <span>Détails du message</span>
            {selectedMessage && <TypeBadge type={selectedMessage.type} />}
          </div>
        }
        footer={
          <div className="flex justify-end gap-3">
            <button
              onClick={() => { setShowDetails(false); setSelectedMessage(null); }}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Fermer
            </button>
            {selectedMessage?.statut === 'ECHEC' && (
              <button
                onClick={() => { if (selectedMessage) onReessayer(selectedMessage.id); setShowDetails(false); }}
                className="px-4 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-xl flex items-center gap-2 transition-all hover:scale-105"
              >
                <RotateCw size={15} /> Réessayer
              </button>
            )}
            <button
              onClick={() => {
                if (selectedMessage) {
                  navigator.clipboard.writeText(selectedMessage.corps);
                  toast.success('Contenu copié dans le presse-papiers');
                }
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <Copy size={15} /> Copier
            </button>
          </div>
        }
      >
        {selectedMessage && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm bg-gray-50 p-4 rounded-xl">
              <div>
                <span className="text-gray-500 text-xs uppercase tracking-wide">Destinataire</span>
                <p className="font-medium text-gray-900 mt-0.5">{selectedMessage.destinataire}</p>
              </div>
              <div>
                <span className="text-gray-500 text-xs uppercase tracking-wide">Date d'envoi</span>
                <p className="font-medium text-gray-900 mt-0.5">{new Date(selectedMessage.dateEnvoi).toLocaleString('fr-FR')}</p>
              </div>
              {selectedMessage.ouvertLe && (
                <div>
                  <span className="text-gray-500 text-xs uppercase tracking-wide">Lu le</span>
                  <p className="font-medium text-gray-900 mt-0.5 flex items-center gap-1">
                    <CheckCircle size={14} className="text-green-500" />
                    {new Date(selectedMessage.ouvertLe).toLocaleString('fr-FR')}
                  </p>
                </div>
              )}
              {selectedMessage.erreurMessage && (
                <div className="col-span-2">
                  <span className="text-gray-500 text-xs uppercase tracking-wide">Erreur</span>
                  <p className="font-medium text-red-600 mt-0.5 bg-red-50 p-2 rounded-lg text-sm">{selectedMessage.erreurMessage}</p>
                </div>
              )}
            </div>
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">Sujet</span>
              <p className="text-sm font-medium text-gray-900 mt-1 p-3 bg-gray-50 rounded-xl">{selectedMessage.sujet}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">Corps du message</span>
              <div className="mt-1 p-4 bg-gray-50 rounded-xl text-sm text-gray-800 whitespace-pre-wrap font-sans border border-gray-100 max-h-[300px] overflow-y-auto">
                {selectedMessage.corps}
              </div>
            </div>
            {selectedMessage.modele && (
              <div className="flex items-center gap-2 text-xs text-gray-500 bg-blue-50 p-2 rounded-lg">
                <FileText size={12} className="text-blue-500" />
                Modèle utilisé : {selectedMessage.modele.nom}
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="Supprimer le message"
        message="Cette action est irréversible. Voulez-vous vraiment supprimer ce message ?"
        onConfirm={confirmDeleteMessage}
        onCancel={() => setConfirmDelete(null)}
        variant="danger"
      />
    </div>
  );
};

// ============================================
// TAB : MODÈLES
// ============================================

const ModelesTab = ({
  modeles,
  loading,
  onRefresh,
  onUpdate,
  onValidate,
  onCreate,
  onDelete
}: {
  modeles: ModeleMessage[];
  loading: boolean;
  onRefresh: () => void;
  onUpdate: (modele: ModeleMessage) => Promise<void>;
  onValidate: (id: number) => Promise<void>;
  onCreate: () => void;
  onDelete: (id: number) => Promise<void>;
}) => {
  const [selectedModele, setSelectedModele] = useState<ModeleMessage | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<ModeleMessage | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const handleEdit = (modele: ModeleMessage) => {
    setIsEditing(true);
    setEditData({ ...modele });
  };

  const handleSave = async () => {
    if (!editData) return;
    setSaving(true);
    try {
      await onUpdate(editData);
      toast.success('Modèle sauvegardé avec succès');
      setIsEditing(false);
      setSelectedModele(editData);
      onRefresh();
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleValidate = async () => {
    if (!selectedModele) return;
    try {
      await onValidate(selectedModele.id);
      toast.success('Modèle validé avec succès');
      onRefresh();
    } catch {
      toast.error('Erreur lors de la validation');
    }
  };

  const handleDelete = async (id: number) => {
    await onDelete(id);
    setConfirmDelete(null);
    if (selectedModele?.id === id) {
      setSelectedModele(null);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <FileText size={16} className="text-palmier-600" />
            Modèles disponibles
            <span className="text-xs text-gray-400 font-normal">({modeles.length})</span>
          </h3>
          <button
            onClick={onCreate}
            className="p-1.5 bg-palmier-600 text-white rounded-lg hover:bg-palmier-700 transition-all hover:scale-105"
            title="Créer un modèle"
          >
            <Plus size={16} />
          </button>
        </div>
        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
          {modeles.map((modele: ModeleMessage) => (
            <div
              key={modele.id}
              onClick={() => { setSelectedModele(modele); setIsEditing(false); }}
              className={`p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                selectedModele?.id === modele.id
                  ? 'border-palmier-500 bg-palmier-50 shadow-sm ring-1 ring-palmier-200'
                  : 'border-gray-200 hover:border-palmier-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">{modele.nom}</p>
                  <p className="text-xs text-gray-500">{modele.variables.length} variables</p>
                </div>
                {modele.valide ? (
                  <span className="flex items-center gap-1 text-green-600 text-xs bg-green-50 px-2 py-0.5 rounded-full">
                    <CheckCircle size={12} /> Validé
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-600 text-xs bg-amber-50 px-2 py-0.5 rounded-full">
                    <AlertCircle size={12} /> En attente
                  </span>
                )}
              </div>
              <div className="flex justify-between items-center mt-1.5">
                <TypeBadge type={modele.type} />
                <span className="text-xs text-gray-400">
                  {new Date(modele.dateModification).toLocaleDateString('fr-FR')}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
          <p className="text-xs text-gray-700 flex items-center gap-1.5">
            <AlertCircle size={14} className="text-blue-500 shrink-0" />
            <span>RG6 : Les modèles doivent être validés par la gérante</span>
          </p>
        </div>
      </div>

      <div className="lg:col-span-2">
        {selectedModele ? (
          <div className="bg-white rounded-xl border border-gray-200 p-5 transition-all duration-200">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <Edit size={18} className="text-palmier-600" />
                ) : (
                  <BookOpen size={18} className="text-palmier-600" />
                )}
                <h3 className="font-semibold text-gray-800">
                  {isEditing ? 'Édition' : selectedModele.nom}
                </h3>
                {selectedModele.valide && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
                    <CheckCircle size={10} /> Validé
                  </span>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setPreviewMode(!previewMode)}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5"
                >
                  {previewMode ? <Edit size={14} /> : <Eye size={14} />}
                  {previewMode ? 'Éditer' : 'Aperçu'}
                </button>
                {!isEditing && (
                  <button
                    onClick={() => handleEdit(selectedModele)}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5"
                  >
                    <Edit size={14} /> Modifier
                  </button>
                )}
                {isEditing && (
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-3 py-1.5 text-sm bg-palmier-600 text-white rounded-lg hover:bg-palmier-700 transition-colors flex items-center gap-1.5 disabled:opacity-50 hover:scale-105"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                  </button>
                )}
                {!selectedModele.valide && !isEditing && (
                  <button
                    onClick={handleValidate}
                    className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1.5 hover:scale-105"
                  >
                    <Check size={14} /> Valider
                  </button>
                )}
                <button
                  onClick={() => setConfirmDelete(selectedModele.id)}
                  className="px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1.5"
                >
                  <Trash2 size={14} /> Supprimer
                </button>
              </div>
            </div>

            {previewMode ? (
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-2">
                    <Mail size={14} className="text-palmier-400" />
                    Sujet :
                  </div>
                  <p className="text-base font-medium text-gray-900 bg-gray-50 p-2 rounded-lg">{selectedModele.sujet}</p>
                  <div className="mt-4 border-t border-gray-200 pt-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-2">
                      <FileText size={14} className="text-palmier-400" />
                      Corps du message :
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                        {selectedModele.corps}
                      </pre>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1.5 pt-3 border-t border-gray-200">
                    <span className="text-xs text-gray-500 mr-1 flex items-center gap-1">
                      <Tag size={12} /> Variables disponibles :
                    </span>
                    {selectedModele.variables.map((v: string) => (
                      <span key={v} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200 font-mono">
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                  <Sparkles size={12} className="text-palmier-400" />
                  Les variables seront remplacées automatiquement par les données du client
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nom du modèle</label>
                  <input
                    type="text"
                    value={isEditing && editData ? editData.nom : selectedModele.nom}
                    onChange={(e) => isEditing && editData && setEditData({ ...editData, nom: e.target.value })}
                    className={`w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-palmier-500 text-gray-900 transition-colors ${!isEditing ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}`}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <select
                    value={isEditing && editData ? editData.type : selectedModele.type}
                    onChange={(e) => isEditing && editData && setEditData({ ...editData, type: e.target.value as TypeMessage })}
                    className={`w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-palmier-500 text-gray-900 transition-colors ${!isEditing ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}`}
                    disabled={!isEditing}
                  >
                    {Object.keys(TYPE_LABELS).map((key: string) => (
                      <option key={key} value={key}>{TYPE_LABELS[key].label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Sujet</label>
                  <input
                    type="text"
                    value={isEditing && editData ? editData.sujet : selectedModele.sujet}
                    onChange={(e) => isEditing && editData && setEditData({ ...editData, sujet: e.target.value })}
                    className={`w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-palmier-500 text-gray-900 transition-colors ${!isEditing ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}`}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Corps du message</label>
                  <textarea
                    value={isEditing && editData ? editData.corps : selectedModele.corps}
                    onChange={(e) => isEditing && editData && setEditData({ ...editData, corps: e.target.value })}
                    rows={10}
                    className={`w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-palmier-500 font-mono text-sm text-gray-900 transition-colors ${!isEditing ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}`}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Variables disponibles</label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {(isEditing && editData ? editData : selectedModele).variables.map((v: string) => (
                      <span key={v} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200 font-mono">
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
                {isEditing && (
                  <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-xl border border-yellow-200">
                    <AlertCircle size={16} className="text-yellow-600 shrink-0" />
                    <span className="text-xs text-yellow-700">
                      ⚠️ Toute modification sera historisée (RG7) et devra être revalidée par la gérante
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="mx-auto w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
              <FileText size={32} className="text-gray-300" />
            </div>
            <h4 className="text-lg font-medium text-gray-700">Aucun modèle sélectionné</h4>
            <p className="text-sm text-gray-500 mt-1">Sélectionnez un modèle dans la liste pour l'éditer ou le visualiser</p>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="Supprimer le modèle"
        message="Cette action est irréversible. Voulez-vous vraiment supprimer ce modèle de message ?"
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
        variant="danger"
      />
    </div>
  );
};

// ============================================
// TAB : CONTACTS
// ============================================

const ContactsTab = ({
  contacts,
  loading,
  onRefresh,
  onSendToClient,
  onSendGroupe
}: {
  contacts: ContactClient[];
  loading: boolean;
  onRefresh: () => void;
  onSendToClient: (clientId: number) => void;
  onSendGroupe: (clientIds: number[]) => Promise<void>;
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState<string>('TOUS');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sendingGroupe, setSendingGroupe] = useState(false);

  const filtered = contacts.filter((c: ContactClient) => {
    const matchSearch = c.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        c.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        c.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatut = filterStatut === 'TOUS' || c.statut === filterStatut;
    return matchSearch && matchStatut;
  });

  const stats = {
    vip: contacts.filter((c: ContactClient) => c.statut === 'VIP').length,
    regulier: contacts.filter((c: ContactClient) => c.statut === 'REGULIER').length,
    nouveau: contacts.filter((c: ContactClient) => c.statut === 'NOUVEAU').length,
    total: contacts.length
  };

  const handleSendGroupeClick = async () => {
    const clientIds = filtered.map((c: ContactClient) => c.id);
    if (clientIds.length === 0) {
      toast('Aucun client sélectionné', { icon: 'ℹ️' });
      return;
    }
    setSendingGroupe(true);
    try {
      await onSendGroupe(clientIds);
    } finally {
      setSendingGroupe(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un contact..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-palmier-500 text-gray-900 placeholder-gray-400 bg-gray-50 hover:bg-white transition-colors"
              />
            </div>
          </div>
          <select
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-palmier-500 text-gray-700 bg-gray-50 hover:bg-white transition-colors"
          >
            <option value="TOUS">Tous les statuts</option>
            <option value="VIP">⭐ VIP</option>
            <option value="REGULIER">🔄 Régulier</option>
            <option value="NOUVEAU">🆕 Nouveau</option>
          </select>
          <div className="flex border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 text-sm transition-colors ${viewMode === 'grid' ? 'bg-palmier-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm transition-colors ${viewMode === 'list' ? 'bg-palmier-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <List size={16} />
            </button>
          </div>
          <button
            onClick={handleSendGroupeClick}
            disabled={sendingGroupe}
            className="px-4 py-2.5 bg-palmier-600 text-white rounded-xl text-sm hover:bg-palmier-700 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
          >
            {sendingGroupe ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            Envoyer à plusieurs
          </button>
          <button
            onClick={onRefresh}
            className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={16} className="text-gray-500" />
          </button>
        </div>

        <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-gray-500">Total :</span>
            <span className="font-semibold text-gray-900">{stats.total}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <Award size={14} className="text-purple-500" />
            <span className="font-semibold text-purple-600">{stats.vip}</span>
            <span className="text-gray-500">VIP</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <User size={14} className="text-blue-500" />
            <span className="font-semibold text-blue-600">{stats.regulier}</span>
            <span className="text-gray-500">Réguliers</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <User size={14} className="text-gray-400" />
            <span className="font-semibold text-gray-600">{stats.nouveau}</span>
            <span className="text-gray-500">Nouveaux</span>
          </div>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((contact: ContactClient) => (
            <div key={contact.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                    contact.statut === 'VIP' ? 'bg-gradient-to-br from-purple-500 to-purple-700' :
                    contact.statut === 'REGULIER' ? 'bg-gradient-to-br from-blue-500 to-blue-700' :
                    'bg-gradient-to-br from-gray-400 to-gray-600'
                  }`}>
                    {contact.prenom.charAt(0)}{contact.nom.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {contact.prenom} {contact.nom}
                    </h4>
                    <p className="text-sm text-gray-500 truncate max-w-[140px]">{contact.email}</p>
                  </div>
                </div>
                <StatutClientBadge statut={contact.statut} />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-gray-700">
                <div className="flex items-center gap-1.5">
                  <Phone size={14} className="text-gray-400" />
                  {contact.telephone}
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar size={14} className="text-gray-400" />
                  {contact.nbSejours} séjour{contact.nbSejours > 1 ? 's' : ''}
                </div>
                <div className="flex items-center gap-1.5 col-span-2">
                  <Euro size={14} className="text-gray-400" />
                  {contact.montantTotal}€ dépensés
                </div>
                {contact.preferences?.chambrePreferee && (
                  <div className="flex items-center gap-1.5 col-span-2 text-xs text-gray-500">
                    <Star size={12} className="text-gray-400" />
                    Chambre préférée : {contact.preferences.chambrePreferee}
                  </div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                <button
                  onClick={() => onSendToClient(contact.id)}
                  className="flex-1 px-3 py-1.5 bg-palmier-50 text-palmier-700 text-sm rounded-lg hover:bg-palmier-100 transition-colors flex items-center justify-center gap-1.5 group-hover:scale-105"
                >
                  <Mail size={14} />
                  Envoyer
                </button>
                <button className="px-3 py-1.5 border border-gray-200 text-sm rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5">
                  <Eye size={14} />
                  Voir
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200">
                  <th className="px-4 py-3 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">Client</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">Téléphone</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">Séjours</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">Dépensé</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">Statut</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600 text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((contact: ContactClient) => (
                  <tr key={contact.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                          contact.statut === 'VIP' ? 'bg-purple-500' :
                          contact.statut === 'REGULIER' ? 'bg-blue-500' : 'bg-gray-400'
                        }`}>
                          {contact.prenom.charAt(0)}{contact.nom.charAt(0)}
                        </div>
                        <span className="font-medium text-gray-900">{contact.prenom} {contact.nom}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{contact.email}</td>
                    <td className="px-4 py-3 text-gray-700">{contact.telephone}</td>
                    <td className="px-4 py-3 text-gray-700">{contact.nbSejours}</td>
                    <td className="px-4 py-3 text-gray-700">{contact.montantTotal}€</td>
                    <td className="px-4 py-3"><StatutClientBadge statut={contact.statut} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onSendToClient(contact.id)}
                          className="p-1.5 hover:bg-palmier-50 rounded-lg transition-colors text-gray-400 hover:text-palmier-600"
                          title="Envoyer un message"
                        >
                          <Mail size={15} />
                        </button>
                        <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600" title="Voir les détails">
                          <Eye size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <EmptyState
          icon={<Users size={32} />}
          title="Aucun contact"
          description={searchTerm || filterStatut !== 'TOUS' ? 'Ajustez vos filtres' : 'Aucun client dans la base'}
        />
      )}
    </div>
  );
};

// ============================================
// PAGE PRINCIPALE
// ============================================

const CommunicationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'messages' | 'modeles' | 'contacts'>('messages');
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<MessageEmail[]>([]);
  const [modeles, setModeles] = useState<ModeleMessage[]>([]);
  const [contacts, setContacts] = useState<ContactClient[]>([]);
  const [stats, setStats] = useState<CommunicationStats | null>(null);

  // ─── ÉTATS NOUVEAU MESSAGE ───
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [newMessageForm, setNewMessageForm] = useState({
    clientId: '',
    modeleId: '',
    sujet: '',
    corps: '',
    type: 'MANUEL' as TypeMessage,
    reservationId: ''
  });
  const [sendingMessage, setSendingMessage] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ContactClient | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [clientSearchResults, setClientSearchResults] = useState<ContactClient[]>([]);
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  const tabs = useMemo(() => [
    { id: 'messages', label: 'Messages', icon: <Inbox size={18} />, count: messages.length },
    { id: 'modeles', label: 'Modèles', icon: <FileText size={18} />, count: modeles.length },
    { id: 'contacts', label: 'Contacts', icon: <Users size={18} />, count: contacts.length },
  ], [messages.length, modeles.length, contacts.length]);

  // ─── CHARGEMENT DES DONNÉES ───
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [messagesRes, modelesRes, statsRes, contactsRes] = await Promise.all([
        communicationService.getHistorique(),
        communicationService.getModeles(),
        communicationService.getStats(),
        clientService.getAll({ limit: 100 })
      ]);

      if (messagesRes.success && messagesRes.data) {
        setMessages(messagesRes.data);
      }

      if (modelesRes.success && modelesRes.data) {
        setModeles(modelesRes.data);
      } else {
        setModeles([]);
      }

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }

      if (contactsRes.success && contactsRes.data) {
        const transformedContacts: ContactClient[] = contactsRes.data.map((c: any) => ({
          id: c.id,
          nom: c.nom,
          prenom: c.prenom,
          email: c.email || '',
          telephone: c.telephone || '',
          nbSejours: c.nb_sejours_realises || 0,
          dernierContact: new Date(c.date_creation || Date.now()),
          statut: c.statut || 'NOUVEAU',
          montantTotal: c.montant_total_paye || 0,
          canalAcquisition: c.canal_acquisition || 'DIRECT',
          segment: c.segment || 'TOURISTE_INDIVIDUEL',
          preferences: {
            chambrePreferee: c.chambre_preferee,
            allergies: c.allergies ? c.allergies.split(',') : [],
            regimeAlimentaire: c.regime_alimentaire
          }
        }));
        setContacts(transformedContacts);
      } else {
        setContacts([]);
      }
    } catch (error) {
      console.error('Erreur chargement données:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── RECHERCHE DE CLIENTS ───
  const searchClients = useCallback(async (query: string) => {
    if (query.length < 2) {
      setClientSearchResults([]);
      return;
    }
    try {
      const res = await clientService.getAll({ search: query, limit: 10 });
      if (res.success && res.data) {
        const transformed = res.data.map((c: any) => ({
          id: c.id,
          nom: c.nom,
          prenom: c.prenom,
          email: c.email || '',
          telephone: c.telephone || '',
          nbSejours: c.nb_sejours_realises || 0,
          dernierContact: new Date(c.date_creation || Date.now()),
          statut: c.statut || 'NOUVEAU',
          montantTotal: c.montant_total_paye || 0,
          canalAcquisition: c.canal_acquisition || 'DIRECT',
          segment: c.segment || 'TOURISTE_INDIVIDUEL',
          preferences: {
            chambrePreferee: c.chambre_preferee,
            allergies: c.allergies ? c.allergies.split(',') : [],
            regimeAlimentaire: c.regime_alimentaire
          }
        }));
        setClientSearchResults(transformed);
        setShowClientDropdown(true);
      }
    } catch (error) {
      console.error('Erreur recherche clients:', error);
    }
  }, []);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (clientSearch.length >= 2) {
        searchClients(clientSearch);
      }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [clientSearch, searchClients]);

  // ─── SÉLECTION D'UN CLIENT ───
  const selectClient = (client: ContactClient) => {
    setSelectedClient(client);
    setNewMessageForm(prev => ({ ...prev, clientId: String(client.id) }));
    setClientSearch(`${client.prenom} ${client.nom}`);
    setShowClientDropdown(false);
  };

  // ─── APPLICATION D'UN MODÈLE ───
  const applyModele = (modeleId: string) => {
    const modele = modeles.find(m => m.id === parseInt(modeleId));
    if (modele) {
      setNewMessageForm(prev => ({
        ...prev,
        modeleId: modeleId,
        sujet: modele.sujet,
        corps: modele.corps,
        type: modele.type
      }));
      toast.success(`Modèle "${modele.nom}" appliqué avec succès`);
    }
  };

  // ─── ENVOI DU MESSAGE ───
  const handleSendNewMessage = async () => {
    if (!newMessageForm.clientId || !newMessageForm.sujet || !newMessageForm.corps) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setSendingMessage(true);
    try {
      const response = await communicationService.envoyerEmail({
        clientId: parseInt(newMessageForm.clientId),
        reservationId: newMessageForm.reservationId ? parseInt(newMessageForm.reservationId) : undefined,
        messageId: newMessageForm.modeleId ? parseInt(newMessageForm.modeleId) : undefined,
        type: newMessageForm.type,
        sujet: newMessageForm.sujet,
        corps: newMessageForm.corps
      });

      if (response.success) {
        toast.success('📧 Message envoyé avec succès !');
        setShowNewMessageModal(false);
        setNewMessageForm({ clientId: '', modeleId: '', sujet: '', corps: '', type: 'MANUEL', reservationId: '' });
        setSelectedClient(null);
        setClientSearch('');
        await loadData();
      } else {
        toast.error(response.message || 'Erreur lors de l\'envoi du message');
      }
    } catch (error) {
      console.error('Erreur envoi message:', error);
      toast.error('Erreur lors de l\'envoi du message');
    } finally {
      setSendingMessage(false);
    }
  };

  // ─── ACTIONS ───

  const handleSendMessage = () => {
    setShowNewMessageModal(true);
  };

  const handleSendToClient = (clientId: number) => {
    const client = contacts.find(c => c.id === clientId);
    if (client) {
      setSelectedClient(client);
      setNewMessageForm(prev => ({ ...prev, clientId: String(client.id) }));
      setClientSearch(`${client.prenom} ${client.nom}`);
      setShowNewMessageModal(true);
    }
  };

  const handleSendGroupe = async (clientIds: number[]) => {
    try {
      const response = await communicationService.envoyerRelanceGroupe(clientIds);
      if (response.success) {
        toast.success(response.message || `${response.count} relance(s) envoyée(s) avec succès`);
        await loadData();
      } else {
        toast.error(response.message || 'Erreur lors de l\'envoi groupé');
      }
    } catch (error) {
      console.error('Erreur envoi groupé:', error);
      toast.error('Erreur lors de l\'envoi groupé');
    }
  };

  const handleUpdateModele = async (modele: ModeleMessage) => {
    const response = await communicationService.updateModele(modele.id, modele);
    if (response.success) {
      await loadData();
    } else {
      throw new Error('Erreur lors de la mise à jour');
    }
  };

  const handleValidateModele = async (id: number) => {
    const response = await communicationService.validerModele(id);
    if (!response.success) {
      throw new Error('Erreur lors de la validation');
    }
  };

  const handleReessayer = async (id: number) => {
    try {
      const response = await communicationService.reessayerEnvoi(id);
      if (response.success) {
        toast.success('📧 Réessai effectué avec succès');
        await loadData();
      } else {
        toast.error(response.message || 'Erreur lors du réessai');
      }
    } catch {
      toast.error('Erreur lors du réessai');
    }
  };

  const handleCreateModele = async () => {
    try {
      const newModele: Omit<ModeleMessage, 'id'> = {
        nom: 'Nouveau modèle',
        type: 'MANUEL',
        sujet: 'Sujet du modèle',
        corps: 'Corps du modèle...',
        variables: [],
        dateModification: new Date(),
        valide: false,
        validePar: undefined,
        creePar: 1,
        dateCreation: new Date()
      };
      const response = await communicationService.createModele(newModele);
      if (response.success) {
        toast.success('Modèle créé avec succès');
        await loadData();
      } else {
        toast.error(response.message || 'Erreur lors de la création');
      }
    } catch (error) {
      console.error('Erreur création modèle:', error);
      toast.error('Erreur lors de la création du modèle');
    }
  };

  const handleDeleteModele = async (id: number) => {
    try {
      const response = await communicationService.deleteModele(id);
      if (response.success) {
        toast.success('Modèle supprimé avec succès');
        await loadData();
      } else {
        toast.error(response.message || 'Erreur lors de la suppression');
      }
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleDeleteMessage = async (id: number) => {
    try {
      const response = await communicationService.deleteMessage(id);
      if (response.success) {
        toast.success('Message supprimé avec succès');
        await loadData();
      } else {
        toast.error(response.message || 'Erreur lors de la suppression');
      }
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/60 p-4 lg:p-6 space-y-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-palmier-100 to-palmier-200 rounded-xl">
              <MessageSquare size={24} className="text-palmier-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                Communication
                <span className="text-xs font-normal bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                  {messages.length + modeles.length + contacts.length} éléments
                </span>
              </h1>
              <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
                Historique des envois · Modèles de messages · Contacts clients
                <span className="text-xs bg-palmier-50 text-palmier-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles size={10} />
                  RG6 - Modèles validés par la gérante
                </span>
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={loadData}
          className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2"
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          <span className="text-sm text-gray-600">Rafraîchir</span>
        </button>
      </div>

      <QuickStats stats={stats} loading={loading} />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="border-b border-gray-200 px-2 bg-gray-50/50">
          <nav className="flex space-x-1" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`
                  flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-all
                  ${activeTab === tab.id
                    ? 'border-palmier-600 text-palmier-600 bg-white -mb-px'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-white/50'
                  }
                `}
              >
                {tab.icon}
                {tab.label}
                <span className={`
                  ml-1 px-2 py-0.5 text-xs rounded-full
                  ${activeTab === tab.id
                    ? 'bg-palmier-100 text-palmier-700'
                    : 'bg-gray-100 text-gray-500'
                  }
                `}>
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'messages' && (
            <MessagesTab
              messages={messages}
              loading={loading}
              onRefresh={loadData}
              onSend={handleSendMessage}
              onReessayer={handleReessayer}
              onDelete={handleDeleteMessage}
            />
          )}
          {activeTab === 'modeles' && (
            <ModelesTab
              modeles={modeles}
              loading={loading}
              onRefresh={loadData}
              onUpdate={handleUpdateModele}
              onValidate={handleValidateModele}
              onCreate={handleCreateModele}
              onDelete={handleDeleteModele}
            />
          )}
          {activeTab === 'contacts' && (
            <ContactsTab
              contacts={contacts}
              loading={loading}
              onRefresh={loadData}
              onSendToClient={handleSendToClient}
              onSendGroupe={handleSendGroupe}
            />
          )}
        </div>
      </div>

      {/* ─── MODALE NOUVEAU MESSAGE ─── */}
      <Modal
        isOpen={showNewMessageModal}
        onClose={() => { setShowNewMessageModal(false); setSelectedClient(null); setClientSearch(''); }}
        title={
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-palmier-100 rounded-lg">
              <Send size={16} className="text-palmier-600" />
            </div>
            <span>Nouveau message</span>
          </div>
        }
        size="xl"
        footer={
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => { setShowNewMessageModal(false); setSelectedClient(null); setClientSearch(''); }}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSendNewMessage}
              disabled={sendingMessage || !newMessageForm.clientId || !newMessageForm.sujet || !newMessageForm.corps}
              className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-palmier-600 to-palmier-700 hover:from-palmier-700 hover:to-palmier-800 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2 shadow-lg shadow-palmier-200"
            >
              {sendingMessage ? (
                <><Loader2 size={15} className="animate-spin" />Envoi en cours…</>
              ) : (
                <><Send size={15} />Envoyer</>
              )}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Sélection du client */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Client * <span className="text-xs text-gray-400">(recherche par nom, prénom, email)</span>
            </label>
            <div className="relative">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Rechercher un client..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    onFocus={() => clientSearch.length >= 2 && setShowClientDropdown(true)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-palmier-500 text-gray-900 placeholder-gray-400"
                  />
                </div>
                {selectedClient && (
                  <button
                    onClick={() => { setSelectedClient(null); setClientSearch(''); setNewMessageForm(prev => ({ ...prev, clientId: '' })); }}
                    className="px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl border border-red-200 transition-colors"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              {showClientDropdown && clientSearchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                  {clientSearchResults.map((client) => (
                    <button
                      key={client.id}
                      onClick={() => selectClient(client)}
                      className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 border-b border-gray-100 last:border-0"
                    >
                      <div className="w-8 h-8 rounded-full bg-palmier-100 flex items-center justify-center text-palmier-600 font-semibold text-xs">
                        {client.prenom.charAt(0)}{client.nom.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-sm">{client.prenom} {client.nom}</p>
                        <p className="text-xs text-gray-500">{client.email}</p>
                      </div>
                      <StatutClientBadge statut={client.statut} />
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedClient && (
              <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
                <CheckCircle size={16} className="text-green-500" />
                <span className="text-sm text-green-700">
                  Client sélectionné : <strong>{selectedClient.prenom} {selectedClient.nom}</strong> ({selectedClient.email})
                </span>
              </div>
            )}
          </div>

          {/* Sélection du modèle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Modèle (optionnel)</label>
            <select
              value={newMessageForm.modeleId}
              onChange={(e) => applyModele(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-palmier-500 text-gray-700 bg-white"
            >
              <option value="">Sélectionner un modèle</option>
              {modeles.filter((m) => m.valide).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nom} ✅
                </option>
              ))}
              {modeles.filter((m) => !m.valide).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nom} ⏳ (en attente)
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              💡 Les modèles validés ✅ sont prêts à l'emploi. Les modèles en attente ⏳ doivent être validés par la gérante.
            </p>
          </div>

          {/* Type de message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Type de message</label>
            <select
              value={newMessageForm.type}
              onChange={(e) => setNewMessageForm((prev) => ({ ...prev, type: e.target.value as TypeMessage }))}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-palmier-500 text-gray-700 bg-white"
            >
              {Object.keys(TYPE_LABELS).map((key) => (
                <option key={key} value={key}>
                  {TYPE_LABELS[key].label}
                </option>
              ))}
            </select>
          </div>

          {/* Sujet */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Sujet *</label>
            <input
              type="text"
              value={newMessageForm.sujet}
              onChange={(e) => setNewMessageForm((prev) => ({ ...prev, sujet: e.target.value }))}
              placeholder="Sujet du message..."
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-palmier-500 text-gray-900 placeholder-gray-400"
            />
          </div>

          {/* Corps du message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Corps du message *</label>
            <textarea
              value={newMessageForm.corps}
              onChange={(e) => setNewMessageForm((prev) => ({ ...prev, corps: e.target.value }))}
              rows={8}
              placeholder="Écrivez votre message ici..."
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-palmier-500 text-gray-900 placeholder-gray-400 resize-none"
            />
            <div className="mt-1 text-xs text-gray-400 flex items-center gap-2 flex-wrap">
              <Tag size={12} />
              Variables disponibles :
              <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">client_prenom</span>
              <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">client_nom</span>
              <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">nom_gite</span>
              <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">date_arrivee</span>
              <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">date_depart</span>
              <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">chambre_nom</span>
              <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">montant_total</span>
            </div>
          </div>

          {/* Numéro de réservation (optionnel) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">N° de réservation (optionnel)</label>
            <input
              type="text"
              value={newMessageForm.reservationId}
              onChange={(e) => setNewMessageForm((prev) => ({ ...prev, reservationId: e.target.value }))}
              placeholder="Ex: RES-0001"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-palmier-500 text-gray-900 placeholder-gray-400"
            />
          </div>
        </div>
      </Modal>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slideUp 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default React.memo(CommunicationPage);