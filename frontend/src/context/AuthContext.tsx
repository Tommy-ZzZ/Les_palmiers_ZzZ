import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { User } from '../types';
import api from '../services/api';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  remainingTime: number | null;
  login: (login: string, motDePasse: string) => Promise<void>;
  logout: () => void;
  isGerante: () => boolean;
  isEmploye: () => boolean;
  isComptable: () => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // RG8 : 15 minutes

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('palmiers_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    const storedToken = localStorage.getItem('palmiers_token');
    return storedToken;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout>>();
  const expiryAt = useRef<number | null>(null);
  const isInitialized = useRef(false);

  const logout = useCallback(() => {
    console.log('[AuthContext] logout called');
    setUser(null);
    setToken(null);
    setRemainingTime(null);
    expiryAt.current = null;
    localStorage.removeItem('palmiers_token');
    localStorage.removeItem('palmiers_user');
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
  }, []);

  // RG8 : reset du timer d'inactivite a chaque interaction
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (user) {
      expiryAt.current = Date.now() + SESSION_TIMEOUT_MS;
      setRemainingTime(Math.ceil(SESSION_TIMEOUT_MS / 1000));
      inactivityTimer.current = setTimeout(() => {
        console.warn('[AuthContext] session expired after inactivity');
        setRemainingTime(0);
        toast.error('Session expirée après 15 minutes d\'inactivité (RG8)');
        logout();
        window.location.href = '/login';
      }, SESSION_TIMEOUT_MS);
    }
  }, [user, logout]);

  // ✅ Timer d'inactivité - UNE SEULE FOIS quand user change
  useEffect(() => {
    if (!user) return;
    
    // Éviter les doublons
    if (isInitialized.current) {
      console.log('[AuthContext] Timer already initialized, skipping');
      return;
    }
    isInitialized.current = true;

    console.log('[AuthContext] Setting up inactivity timer');

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    
    const handleActivity = () => {
      resetInactivityTimer();
    };

    events.forEach(e => window.addEventListener(e, handleActivity));
    resetInactivityTimer();

    return () => {
      console.log('[AuthContext] Cleaning up inactivity timer');
      events.forEach(e => window.removeEventListener(e, handleActivity));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      isInitialized.current = false;
    };
  }, [user, resetInactivityTimer]);

  // ✅ Timer de compte à rebours - UNE SEULE FOIS quand user change
  useEffect(() => {
    if (!user || !expiryAt.current) return;

    const timer = setInterval(() => {
      if (!expiryAt.current) return;
      const secondsLeft = Math.max(0, Math.ceil((expiryAt.current - Date.now()) / 1000));
      setRemainingTime(secondsLeft);
    }, 1000);

    return () => clearInterval(timer);
  }, [user]);

  const login = async (loginStr: string, motDePasse: string) => {
    console.log('[AuthContext] login start:', loginStr);
    setIsLoading(true);
    try {
      const { data } = await api.post('/auth/login', { login: loginStr, motDePasse });
      console.log('[AuthContext] login response success:', data?.success, 'role:', data?.data?.user?.role);
      if (data.success) {
        setUser(data.data.user);
        setToken(data.data.token);
        localStorage.setItem('palmiers_token', data.data.token);
        localStorage.setItem('palmiers_user', JSON.stringify(data.data.user));
        toast.success(`Bienvenue, ${data.data.user.prenom} !`);
      }
    } catch (error) {
      console.error('[AuthContext] login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const isGerante = () => user?.role === 'GERANTE';
  const isEmploye = () => user?.role === 'EMPLOYE_ACCUEIL' || user?.role === 'GERANTE';
  const isComptable = () => user?.role === 'COMPTABLE' || user?.role === 'GERANTE';

  return (
    <AuthContext.Provider value={{ user, token, isLoading, remainingTime, login, logout, isGerante, isEmploye, isComptable }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}