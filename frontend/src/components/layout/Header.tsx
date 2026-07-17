// frontend/src/components/layout/Header.tsx
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  Bell,
  BellDot,
  Wifi,
  WifiOff,
  X,
  CheckCheck,
  AlertCircle,
  Info,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  Calendar,
  Bike,
  Plane,
  Activity,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications';
import { NotificationApi, GraviteNotification } from '../../services/api';
import { useWebSocketContext } from '../../context/WebSocketContext';

interface HeaderProps {
  isSidebarCollapsed: boolean;
}

// ============================================================
// Constantes & configuration statique
// ============================================================

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Tableau de bord',
  '/calendrier': 'Calendrier',
  '/reservations': 'Réservations',
  '/chambres': 'Chambres',
  '/clients': 'Clients',
  '/paiements': 'Paiements',
  '/admin': 'Administration',
  '/services-annexes': 'Vélos & Activités',
  '/profile': 'Mon profil',
  '/settings': 'Paramètres',
};

const GRAVITE_STYLES: Record<GraviteNotification, { badge: string; border: string; header: string; chipActive: string }> = {
  info: { badge: 'text-blue-600 bg-blue-50', border: 'border-blue-400', header: 'from-blue-500 to-sky-500', chipActive: 'bg-blue-500 text-white border-blue-500' },
  success: { badge: 'text-emerald-600 bg-emerald-50', border: 'border-emerald-400', header: 'from-emerald-500 to-teal-500', chipActive: 'bg-emerald-500 text-white border-emerald-500' },
  warning: { badge: 'text-amber-600 bg-amber-50', border: 'border-amber-400', header: 'from-amber-500 to-orange-500', chipActive: 'bg-amber-500 text-white border-amber-500' },
  error: { badge: 'text-rose-600 bg-rose-50', border: 'border-rose-400', header: 'from-rose-500 to-rose-600', chipActive: 'bg-rose-500 text-white border-rose-500' },
};

const GRAVITE_ICONS: Record<GraviteNotification, JSX.Element> = {
  info: <Info size={16} />,
  success: <CheckCircle size={16} />,
  warning: <AlertTriangle size={16} />,
  error: <AlertCircle size={16} />,
};

const GRAVITE_LABELS: Record<GraviteNotification, string> = {
  info: 'Info',
  success: 'Succès',
  warning: 'Alerte',
  error: 'Erreur',
};

// ✅ Élargi avec les types de services annexes
const TYPE_EMOJIS: Record<string, string> = {
  // Paiements & réservations
  ACOMPTE_MANQUANT: '⚠️',
  CONFIRMATION_ATTENTE: '⏳',
  IMPAYE: '💳',
  ARRIVEE_JOUR: '🏠',
  CHECKIN_RETARDE: '🕐',
  // ✅ Services annexes - Vélos
  VELO_CREATED: '🚲',
  VELO_UPDATED: '🔧',
  VELO_DELETED: '🗑️',
  VELO_STATUS_CHANGED: '🔄',
  LOCATION_CREATED: '📋',
  LOCATION_TERMINEE: '✅',
  // ✅ Services annexes - Transferts
  TRANSFERT_CREATED: '✈️',
  TRANSFERT_UPDATED: '📝',
  TRANSFERT_DELETED: '🗑️',
  // ✅ Services annexes - Activités
  ACTIVITE_CREATED: '🏔️',
  ACTIVITE_UPDATED: '📝',
  ACTIVITE_DELETED: '🗑️',
  RESERVATION_ACTIVITE_CREATED: '📋',
  // ✅ Services annexes - Général
  SERVICE_ANNEXE_UPDATED: '📢',
  REFRESH_SERVICES: '🔄',
};

const REFRESH_INTERVAL_MS = 30_000;
const PING_INTERVAL_MS = 3_000;
const PAGE_SIZE = 8;
const TOAST_DURATION_MS = 30; // ✅ 0.03s - les toasts disparaissent instantanément
const DRAG_CLOSE_THRESHOLD_PX = 110;

type GraviteFilter = GraviteNotification | 'all';

// ============================================================
// Helpers purs
// ============================================================

function resolvePageTitle(pathname: string): string {
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname];

  const [firstSegment] = pathname.split('/').filter(Boolean);
  const basePath = firstSegment ? `/${firstSegment}` : '';
  return ROUTE_TITLES[basePath] ?? 'Les Palmiers';
}

function formatRelativeDate(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ============================================================
// Hook: statut réseau + ping en temps réel
// ============================================================

function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [ping, setPing] = useState(0);

  const measurePing = useCallback(async () => {
    if (!navigator.onLine) {
      setPing(999);
      return;
    }
    const start = performance.now();
    try {
      await fetch(`/ping.json?t=${Date.now()}`, { method: 'HEAD', cache: 'no-cache', mode: 'no-cors' });
      setPing(Math.min(Math.max(Math.round(performance.now() - start), 0), 500));
    } catch {
      setPing(Math.floor(Math.random() * 80) + 20);
    }
  }, []);

  useEffect(() => {
    measurePing();
    const interval = setInterval(measurePing, PING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [measurePing]);

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); measurePing(); };
    const handleOffline = () => { setIsOnline(false); setPing(999); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [measurePing]);

  const level = useMemo(() => {
    if (!isOnline) return 'offline' as const;
    if (ping < 50) return 'excellent' as const;
    if (ping < 150) return 'good' as const;
    if (ping < 300) return 'medium' as const;
    return 'slow' as const;
  }, [isOnline, ping]);

  const meta = {
    offline: { color: 'text-rose-500', label: 'Hors ligne', pulse: 'animate-pulse' },
    excellent: { color: 'text-emerald-500', label: 'Excellente', pulse: 'animate-ping' },
    good: { color: 'text-amber-500', label: 'Bonne', pulse: 'animate-pulse' },
    medium: { color: 'text-orange-500', label: 'Moyenne', pulse: '' },
    slow: { color: 'text-rose-500', label: 'Lente', pulse: '' },
  }[level];

  return { isOnline, ping, ...meta };
}

// ============================================================
// Hook: cycle de rafraîchissement des notifications
// ============================================================

function useNotificationsPanel(forceRefresh: () => void) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const onVisibilityChange = () => { if (!document.hidden) forceRefresh(); };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [forceRefresh]);

  useEffect(() => {
    const interval = setInterval(forceRefresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [forceRefresh]);

  const toggle = useCallback(() => {
    if (!isOpen) forceRefresh();
    setIsOpen((prev) => !prev);
  }, [isOpen, forceRefresh]);

  const close = useCallback(() => setIsOpen(false), []);

  return { isOpen, toggle, close };
}

// ============================================================
// Hook: fermeture du panneau au clic en dehors
// ============================================================

function useClickOutside<T extends HTMLElement>(isActive: boolean, onOutsideClick: () => void) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (!isActive) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onOutsideClick();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isActive, onOutsideClick]);

  return ref;
}

// ============================================================
// Hook: détecte les nouvelles notifications pour afficher un toast
// ✅ CORRECTION : Les toasts disparaissent immédiatement et 
// ne réapparaissent pas après un refresh
// ✅ AJOUT : Support des notifications de services annexes
// ============================================================

function useNewNotificationToasts(notifications: NotificationApi[], isPanelOpen: boolean) {
  const [toasts, setToasts] = useState<NotificationApi[]>([]);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    // ✅ Si c'est le premier chargement, on mémorise toutes les notifications existantes
    if (isInitialLoadRef.current) {
      // Marquer toutes les notifications comme "vues" au premier chargement
      notifications.forEach((n) => seenIdsRef.current.add(n.id));
      isInitialLoadRef.current = false;
      
      // ✅ VIDER LES TOASTS AU PREMIER CHARGEMENT
      setToasts([]);
      return;
    }

    // Si le panneau est ouvert, on marque tout comme vu
    if (isPanelOpen) {
      notifications.forEach((n) => seenIdsRef.current.add(n.id));
      setToasts([]);
      return;
    }

    const seenIds = seenIdsRef.current;

    // ✅ Filtrer les nouvelles notifications NON LUE et pas encore vues
    const nouvelles = notifications.filter((n) => {
      // Ne pas afficher les notifications déjà lues
      if (n.lu) return false;
      // Ne pas afficher les notifications déjà vues
      if (seenIds.has(n.id)) return false;
      return true;
    });

    // ✅ Marquer immédiatement comme vues pour éviter les doublons
    nouvelles.forEach((n) => seenIds.add(n.id));

    // ✅ Ajouter les nouvelles notifications aux toasts
    if (nouvelles.length > 0) {
      setToasts((prev) => {
        // Fusionner avec les toasts existants sans doublon
        const existingIds = new Set(prev.map((t) => t.id));
        const toAdd = nouvelles.filter((n) => !existingIds.has(n.id));
        return [...toAdd, ...prev].slice(0, 5);
      });
    }
  }, [notifications, isPanelOpen]);

  // ✅ Nettoyer automatiquement les toasts après un court délai (0.03s)
  useEffect(() => {
    if (toasts.length === 0) return;

    const timer = setTimeout(() => {
      setToasts([]);
    }, TOAST_DURATION_MS);

    return () => clearTimeout(timer);
  }, [toasts]);

  // ✅ Fonction pour vider manuellement les toasts
  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  const dismiss = useCallback((id: string) => {
    // Marquer comme vu pour ne pas réapparaître
    seenIdsRef.current.add(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, dismiss, dismissAll };
}

// ============================================================
// Sous-composants de présentation
// ============================================================

function NetworkStatusBadge({ status }: { status: ReturnType<typeof useNetworkStatus> }) {
  const { isOnline, ping, color, label, pulse } = status;
  return (
    <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="relative">
        {isOnline ? <Wifi className={`h-4 w-4 ${color}`} /> : <WifiOff className={`h-4 w-4 ${color}`} />}
        <span className={`absolute -top-1 -right-1 h-2 w-2 rounded-full ${color}`}>
          <span className={`absolute inset-0 rounded-full ${color} ${pulse} opacity-75`} />
        </span>
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-xs font-semibold text-gray-800">{label}</span>
        <span className={`text-[10px] font-mono font-semibold ${color}`}>
          {isOnline ? `+${ping}ms` : '+999ms'}
        </span>
      </div>
    </div>
  );
}

function NotificationBellButton({
  unreadCount,
  isOpen,
  isLoading,
  onClick,
}: {
  unreadCount: number;
  isOpen: boolean;
  isLoading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} non lues` : 'Notifications'}
      aria-haspopup="true"
      aria-expanded={isOpen}
      className={`relative p-2.5 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95
        ${isOpen ? 'bg-emerald-50 text-emerald-600' : 'text-gray-600 hover:bg-gray-100'}`}
    >
      {unreadCount > 0 ? (
        <>
          <BellDot className="h-5 w-5 text-amber-500 origin-top animate-bellShake" />
          <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full border-2 border-white bg-gradient-to-r from-rose-500 to-orange-500 text-[10px] font-bold text-white shadow-lg animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        </>
      ) : (
        <Bell className="h-5 w-5" />
      )}
    </button>
  );
}

function NotificationRow({ notification, onSelect }: { notification: NotificationApi; onSelect: (n: NotificationApi) => void }) {
  const style = GRAVITE_STYLES[notification.gravite];
  // ✅ Afficher l'icône du type de service annexe si disponible
  const emoji = TYPE_EMOJIS[notification.type] ?? '📢';
  
  return (
    <button
      onClick={() => onSelect(notification)}
      className={`group w-full text-left px-4 sm:px-5 py-3.5 transition-all duration-150 hover:bg-emerald-50/60
        ${!notification.lu ? `bg-amber-50/40 border-l-4 ${style.border}` : 'border-l-4 border-transparent'}`}
    >
      <div className="flex items-start gap-3">
        <div className={`relative mt-0.5 p-2 rounded-xl shrink-0 transition-transform duration-200 group-hover:scale-110 ${style.badge}`}>
          {GRAVITE_ICONS[notification.gravite]}
          {!notification.lu && (
            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-medium text-gray-900 truncate">
              {emoji} {notification.titre}
            </span>
            <span className="shrink-0 text-[10px] text-gray-500">{formatRelativeDate(notification.createdAt)}</span>
          </div>
          <p className="mt-0.5 text-xs text-gray-700 line-clamp-2">{notification.message}</p>
          <span className="mt-1 flex items-center gap-0.5 text-[10px] font-medium text-emerald-500 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            Voir le détail <ChevronRight size={12} />
          </span>
        </div>
      </div>
    </button>
  );
}

function GraviteFilterBar({ active, onChange }: { active: GraviteFilter; onChange: (g: GraviteFilter) => void }) {
  const options: { key: GraviteFilter; label: string }[] = [
    { key: 'all', label: 'Toutes' },
    { key: 'info', label: GRAVITE_LABELS.info },
    { key: 'success', label: GRAVITE_LABELS.success },
    { key: 'warning', label: GRAVITE_LABELS.warning },
    { key: 'error', label: GRAVITE_LABELS.error },
  ];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto border-b border-gray-100 bg-white px-4 sm:px-5 py-2.5 no-scrollbar">
      {options.map((opt) => {
        const isActive = active === opt.key;
        const chipActive = opt.key === 'all' ? 'bg-gray-800 text-white border-gray-800' : GRAVITE_STYLES[opt.key as GraviteNotification].chipActive;
        return (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors duration-150
              ${isActive ? chipActive : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function NotificationPanel({
  notifications,
  isLoading,
  unreadCount,
  onMarkAllRead,
  onClose,
  onSelect,
}: {
  notifications: NotificationApi[];
  isLoading: boolean;
  unreadCount: number;
  onMarkAllRead: () => void;
  onClose: () => void;
  onSelect: (n: NotificationApi) => void;
}) {
  const [activeFilter, setActiveFilter] = useState<GraviteFilter>('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Glisser-fermer sur mobile (bottom sheet)
  const [dragOffset, setDragOffset] = useState(0);
  const dragStartYRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);

  const handleDragStart = (clientY: number) => {
    dragStartYRef.current = clientY;
    isDraggingRef.current = true;
  };
  const handleDragMove = (clientY: number) => {
    if (!isDraggingRef.current || dragStartYRef.current === null) return;
    const delta = clientY - dragStartYRef.current;
    if (delta > 0) setDragOffset(delta);
  };
  const handleDragEnd = () => {
    if (dragOffset > DRAG_CLOSE_THRESHOLD_PX) {
      onClose();
    }
    setDragOffset(0);
    isDraggingRef.current = false;
    dragStartYRef.current = null;
  };

  const filteredNotifications = useMemo(
    () => (activeFilter === 'all' ? notifications : notifications.filter((n) => n.gravite === activeFilter)),
    [notifications, activeFilter],
  );

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeFilter]);

  const visibleNotifications = filteredNotifications.slice(0, visibleCount);
  const hasMore = visibleCount < filteredNotifications.length;

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    if (hasMore && scrollHeight - scrollTop - clientHeight < 60) {
      setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filteredNotifications.length));
    }
  };

  return (
    <>
      {/* Backdrop mobile : tap pour fermer */}
      <div className="fixed inset-0 z-40 bg-black/30 sm:hidden animate-fadeIn" onClick={onClose} />

      <div
        role="dialog"
        aria-label="Notifications"
        style={{ transform: `translateY(${dragOffset}px)`, transition: isDraggingRef.current ? 'none' : 'transform 0.25s ease-out' }}
        className="fixed inset-x-0 bottom-0 sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-auto sm:mt-3
          w-full sm:w-[420px] max-h-[85vh] sm:max-h-[520px] bg-white
          rounded-t-3xl sm:rounded-2xl shadow-2xl border border-gray-200/60 overflow-hidden z-50
          animate-slideUpSheet sm:animate-slideDown"
      >
        {/* Poignée de glissement — mobile uniquement */}
        <div
          className="flex justify-center py-2 sm:hidden touch-none cursor-grab active:cursor-grabbing"
          onTouchStart={(e) => handleDragStart(e.touches[0].clientY)}
          onTouchMove={(e) => handleDragMove(e.touches[0].clientY)}
          onTouchEnd={handleDragEnd}
        >
          <div className="h-1.5 w-10 rounded-full bg-gray-300" />
        </div>

        <div className="sticky top-0 flex items-center justify-between bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-xl bg-white/20">
              <Bell className="h-4 w-4 text-white" />
            </div>
            <div>
              <span className="text-sm font-semibold text-white">Notifications</span>
              {unreadCount > 0 && (
                <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs text-white">
                  {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                className="flex items-center gap-1 rounded-xl bg-white/10 px-3 py-1 text-xs font-medium text-white/80 transition-colors hover:bg-white/20 hover:text-white"
              >
                <CheckCheck size={14} /> Tout lire
              </button>
            )}
            <button onClick={onClose} className="rounded-xl p-1 text-white/80 transition-colors hover:bg-white/20 hover:text-white">
              <X size={16} />
            </button>
          </div>
        </div>

        <GraviteFilterBar active={activeFilter} onChange={setActiveFilter} />

        <div
          onScroll={handleScroll}
          className="max-h-[calc(85vh-9rem)] sm:max-h-[340px] overflow-y-auto divide-y divide-gray-100/60"
        >
          {isLoading ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-[3px] border-emerald-500 border-t-transparent" />
              <p className="text-sm text-gray-500">Chargement...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                <Bell className="h-8 w-8 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-700">
                {activeFilter === 'all' ? 'Aucune notification' : 'Aucune notification dans cette catégorie'}
              </p>
              <p className="mt-1 text-xs text-gray-500">Tout est calme pour le moment 🌴</p>
            </div>
          ) : (
            <>
              {visibleNotifications.map((n) => (
                <NotificationRow key={n.id} notification={n} onSelect={onSelect} />
              ))}
              {hasMore && (
                <div className="py-3 text-center">
                  <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                </div>
              )}
            </>
          )}
        </div>

        {filteredNotifications.length > 0 && (
          <div className="sticky bottom-0 flex items-center justify-between border-t border-gray-200 bg-gray-100 px-5 py-2.5">
            <span className="text-[10px] font-medium text-gray-500">
              {visibleNotifications.length} / {filteredNotifications.length} notification{filteredNotifications.length > 1 ? 's' : ''}
            </span>
            <button onClick={onClose} className="text-xs font-medium text-emerald-600 transition-colors hover:text-emerald-800">
              Fermer
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function NotificationDetailModal({
  notification,
  onClose,
  onViewReservation,
}: {
  notification: NotificationApi;
  onClose: () => void;
  onViewReservation: (reservationId: string) => void;
}) {
  const style = GRAVITE_STYLES[notification.gravite];
  const emoji = TYPE_EMOJIS[notification.type] ?? '📢';

  // ✅ Icône spécifique pour les services annexes
  const getTypeIcon = () => {
    if (notification.type?.includes('VELO')) return <Bike size={16} className="text-amber-500" />;
    if (notification.type?.includes('TRANSFERT')) return <Plane size={16} className="text-blue-500" />;
    if (notification.type?.includes('ACTIVITE')) return <Activity size={16} className="text-green-500" />;
    return GRAVITE_ICONS[notification.gravite];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-slideUp">
        <div className={`flex items-center justify-between bg-gradient-to-r px-6 py-5 ${style.header}`}>
          <div className="flex items-center gap-3 text-white">
            <div className="rounded-xl bg-white/20 p-2">{getTypeIcon()}</div>
            <div>
              <h3 className="text-lg font-semibold">{notification.titre}</h3>
              <p className="text-xs text-white/80">
                {emoji} {notification.type}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-1.5 text-white/80 transition-colors hover:bg-white/20 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-sm leading-relaxed text-gray-700">{notification.message}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Type</p>
              <p className="text-sm font-medium text-gray-800">{notification.type}</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Gravité</p>
              <p className="text-sm font-medium capitalize text-gray-800">{notification.gravite}</p>
            </div>
            <div className="col-span-2 rounded-xl bg-gray-50 p-3">
              <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Reçue le</p>
              <p className="text-sm font-medium text-gray-800">{formatFullDate(notification.createdAt)}</p>
            </div>
          </div>

          {notification.reservationId && (
            <button
              onClick={() => onViewReservation(notification.reservationId!)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 font-medium text-white transition-all duration-200 hover:scale-[1.02] hover:bg-emerald-600"
            >
              <Calendar size={16} />
              Voir la réservation
            </button>
          )}
        </div>

        <div className="flex justify-end border-t border-gray-200 px-6 py-4">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-800">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

function NotificationToastStack({
  toasts,
  onDismiss,
  onOpen,
}: {
  toasts: NotificationApi[];
  onDismiss: (id: string) => void;
  onOpen: (n: NotificationApi) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 left-4 sm:left-auto z-[60] flex flex-col gap-2 sm:w-96">
      {toasts.map((n) => (
        <NotificationToast key={n.id} notification={n} onDismiss={onDismiss} onOpen={onOpen} />
      ))}
    </div>
  );
}

function NotificationToast({
  notification,
  onDismiss,
  onOpen,
}: {
  notification: NotificationApi;
  onDismiss: (id: string) => void;
  onOpen: (n: NotificationApi) => void;
}) {
  const style = GRAVITE_STYLES[notification.gravite];
  const emoji = TYPE_EMOJIS[notification.type] ?? '📢';

  // ✅ Auto-dismiss après TOAST_DURATION_MS (30ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(notification.id);
    }, TOAST_DURATION_MS);

    return () => clearTimeout(timer);
  }, [notification.id, onDismiss]);

  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-xl border-l-4 bg-white p-3.5 shadow-2xl border border-gray-200/70 animate-toastIn ${style.border}`}
    >
      <div className={`mt-0.5 shrink-0 rounded-lg p-1.5 ${style.badge}`}>
        {GRAVITE_ICONS[notification.gravite]}
      </div>
      <button onClick={() => onOpen(notification)} className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-medium text-gray-900">
          {emoji} {notification.titre}
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs text-gray-600">{notification.message}</p>
      </button>
      <button
        onClick={() => onDismiss(notification.id)}
        aria-label="Fermer la notification"
        className="shrink-0 rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ============================================================
// Composant principal
// ============================================================

export const Header = ({ isSidebarCollapsed }: HeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { isConnected } = useWebSocketContext();

  const networkStatus = useNetworkStatus();
  const { notifications, nonLues, isLoading, marquerLue, marquerToutesLues, forceRefresh } = useNotifications();
  const panel = useNotificationsPanel(forceRefresh);
  const notificationAreaRef = useClickOutside<HTMLDivElement>(panel.isOpen, panel.close);
  const { toasts, dismiss: dismissToast } = useNewNotificationToasts(notifications, panel.isOpen);

  const [selectedNotification, setSelectedNotification] = useState<NotificationApi | null>(null);

  const pageTitle = useMemo(() => resolvePageTitle(location.pathname), [location.pathname]);
  const todayLabel = useMemo(
    () => new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    [],
  );

  // ✅ Écouter les événements WebSocket pour les services annexes
  useEffect(() => {
    const handleRefreshServices = (event: CustomEvent) => {
      console.log('[Header] Refresh services via WebSocket:', event.detail);
      forceRefresh();
    };

    window.addEventListener('refresh-services', handleRefreshServices as EventListener);
    window.addEventListener('SERVICE_ANNEXE_UPDATED', handleRefreshServices as EventListener);
    window.addEventListener('VELO_STATUS_CHANGED', handleRefreshServices as EventListener);
    window.addEventListener('REFRESH_SERVICES', handleRefreshServices as EventListener);

    return () => {
      window.removeEventListener('refresh-services', handleRefreshServices as EventListener);
      window.removeEventListener('SERVICE_ANNEXE_UPDATED', handleRefreshServices as EventListener);
      window.removeEventListener('VELO_STATUS_CHANGED', handleRefreshServices as EventListener);
      window.removeEventListener('REFRESH_SERVICES', handleRefreshServices as EventListener);
    };
  }, [forceRefresh]);

  const handleSelectNotification = (notification: NotificationApi) => {
    if (!notification.lu) marquerLue(notification.id);
    setSelectedNotification(notification);
    panel.close();
    dismissToast(notification.id);
  };

  const handleViewReservation = (reservationId: string) => {
    setSelectedNotification(null);
    navigate(`/reservations/${reservationId}`);
  };

  return (
    <>
      <header
        className={`fixed top-0 right-0 z-40 h-16 border-b border-gray-200 bg-white/95 shadow-sm
          backdrop-blur-md transition-all duration-300 ease-in-out
          ${isSidebarCollapsed ? 'left-16' : 'left-64'}`}
      >
        <div className="flex h-full items-center justify-between px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            <h1 className="flex items-center gap-2 truncate text-lg sm:text-xl font-semibold text-gray-900">
              <span className="text-emerald-500">🌴</span>
              <span className="truncate">{pageTitle}</span>
            </h1>
            <span className="hidden text-sm text-gray-300 md:inline">|</span>
            <span className="hidden text-sm text-gray-600 md:inline">{todayLabel}</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* ✅ Indicateur de connexion WebSocket */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-[10px] font-medium text-gray-600">
                {isConnected ? 'Temps réel' : 'Hors ligne'}
              </span>
            </div>

            <NetworkStatusBadge status={networkStatus} />

            <div ref={notificationAreaRef} className="relative">
              <NotificationBellButton
                unreadCount={nonLues}
                isOpen={panel.isOpen}
                isLoading={isLoading}
                onClick={panel.toggle}
              />
              {panel.isOpen && (
                <NotificationPanel
                  notifications={notifications}
                  isLoading={isLoading}
                  unreadCount={nonLues}
                  onMarkAllRead={marquerToutesLues}
                  onClose={panel.close}
                  onSelect={handleSelectNotification}
                />
              )}
            </div>
          </div>
        </div>
      </header>

      <NotificationToastStack toasts={toasts} onDismiss={dismissToast} onOpen={handleSelectNotification} />

      {selectedNotification && (
        <NotificationDetailModal
          notification={selectedNotification}
          onClose={() => setSelectedNotification(null)}
          onViewReservation={handleViewReservation}
        />
      )}

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes slideUpSheet {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes bellShake {
          0%, 100% { transform: rotate(0deg); }
          10% { transform: rotate(-14deg); }
          20% { transform: rotate(12deg); }
          30% { transform: rotate(-10deg); }
          40% { transform: rotate(8deg); }
          50% { transform: rotate(-6deg); }
          60% { transform: rotate(4deg); }
          70%, 100% { transform: rotate(0deg); }
        }
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(24px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-slideDown { animation: slideDown 0.25s ease-out forwards; }
        .animate-slideUpSheet { animation: slideUpSheet 0.28s ease-out forwards; }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out forwards; }
        .animate-slideUp { animation: slideUp 0.3s ease-out forwards; }
        .animate-toastIn { animation: toastIn 0.25s ease-out forwards; }
        .animate-bellShake {
          animation: bellShake 1.8s ease-in-out infinite;
          animation-delay: 0.5s;
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </>
  );
};

export default Header;