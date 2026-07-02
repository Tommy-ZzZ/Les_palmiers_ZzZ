// frontend/src/hooks/useNotifications.ts
import { useState, useEffect, useCallback } from 'react';
import { notificationService, NotificationApi } from '../services/api';

const INTERVALLE_POLLING = 30000; // 30s pour plus de réactivité

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationApi[]>([]);
  const [nonLues, setNonLues] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await notificationService.getAll();
      if (res.success) {
        setNotifications(res.data || []);
        setNonLues(res.nonLues || 0);
      } else {
        console.error('[useNotifications] Erreur API:', res);
        setNotifications([]);
        setNonLues(0);
      }
    } catch (error) {
      console.error('[useNotifications] échec de récupération:', error);
      setNotifications([]);
      setNonLues(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ✅ Force refresh - appel immédiat sans attendre l'intervalle
  const forceRefresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await notificationService.getAll();
      if (res.success) {
        setNotifications(res.data || []);
        setNonLues(res.nonLues || 0);
      } else {
        console.error('[useNotifications] Erreur API forceRefresh:', res);
        setNotifications([]);
        setNonLues(0);
      }
    } catch (error) {
      console.error('[useNotifications] échec forceRefresh:', error);
      setNotifications([]);
      setNonLues(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, INTERVALLE_POLLING);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const marquerLue = useCallback(async (id: number) => {
    // Mise à jour optimiste
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, lu: true } : n)));
    setNonLues(prev => Math.max(0, prev - 1));
    try {
      const res = await notificationService.marquerLue(id);
      if (!res.success) {
        console.error('[useNotifications] Erreur marquerLue:', res);
        fetchNotifications();
      }
    } catch (error) {
      console.error('[useNotifications] échec marquerLue:', error);
      fetchNotifications();
    }
  }, [fetchNotifications]);

  const marquerToutesLues = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, lu: true })));
    setNonLues(0);
    try {
      const res = await notificationService.marquerToutesLues();
      if (!res.success) {
        console.error('[useNotifications] Erreur marquerToutesLues:', res);
        fetchNotifications();
      }
    } catch (error) {
      console.error('[useNotifications] échec marquerToutesLues:', error);
      fetchNotifications();
    }
  }, [fetchNotifications]);

  const getNonLues = useCallback(() => {
    return nonLues;
  }, [nonLues]);

  const getNotifications = useCallback(() => {
    return notifications;
  }, [notifications]);

  return { 
    notifications, 
    nonLues, 
    isLoading, 
    marquerLue, 
    marquerToutesLues,
    getNonLues,
    getNotifications,
    refresh: fetchNotifications,
    forceRefresh // ⬅️ NOUVEAU
  };
}