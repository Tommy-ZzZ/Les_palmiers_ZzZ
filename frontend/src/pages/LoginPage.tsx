import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Palmtree, Eye, EyeOff, Lock, User, ChevronRight,
  Waves, Sun, Coffee, Bike, Award, Star,
  Shield, Clock, Database, Sparkles, Leaf, Flower2, Mountain,
  CheckCircle, XCircle, AlertCircle, RefreshCw,
} from 'lucide-react';

// ─── Animations CSS ───────────────────────────────────────────────────────────

const styles = `
  @keyframes sway-gentle {
    0%, 100% { transform: rotate(-3deg) translateX(-2px); }
    50%       { transform: rotate(3deg) translateX(2px); }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    50%       { transform: translateY(-20px) rotate(5deg); }
  }
  @keyframes float-delayed {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    50%       { transform: translateY(20px) rotate(-5deg); }
  }
  @keyframes pulse-slow {
    0%, 100% { opacity: 0.3; transform: scale(1); }
    50%       { opacity: 0.5; transform: scale(1.05); }
  }
  @keyframes fadeIn    { from { opacity: 0; } to { opacity: 1; } }
  @keyframes fadeInUp  { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeInDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes scaleIn   { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
  @keyframes shimmer   { 0% { transform: translateX(-100%) rotate(45deg); } 100% { transform: translateX(100%) rotate(45deg); } }
  @keyframes sparkle   { 0%, 100% { opacity: 0.2; transform: scale(1) rotate(0deg); } 50% { opacity: 0.5; transform: scale(1.2) rotate(180deg); } }
  @keyframes shake     { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-8px); } 75% { transform: translateX(8px); } }

  @keyframes spin-palm {
    0%   { transform: rotate(0deg) scale(1); }
    25%  { transform: rotate(90deg) scale(1.05); }
    50%  { transform: rotate(180deg) scale(1.1); }
    75%  { transform: rotate(270deg) scale(1.05); }
    100% { transform: rotate(360deg) scale(1); }
  }
  @keyframes spin-error {
    0%   { transform: rotate(0deg) scale(1); }
    50%  { transform: rotate(180deg) scale(0.9); }
    100% { transform: rotate(360deg) scale(1); }
  }
  @keyframes orbit         { 0% { transform: rotate(0deg) translateX(45px) rotate(0deg); } 100% { transform: rotate(360deg) translateX(45px) rotate(-360deg); } }
  @keyframes orbit-reverse { 0% { transform: rotate(0deg) translateX(35px) rotate(0deg); } 100% { transform: rotate(-360deg) translateX(35px) rotate(360deg); } }
  @keyframes orbit-error   { 0% { transform: rotate(0deg) translateX(38px) rotate(0deg); } 100% { transform: rotate(360deg) translateX(38px) rotate(-360deg); } }
  @keyframes orbit-reverse-error { 0% { transform: rotate(0deg) translateX(30px) rotate(0deg); } 100% { transform: rotate(-360deg) translateX(30px) rotate(360deg); } }

  @keyframes pulse-ring       { 0% { transform: scale(0.8); opacity: 0.8; } 100% { transform: scale(1.4); opacity: 0; } }
  @keyframes pulse-ring-error { 0% { transform: scale(0.8); opacity: 0.8; } 100% { transform: scale(1.6); opacity: 0; } }

  @keyframes loader-scale { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  @keyframes check-in     { 0% { transform: scale(0) rotate(-90deg); opacity: 0; } 50% { transform: scale(1.2) rotate(10deg); } 100% { transform: scale(1) rotate(0deg); opacity: 1; } }
  @keyframes error-in     { 0% { transform: scale(0) rotate(45deg); opacity: 0; } 50% { transform: scale(1.2) rotate(-10deg); } 100% { transform: scale(1) rotate(0deg); opacity: 1; } }

  @keyframes shake-container {
    0%, 100% { transform: translateX(0); }
    15%  { transform: translateX(-10px); }
    30%  { transform: translateX(10px); }
    45%  { transform: translateX(-5px); }
    60%  { transform: translateX(5px); }
    75%  { transform: translateX(-2px); }
    90%  { transform: translateX(2px); }
  }
  @keyframes bounce-success    { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
  @keyframes glow-pulse        { 0%, 100% { box-shadow: 0 0 20px rgba(34,197,94,0.2); } 50% { box-shadow: 0 0 40px rgba(34,197,94,0.4); } }
  @keyframes glow-pulse-error  { 0%, 100% { box-shadow: 0 0 25px rgba(239,68,68,0.15); } 50% { box-shadow: 0 0 50px rgba(239,68,68,0.3); } }
  @keyframes slideDown         { from { opacity: 0; transform: translateY(-20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
  @keyframes pulse-error-text  { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
  @keyframes particle-float    { 0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.6; } 50% { transform: translateY(-15px) rotate(180deg); opacity: 1; } }
  @keyframes particle-float-delayed { 0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.4; } 50% { transform: translateY(15px) rotate(-180deg); opacity: 0.8; } }

  .animate-sway-gentle              { animation: sway-gentle 4s ease-in-out infinite; transform-origin: bottom center; }
  .animate-float                    { animation: float 6s ease-in-out infinite; }
  .animate-float-delayed            { animation: float-delayed 8s ease-in-out infinite; }
  .animate-pulse-slow               { animation: pulse-slow 4s ease-in-out infinite; }
  .animate-fade-in                  { animation: fadeIn 0.8s ease-out forwards; }
  .animate-fade-in-delayed          { animation: fadeIn 0.8s ease-out 0.3s forwards; opacity: 0; }
  .animate-fade-in-delayed-2        { animation: fadeIn 0.8s ease-out 0.6s forwards; opacity: 0; }
  .animate-fade-in-up               { animation: fadeInUp 0.6s ease-out forwards; opacity: 0; }
  .animate-fade-in-down             { animation: fadeInDown 0.3s ease-out forwards; }
  .animate-scale-in                 { animation: scaleIn 0.6s ease-out 0.3s forwards; opacity: 0; }
  .animate-shimmer                  { animation: shimmer 2s infinite; }
  .animate-sparkle                  { animation: sparkle 3s ease-in-out infinite; }
  .animate-shake                    { animation: shake 0.4s ease-in-out; }
  .animate-spin-palm                { animation: spin-palm 2.5s cubic-bezier(0.4,0,0.2,1) infinite; }
  .animate-spin-error               { animation: spin-error 1.2s cubic-bezier(0.4,0,0.2,1) infinite; }
  .animate-orbit                    { animation: orbit 3s linear infinite; }
  .animate-orbit-reverse            { animation: orbit-reverse 4s linear infinite; }
  .animate-orbit-error              { animation: orbit-error 3s linear infinite; }
  .animate-orbit-reverse-error      { animation: orbit-reverse-error 3.5s linear infinite; }
  .animate-pulse-ring               { animation: pulse-ring 2s ease-out infinite; }
  .animate-pulse-ring-delayed       { animation: pulse-ring 2s ease-out 0.5s infinite; }
  .animate-pulse-ring-error         { animation: pulse-ring-error 2s ease-out infinite; }
  .animate-pulse-ring-error-delayed { animation: pulse-ring-error 2s ease-out 0.5s infinite; }
  .animate-loader-scale             { animation: loader-scale 0.3s ease-out forwards; }
  .animate-check-in                 { animation: check-in 0.5s ease-out forwards; }
  .animate-error-in                 { animation: error-in 0.5s ease-out forwards; }
  .animate-shake-container          { animation: shake-container 0.6s ease-in-out; }
  .animate-bounce-success           { animation: bounce-success 1.5s ease-in-out infinite; }
  .animate-glow-pulse               { animation: glow-pulse 2s ease-in-out infinite; }
  .animate-glow-pulse-error         { animation: glow-pulse-error 2.5s ease-in-out infinite; }
  .animate-slide-down               { animation: slideDown 0.3s ease-out forwards; }
  .animate-pulse-error-text         { animation: pulse-error-text 1s ease-in-out infinite; }
  .animate-particle-float           { animation: particle-float 3s ease-in-out infinite; }
  .animate-particle-float-delayed   { animation: particle-float-delayed 4s ease-in-out infinite; }

  .delay-1000 { animation-delay: 1000ms; }
  .delay-2000 { animation-delay: 2000ms; }
`;

// ─── Loading Overlay ──────────────────────────────────────────────────────────

interface LoadingOverlayProps {
  showSuccess: boolean;
  showError:   boolean;
  errorMessage: string;
  onRetry: () => void;
}

const LoadingOverlay = ({ showSuccess, showError, errorMessage, onRetry }: LoadingOverlayProps) => {
  const isLoading = !showSuccess && !showError;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Fond flouté */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(8px)',
        }}
      />

      {/* Card central */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          background: '#ffffff',
          borderRadius: '1rem',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)',
          padding: '2rem',
          width: '100%',
          maxWidth: '380px',
          margin: '0 1rem',
          border: showError
            ? '2px solid #fecaca'
            : showSuccess
            ? '2px solid #bbf7d0'
            : 'none',
        }}
        className={
          showError   ? 'animate-glow-pulse-error' :
          showSuccess ? 'animate-glow-pulse'        :
          isLoading   ? 'animate-loader-scale'      : ''
        }
      >
        {/* ── SUCCÈS ─────────────────────────────────────────────────────── */}
        {showSuccess && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.5rem 0' }}>
            <div style={{ position: 'relative', width: '7rem', height: '7rem' }}>
              <div className="absolute inset-0 rounded-full bg-green-100 animate-pulse" />
              <div className="absolute inset-0 rounded-full border-2 border-green-200 animate-pulse-ring" />
              <div className="absolute inset-0 rounded-full border-2 border-green-300/30 animate-pulse-ring-delayed" />
              <div className="absolute inset-2 rounded-full bg-green-50 flex items-center justify-center">
                <CheckCircle size={52} className="text-green-500 animate-check-in animate-bounce-success" strokeWidth={1.5} />
              </div>
            </div>
            <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
              <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#15803d' }} className="animate-fade-in-down">
                Connexion réussie !
              </p>
              <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.25rem' }} className="animate-fade-in-down">
                Bienvenue dans votre espace de gestion
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
                {[0, 300, 600].map((d) => (
                  <div key={d} className="w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
              <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.75rem' }}>
                Redirection en cours…
              </p>
            </div>
          </div>
        )}

        {/* ── ERREUR ─────────────────────────────────────────────────────── */}
        {showError && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.5rem 0' }}>
            {/* Cercle icône erreur */}
            <div style={{ position: 'relative', width: '7rem', height: '7rem' }}>
              <div className="absolute inset-0 rounded-full bg-red-100 animate-pulse" />
              <div className="absolute inset-0 rounded-full border-2 border-red-200 animate-pulse-ring-error" />
              <div className="absolute inset-0 rounded-full border-2 border-red-300/30 animate-pulse-ring-error-delayed" />

              {/* Particules */}
              <div className="absolute -top-2 -right-2 w-3 h-3 rounded-full bg-red-300 animate-particle-float" />
              <div className="absolute -bottom-2 -left-2 w-2.5 h-2.5 rounded-full bg-red-400 animate-particle-float-delayed" />
              <div className="absolute top-1/2 -left-3 w-2 h-2 rounded-full bg-red-300/60 animate-particle-float" style={{ animationDelay: '0.5s' }} />
              <div className="absolute bottom-1/3 -right-3 w-2 h-2 rounded-full bg-red-400/60 animate-particle-float-delayed" style={{ animationDelay: '0.8s' }} />

              {/* Orbites */}
              <div className="absolute inset-0 animate-orbit-error">
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-red-400 shadow-lg shadow-red-400/40" />
              </div>
              <div className="absolute inset-0 animate-orbit-reverse-error">
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-red-300 shadow-lg shadow-red-300/40" />
              </div>

              <div className="absolute inset-2 rounded-full bg-gradient-to-br from-red-50 via-red-100 to-red-200 shadow-xl flex items-center justify-center border-2 border-red-200/50 overflow-hidden">
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-red-400/15 via-transparent to-red-600/15 animate-spin-error" />
                <div className="relative z-10 animate-shake-container">
                  <XCircle size={44} className="text-red-500 animate-error-in" strokeWidth={1.5} />
                </div>
              </div>
            </div>

            {/* Message d'erreur */}
            <div style={{ marginTop: '1.25rem', textAlign: 'center', width: '100%' }} className="animate-slide-down">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <AlertCircle size={22} className="text-red-500" />
                <p style={{ fontSize: '1.2rem', fontWeight: 700, color: '#b91c1c' }}>
                  Erreur de connexion
                </p>
              </div>

              {/* Boîte message principal */}
              <div
                style={{
                  padding: '1rem 1.25rem',
                  background: 'linear-gradient(to right, #fff1f2, #ffe4e6)',
                  borderRadius: '0.75rem',
                  border: '2px solid #fca5a5',
                  boxShadow: '0 4px 12px rgba(239,68,68,0.15)',
                }}
              >
                <p style={{ fontSize: '1rem', fontWeight: 700, color: '#b91c1c', textAlign: 'center' }}>
                  {errorMessage || 'Identifiant ou mot de passe incorrect'}
                </p>
                <p style={{ fontSize: '0.875rem', color: '#dc2626', marginTop: '0.5rem', textAlign: 'center' }}>
                  Veuillez vérifier vos identifiants et réessayer
                </p>
              </div>

              {/* Bouton Réessayer */}
              <button
                onClick={onRetry}
                style={{
                  marginTop: '1.25rem',
                  padding: '0.75rem 2rem',
                  background: 'linear-gradient(to right, #ef4444, #dc2626)',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  borderRadius: '0.75rem',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  margin: '1.25rem auto 0',
                  boxShadow: '0 4px 12px rgba(239,68,68,0.3)',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
              >
                <RefreshCw size={18} />
                Réessayer la connexion
              </button>
            </div>
          </div>
        )}

        {/* ── CHARGEMENT ─────────────────────────────────────────────────── */}
        {isLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1rem 0' }}>
            <div style={{ position: 'relative', width: '8rem', height: '8rem' }}>
              <div className="absolute inset-0 rounded-full border-2 border-palmier-200/30 animate-pulse-ring" />
              <div className="absolute inset-0 rounded-full border-2 border-palmier-300/20 animate-pulse-ring-delayed" />
              <div className="absolute inset-0 animate-orbit">
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-gradient-to-br from-palmier-400 to-palmier-500 shadow-lg shadow-palmier-400/40" />
              </div>
              <div className="absolute inset-0 animate-orbit-reverse">
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-gradient-to-br from-sable-400 to-amber-400 shadow-lg shadow-sable-400/40" />
              </div>
              <div className="absolute inset-2 rounded-full bg-gradient-to-br from-palmier-50 via-palmier-100 to-palmier-200 shadow-xl flex items-center justify-center border-2 border-palmier-200/50 overflow-hidden">
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-palmier-400/15 via-transparent to-palmier-600/15 animate-spin-palm" />
                <div className="relative z-10 animate-spin-palm" style={{ animationDuration: '2.2s' }}>
                  <Palmtree size={44} className="text-palmier-600 drop-shadow-lg" strokeWidth={1.5} />
                </div>
              </div>
            </div>
            <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
              <p style={{ fontSize: '1rem', fontWeight: 600, color: '#374151' }} className="animate-fade-in-down">
                Connexion en cours…
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                {[0, 300, 600].map((d) => (
                  <div key={d} className="w-2 h-2 bg-palmier-400 rounded-full animate-pulse" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
              <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.75rem' }}>
                Veuillez patienter…
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Données statiques ────────────────────────────────────────────────────────

const FEATURES = [
  { icon: Sun,    label: 'Haute saison',    sub: 'Tarifs 2026',         iconColor: 'text-yellow-400', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/20', glowColor: 'shadow-yellow-500/20' },
  { icon: Waves,  label: 'Piscine',         sub: 'Jardin tropical',     iconColor: 'text-blue-400',   bgColor: 'bg-blue-500/10',   borderColor: 'border-blue-500/20',   glowColor: 'shadow-blue-500/20'   },
  { icon: Coffee, label: 'Petit-déjeuner',  sub: 'Inclus ou en option', iconColor: 'text-amber-400',  bgColor: 'bg-amber-500/10',  borderColor: 'border-amber-500/20',  glowColor: 'shadow-amber-500/20'  },
  { icon: Bike,   label: 'Location vélos',  sub: 'VTT & ville',         iconColor: 'text-green-400',  bgColor: 'bg-green-500/10',  borderColor: 'border-green-500/20',  glowColor: 'shadow-green-500/20'  },
];

const SECURITY_FEATURES = [
  { icon: Shield,   label: 'Sécurisé'   },
  { icon: Clock,    label: '24/7'       },
  { icon: Database, label: 'Sauvegarde' },
];

// ─── Page principale ──────────────────────────────────────────────────────────

export default function LoginPage() {
  const { login } = useAuth();
  const navigate   = useNavigate();

  const [loginInput,     setLoginInput]     = useState('');
  const [password,       setPassword]       = useState('');
  const [showPwd,        setShowPwd]        = useState(false);
  const [error,          setError]          = useState('');
  const [loading,        setLoading]        = useState(false);
  const [isHovered,      setIsHovered]      = useState(false);
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);
  const [showOverlay,    setShowOverlay]    = useState(false);
  const [showSuccess,    setShowSuccess]    = useState(false);
  const [showError,      setShowError]      = useState(false);
  const [errorMessage,   setErrorMessage]   = useState('');

  // Ferme l'overlay et remet tout à zéro
  const resetOverlay = () => {
    setShowOverlay(false);
    setShowError(false);
    setShowSuccess(false);
    setErrorMessage('');
    setError('');
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setErrorMessage('');
    setShowSuccess(false);
    setShowError(false);
    setLoading(true);
    setShowOverlay(true);

    try {
      await new Promise((r) => setTimeout(r, 500));
      await login(loginInput, password);

      setShowSuccess(true);
      await new Promise((r) => setTimeout(r, 3000));

      setShowOverlay(false);
      navigate('/dashboard');

    } catch (err: any) {
      const msg = err.response?.data?.message || 'Identifiant ou mot de passe incorrect';
      setErrorMessage(msg);
      setError(msg);
      setLoading(false);
      // On passe en état erreur — l'overlay reste visible jusqu'au clic "Réessayer"
      setShowError(true);
    }
  };

  return (
    <>
      <style>{styles}</style>

      {/* Overlay plein écran — rendu en dehors du flux de la page */}
      {showOverlay && (
        <LoadingOverlay
          showSuccess={showSuccess}
          showError={showError}
          errorMessage={errorMessage}
          onRetry={resetOverlay}
        />
      )}

      <div className="min-h-screen flex flex-col lg:flex-row font-sans">

        {/* ── Panneau gauche ────────────────────────────────────────────── */}
        <div className="lg:w-1/2 bg-gradient-to-br from-palmier-800 via-palmier-900 to-palmier-950 relative overflow-hidden flex flex-col items-center justify-between p-8 lg:p-12 min-h-[300px] lg:min-h-screen">

          {/* Fond décoratif */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-20" />
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-sable-300 rounded-full opacity-10 animate-float" />
            <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-palmier-600 rounded-full opacity-10 animate-float-delayed" />
            <div className="absolute top-1/4 left-1/4 animate-sparkle"><Sparkles size={20} className="text-yellow-400/20" /></div>
            <div className="absolute bottom-1/3 right-1/4 animate-float-delayed"><Leaf size={24} className="text-green-400/20" /></div>
            <div className="absolute top-1/3 right-1/3 animate-float"><Flower2 size={18} className="text-pink-400/20" /></div>
            <div className="absolute bottom-1/4 left-1/3 animate-float-delayed"><Mountain size={28} className="text-blue-400/20" /></div>
          </div>

          {/* Contenu central */}
          <div className="relative z-10 flex flex-col items-center justify-center text-center w-full flex-1">
            <div className="relative mb-8">
              <div className="absolute -inset-4 bg-palmier-700/20 rounded-full blur-2xl animate-pulse" />
              <Palmtree size={80} className="text-sable-300 animate-sway-gentle relative z-10" strokeWidth={1.5} />
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-16 h-1 bg-gradient-to-r from-transparent via-sable-400/50 to-transparent blur-sm" />
            </div>

            <h1 className="text-4xl font-bold text-white mb-2 tracking-tight animate-fade-in">Les Palmiers</h1>
            <p className="text-palmier-300 text-lg font-light mb-1 animate-fade-in-delayed">de l'Entre-Deux</p>
            <div className="w-16 h-0.5 bg-sable-400/50 mx-auto mb-4 animate-scale-in" />
            <p className="text-palmier-200 text-sm max-w-sm leading-relaxed animate-fade-in-delayed-2">
              Gîte de charme · 6 chambres · La Réunion
            </p>

            <div className="grid grid-cols-2 gap-3 mt-8 w-full max-w-sm">
              {FEATURES.map((item, idx) => (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredFeature(idx)}
                  onMouseLeave={() => setHoveredFeature(null)}
                  className={[
                    'bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3',
                    'transition-all duration-300 cursor-default group relative',
                    'hover:bg-white/10 hover:scale-105 hover:shadow-xl',
                    item.bgColor, item.borderColor, item.glowColor,
                  ].join(' ')}
                  style={{ animation: 'fadeInUp 0.6s ease-out forwards', animationDelay: `${idx * 150}ms`, opacity: 0 }}
                >
                  <div className="flex items-center justify-center gap-2">
                    <item.icon size={16} className={`${item.iconColor} transition-all duration-300 group-hover:scale-110 group-hover:rotate-12`} />
                    <span className="text-white text-xs font-medium">{item.label}</span>
                  </div>
                  <span className="text-palmier-300 text-[10px]">{item.sub}</span>
                  {hoveredFeature === idx && (
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-xl animate-shimmer" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Pied gauche */}
          <div className="relative z-10 w-full text-center pt-8 mt-auto">
            <div className="border-t border-white/5 pt-4">
              <p className="text-palmier-500 text-xs animate-fade-in-delayed-2">© 2026 Les Palmiers de l'Entre-Deux</p>
            </div>
          </div>

          <div className="absolute top-8 right-8 text-palmier-600/30 animate-float">
            <Award size={24} />
          </div>
          <div className="absolute bottom-24 left-8 text-palmier-600/30 animate-float-delayed">
            <Star size={24} />
          </div>
        </div>

        {/* ── Panneau droit (formulaire) ─────────────────────────────────── */}
        <div className="lg:w-1/2 bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden flex flex-col items-center justify-between p-6 lg:p-12 min-h-[400px] lg:min-h-screen">

          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-palmier-100 rounded-full opacity-30 animate-pulse-slow" />
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-sable-200 rounded-full opacity-20 animate-pulse-slow delay-1000" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-palmier-50 rounded-full opacity-10 animate-pulse-slow delay-2000" />
          </div>

          <div className="relative z-10 w-full max-w-md flex-1 flex flex-col justify-center">
            <div className="text-center mb-10">
              <h1 className="text-3xl font-bold text-gray-800 animate-fade-in">Bienvenue</h1>
              <p className="text-sm text-gray-500 mt-2 animate-fade-in-delayed">
                Connectez-vous à votre espace de gestion
              </p>
            </div>

            {/* Erreur inline (visible après fermeture de l'overlay) */}
            {error && !showOverlay && (
              <div className="mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm px-4 py-3 rounded-lg shadow-sm animate-shake">
                <span className="font-medium">Erreur :</span> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Identifiant */}
              <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Identifiant</label>
                <div className="relative group">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-palmier-600 transition-colors">
                    <User size={18} />
                  </span>
                  <input
                    type="text"
                    value={loginInput}
                    onChange={(e) => setLoginInput(e.target.value)}
                    placeholder="votre.identifiant"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-800 placeholder:text-gray-400 focus:ring-2 focus:ring-palmier-500 focus:border-palmier-500 outline-none transition-all duration-300 shadow-sm hover:shadow-md"
                  />
                </div>
              </div>

              {/* Mot de passe */}
              <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-semibold text-gray-700">Mot de passe</label>
                  <button type="button" className="text-xs text-palmier-600 hover:text-palmier-700 font-medium transition-colors duration-300">
                    Mot de passe oublié ?
                  </button>
                </div>
                <div className="relative group">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-palmier-600 transition-colors">
                    <Lock size={18} />
                  </span>
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-12 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-800 placeholder:text-gray-400 focus:ring-2 focus:ring-palmier-500 focus:border-palmier-500 outline-none transition-all duration-300 shadow-sm hover:shadow-md"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-300"
                  >
                    {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Bouton connexion */}
              <button
                type="submit"
                disabled={loading}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="w-full relative overflow-hidden bg-gradient-to-r from-palmier-600 to-palmier-800 text-white py-3.5 rounded-xl font-semibold text-sm transition-all duration-300 shadow-lg shadow-palmier-200/50 hover:shadow-palmier-300/50 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed group animate-fade-in-up"
                style={{ animationDelay: '300ms' }}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Se connecter
                  <ChevronRight size={18} className={`transition-all duration-300 ${isHovered ? 'translate-x-1' : ''}`} />
                </span>
                <span className="absolute inset-0 bg-gradient-to-r from-palmier-700 to-palmier-900 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </button>
            </form>

            {/* Badges sécurité */}
            <div className="mt-8 flex justify-center gap-6 animate-fade-in-up" style={{ animationDelay: '500ms' }}>
              {SECURITY_FEATURES.map((item, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-xs text-gray-400 group cursor-default transition-all duration-300 hover:scale-110 hover:text-palmier-500">
                  <item.icon size={14} className="text-palmier-400 group-hover:text-palmier-500 group-hover:rotate-12 transition-all duration-300" />
                  <span className="group-hover:text-gray-600 transition-colors duration-300">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </>
  );
}