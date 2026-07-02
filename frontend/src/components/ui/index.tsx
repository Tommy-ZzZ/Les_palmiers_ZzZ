// ============================================================
// Composants UI réutilisables
// ============================================================

import React from 'react';
import { X } from 'lucide-react';
import { StatutReservation, StatutClient, StatutPaiement } from '../../types';

// ---- BADGE ----
interface BadgeProps {
  children: React.ReactNode;
  label?: string;
  variant?: 'green' | 'red' | 'blue' | 'yellow' | 'gray' | 'purple' | 'orange' | 'success' | 'warning' | 'danger' | 'default';
  className?: string;
}
export function Badge({ children, label, variant = 'gray', className = '' }: BadgeProps) {
  const variants = {
    green:  'bg-green-100 text-green-800',
    red:    'bg-red-100 text-red-800',
    blue:   'bg-blue-100 text-blue-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    gray:   'bg-gray-100 text-gray-800',
    purple: 'bg-purple-100 text-purple-800',
    orange: 'bg-orange-100 text-orange-800',
    success:'bg-green-100 text-green-800',
    warning:'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    default:'bg-gray-100 text-gray-800',
  };
  return (
    <span className={`badge ${variants[variant]} ${className}`}>
      {children ?? label}
    </span>
  );
}

// ---- STATUT RÉSERVATION ----
export function StatutReservationBadge({ statut }: { statut: StatutReservation }) {
  const map: Record<StatutReservation, { label: string; variant: BadgeProps['variant'] }> = {
    EN_ATTENTE_ACOMPTE: { label: 'Attente acompte', variant: 'yellow' },
    CONFIRMEE:          { label: 'Confirmée',        variant: 'green' },
    EN_COURS:           { label: 'En cours',         variant: 'blue' },
    TERMINEE:           { label: 'Terminée',         variant: 'gray' },
    ANNULEE:            { label: 'Annulée',          variant: 'red' },
    NO_SHOW:            { label: 'No-show',          variant: 'orange' },
  };
  const { label, variant } = map[statut] || { label: statut, variant: 'gray' };
  return <Badge variant={variant}>{label}</Badge>;
}

// ---- STATUT CLIENT ----
export function StatutClientBadge({ statut }: { statut: StatutClient }) {
  const map: Record<StatutClient, { label: string; variant: BadgeProps['variant'] }> = {
    NOUVEAU:  { label: 'Nouveau',  variant: 'blue' },
    REGULIER: { label: 'Régulier', variant: 'green' },
    VIP:      { label: '⭐ VIP',   variant: 'purple' },
  };
  const { label, variant } = map[statut] || { label: statut, variant: 'gray' };
  return <Badge variant={variant}>{label}</Badge>;
}

// ---- STATUT PAIEMENT ----
export function StatutPaiementBadge({ statut }: { statut: StatutPaiement }) {
  const map: Record<StatutPaiement, { label: string; variant: BadgeProps['variant'] }> = {
    ACOMPTE_EN_ATTENTE: { label: 'Acompte attendu', variant: 'yellow' },
    ACOMPTE_RECU:       { label: 'Acompte reçu',   variant: 'blue' },
    SOLDE_PARTIEL:      { label: 'Solde partiel',   variant: 'orange' },
    SOLDE_COMPLET:      { label: 'Soldé',           variant: 'green' },
  };
  const { label, variant } = map[statut] || { label: statut, variant: 'gray' };
  return <Badge variant={variant}>{label}</Badge>;
}

// ---- SPINNER ----
export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-spin rounded-full h-6 w-6 border-2 border-palmier-200 border-t-palmier-600 ${className}`} />
  );
}

// ---- MODAL ----
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  footer?: React.ReactNode;
}
export function Modal({ isOpen, onClose, title, children, size = 'md', footer }: ModalProps) {
  if (!isOpen) return null;
  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl', '2xl': 'max-w-6xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-xl shadow-xl w-full ${sizes[size]} max-h-[90vh] overflow-y-auto animate-fade-in`}>
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        <div className="p-6">{children}</div>
        {footer && <div className="px-6 pb-6">{footer}</div>}
      </div>
    </div>
  );
}

// ---- CONFIRM DIALOG ----
interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
}
export function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel, confirmLabel = 'Confirmer', variant = 'danger' }: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} size="sm">
      <p className="text-gray-600 mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <button className="btn-secondary" onClick={onCancel}>Annuler</button>
        <button
          className={variant === 'danger'
            ? 'btn-danger'
            : variant === 'warning'
              ? 'inline-flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg font-medium hover:bg-yellow-600 transition-colors'
              : 'inline-flex items-center gap-2 px-4 py-2 bg-palmier-600 text-white rounded-lg font-medium hover:bg-palmier-700 transition-colors'}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

// ---- EMPTY STATE ----
export function EmptyState({ title, description, icon }: { title: string; description?: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="mb-4 text-gray-400">{icon}</div>}
      <p className="text-gray-500 font-medium">{title}</p>
      {description && <p className="text-gray-400 text-sm mt-1">{description}</p>}
    </div>
  );
}

// ---- STAT CARD ----
interface StatCardProps {
  label?: string;
  title?: string;
  value: string | number;
  sub?: string;
  color?: 'green' | 'blue' | 'yellow' | 'red' | 'purple' | 'palmier' | 'sable' | 'success' | 'warning' | 'danger';
  icon?: React.ReactNode;
}
export function StatCard({ label, title, value, sub, color = 'green', icon }: StatCardProps) {
  const heading = label ?? title ?? '';
  const colors = {
    green:  'text-palmier-700 bg-palmier-50',
    blue:   'text-blue-700 bg-blue-50',
    yellow: 'text-yellow-700 bg-yellow-50',
    red:    'text-red-700 bg-red-50',
    purple: 'text-purple-700 bg-purple-50',
    palmier:'text-palmier-700 bg-palmier-50',
    sable:  'text-amber-700 bg-amber-50',
    success:'text-green-700 bg-green-50',
    warning:'text-yellow-700 bg-yellow-50',
    danger: 'text-red-700 bg-red-50',
  };
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{heading}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        {icon && (
          <div className={`p-2.5 rounded-lg ${colors[color]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- PAGINATION ----
interface PaginationProps {
  page: number;
  pages: number;
  total: number;
  onPageChange: (page: number) => void;
  currentPage?: number;
  totalPages?: number;
}
export function Pagination({ page, pages, total, onPageChange, currentPage, totalPages }: PaginationProps) {
  const resolvedPage = currentPage ?? page;
  const resolvedPages = totalPages ?? pages;
  const resolvedTotal = total ?? 0;
  if (resolvedPages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
      <span>{resolvedTotal} résultat{resolvedTotal > 1 ? 's' : ''}</span>
      <div className="flex gap-1">
        <button
          onClick={() => onPageChange(resolvedPage - 1)}
          disabled={resolvedPage <= 1}
          className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40"
        >
          ←
        </button>
        {Array.from({ length: Math.min(resolvedPages, 7) }, (_, i) => {
          const p = i + 1;
          return (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`px-3 py-1 rounded border transition-colors ${p === resolvedPage ? 'bg-palmier-600 text-white border-palmier-600' : 'border-gray-300 hover:bg-gray-50'}`}
            >
              {p}
            </button>
          );
        })}
        <button
          onClick={() => onPageChange(resolvedPage + 1)}
          disabled={resolvedPage >= resolvedPages}
          className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40"
        >
          →
        </button>
      </div>
    </div>
  );
}
