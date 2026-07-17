// frontend/src/components/ui/AjoutNotification.tsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { CheckCircle2, XCircle, X, AlertTriangle, Info } from 'lucide-react';

export type AjoutNotifType = 'success' | 'error' | 'warning' | 'info';

interface AjoutNotifDetail {
  type: AjoutNotifType;
  message: string;
  description?: string;
}

interface ToastItem extends AjoutNotifDetail {
  id: number;
}

const EVENT_NAME = 'ajout-notification';
const DURATION = 4000;

// ✅ Fonction exportée nommée (pour l'utiliser dans api.ts)
export function notifyAjout(type: AjoutNotifType, message: string, description?: string) {
  window.dispatchEvent(
    new CustomEvent<AjoutNotifDetail>(EVENT_NAME, { detail: { type, message, description } })
  );
}

const styles = `
@keyframes ajout-slide-in {
  0%   { opacity: 0; transform: translateX(60px) scale(0.9); }
  60%  { opacity: 1; transform: translateX(-6px) scale(1.02); }
  100% { opacity: 1; transform: translateX(0) scale(1); }
}
@keyframes ajout-slide-out {
  0%   { opacity: 1; transform: translateX(0) scale(1); max-height: 200px; margin-bottom: 12px; }
  100% { opacity: 0; transform: translateX(60px) scale(0.92); max-height: 0; margin-bottom: 0; }
}
@keyframes ajout-ring-pulse {
  0%   { transform: scale(0.85); opacity: 0.9; }
  100% { transform: scale(1.6); opacity: 0; }
}
@keyframes ajout-pop {
  0%   { transform: scale(0) rotate(-30deg); opacity: 0; }
  60%  { transform: scale(1.15) rotate(6deg); }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}
@keyframes ajout-shrink { from { width: 100%; } to { width: 0%; } }
@keyframes ajout-shimmer { 0% { background-position: -150% 0; } 100% { background-position: 250% 0; } }

.ajout-toast-enter { animation: ajout-slide-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
.ajout-toast-exit   { animation: ajout-slide-out 0.35s cubic-bezier(0.4, 0, 1, 1) forwards; }
.ajout-icon-pop      { animation: ajout-pop 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
.ajout-ring          { animation: ajout-ring-pulse 1.6s ease-out infinite; }
.ajout-progress      { animation: ajout-shrink linear forwards; }
.ajout-shimmer {
  background-image: linear-gradient(110deg, transparent 40%, rgba(255,255,255,0.5) 50%, transparent 60%);
  background-size: 200% 100%;
  animation: ajout-shimmer 2s ease-in-out infinite;
}
`;

function ToastCard({ toast, onClose }: { toast: ToastItem; onClose: (id: number) => void }) {
  const [closing, setClosing] = useState(false);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remainingRef = useRef(DURATION);
  const startRef = useRef<number>(Date.now());

  const startTimer = useCallback((ms: number) => {
    startRef.current = Date.now();
    timerRef.current = setTimeout(() => setClosing(true), ms);
  }, []);

  useEffect(() => {
    startTimer(remainingRef.current);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (closing) {
      const t = setTimeout(() => onClose(toast.id), 350);
      return () => clearTimeout(t);
    }
  }, [closing, onClose, toast.id]);

  const handleMouseEnter = () => {
    setPaused(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    remainingRef.current -= Date.now() - startRef.current;
  };
  const handleMouseLeave = () => {
    setPaused(false);
    if (remainingRef.current > 0) startTimer(remainingRef.current);
  };

  const config = {
    success: {
      bg: 'bg-white/95 border-emerald-200 shadow-emerald-200/40',
      iconBg: 'from-emerald-400 to-emerald-600',
      ringBg: 'bg-emerald-300/50',
      text: 'text-emerald-800',
      Icon: CheckCircle2,
      progress: 'from-emerald-400 to-emerald-500',
    },
    error: {
      bg: 'bg-white/95 border-rose-200 shadow-rose-200/40',
      iconBg: 'from-rose-400 to-rose-600',
      ringBg: 'bg-rose-300/50',
      text: 'text-rose-800',
      Icon: XCircle,
      progress: 'from-rose-400 to-rose-500',
    },
    warning: {
      bg: 'bg-white/95 border-amber-200 shadow-amber-200/40',
      iconBg: 'from-amber-400 to-amber-600',
      ringBg: 'bg-amber-300/50',
      text: 'text-amber-800',
      Icon: AlertTriangle,
      progress: 'from-amber-400 to-amber-500',
    },
    info: {
      bg: 'bg-white/95 border-blue-200 shadow-blue-200/40',
      iconBg: 'from-blue-400 to-blue-600',
      ringBg: 'bg-blue-300/50',
      text: 'text-blue-800',
      Icon: Info,
      progress: 'from-blue-400 to-blue-500',
    },
  };

  const c = config[toast.type] || config.success;
  const Icon = c.Icon;

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`${closing ? 'ajout-toast-exit' : 'ajout-toast-enter'} relative w-[320px] pointer-events-auto overflow-hidden rounded-2xl shadow-2xl border backdrop-blur-xl ${c.bg}`}
    >
      <div className={`absolute inset-0 opacity-[0.06] ajout-shimmer ${toast.type === 'success' ? 'text-emerald-500' : toast.type === 'error' ? 'text-rose-500' : toast.type === 'warning' ? 'text-amber-500' : 'text-blue-500'}`} />

      <div className="relative flex items-start gap-3 px-4 py-3.5">
        <div className="relative shrink-0 w-9 h-9 flex items-center justify-center">
          <span className={`absolute inset-0 rounded-full ajout-ring ${c.ringBg}`} />
          <span className={`relative w-9 h-9 rounded-full flex items-center justify-center ajout-icon-pop bg-gradient-to-br ${c.iconBg}`}>
            <Icon size={18} className="text-white" strokeWidth={2.5} />
          </span>
        </div>

        <div className="flex-1 pt-0.5 min-w-0">
          <p className={`text-sm font-semibold leading-snug ${c.text}`}>{toast.message}</p>
          {toast.description && <p className="text-xs text-gray-500 mt-0.5 leading-snug">{toast.description}</p>}
        </div>

        <button onClick={() => setClosing(true)} className="shrink-0 p-1 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="h-1 w-full bg-gray-100">
        <div
          className={`h-full ajout-progress bg-gradient-to-r ${c.progress}`}
          style={{ animationDuration: `${DURATION}ms`, animationPlayState: paused ? 'paused' : 'running' }}
        />
      </div>
    </div>
  );
}

// ✅ Export par défaut du composant (pour l'utiliser dans App.tsx)
export default function AjoutNotificationHost() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<AjoutNotifDetail>).detail;
      if (!detail) return;
      idRef.current += 1;
      setToasts(prev => [...prev, { ...detail, id: idRef.current }]);
    };
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, []);

  const remove = useCallback((id: number) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  return (
    <>
      <style>{styles}</style>
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map(t => <ToastCard key={t.id} toast={t} onClose={remove} />)}
      </div>
    </>
  );
}