// hooks/useNotifications.ts
import { useState, useCallback } from 'react';
import apiClient from '@/lib/apiClient';

export interface Notification {
  id: string | number;
  titre: string;
  message: string;
  url?: string;
  lu: boolean;
  date_creation: string;
  type: string;
  icone?: string | null;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
}

export const useNotifications = () => {
  const [state, setState] = useState<NotificationState>({
    notifications: [],
    unreadCount: 0,
    loading: false,
    error: null,
  });

  const fetchAllNotifications = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const { data } = await apiClient.get('/notifications/all/');
      
      setState({
        notifications: data.notifications,
        unreadCount: data.unread_count,
        loading: false,
        error: null,
      });
      
      console.log(`✅ ${data.notifications.length} notifications chargées`);
    } catch (error: any) {
      console.error('❌ Erreur chargement notifications:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.response?.data?.message || error.message || 'Impossible de charger les notifications',
      }));
    }
  }, []);

  const fetchRecentNotifications = useCallback(async (limit: number = 5): Promise<void> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const { data } = await apiClient.get(`/notifications/?limit=${limit}`);
      
      setState(prev => ({
        ...prev,
        notifications: data.notifications,
        unreadCount: data.unread_count,
        loading: false,
        error: null,
      }));
    } catch (error: any) {
      console.error('❌ Erreur chargement notifications récentes:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.response?.data?.message || error.message || 'Impossible de charger les notifications',
      }));
    }
  }, []);

  const addNotification = useCallback((notification: Notification) => {
    setState(prev => {
      const exists = prev.notifications.some(n => n.id === notification.id);
      if (exists) return prev;

      const newNotifications = [notification, ...prev.notifications];
      const newUnreadCount = notification.lu ? prev.unreadCount : prev.unreadCount + 1;
      
      return {
        ...prev,
        notifications: newNotifications.slice(0, 100),
        unreadCount: newUnreadCount,
      };
    });
  }, []);

  // 🔥 CORRIGÉ : MISE À JOUR OPTIMISTE avec état précédent
  const markAsRead = useCallback(async (id: string | number): Promise<void> => {
    let notificationToRestore: Notification | null = null;
    
    // 🚀 MISE À JOUR IMMÉDIATE (optimiste) avec état précédent
    setState(prev => {
      const updatedNotifications = prev.notifications.map(n => {
        if (n.id === id && !n.lu) {
          notificationToRestore = { ...n }; // Sauvegarde pour rollback
          return { ...n, lu: true };
        }
        return n;
      });
      
      const wasUnread = notificationToRestore !== null;
      const newUnreadCount = wasUnread ? Math.max(0, prev.unreadCount - 1) : prev.unreadCount;
      
      return {
        ...prev,
        notifications: updatedNotifications,
        unreadCount: newUnreadCount,
      };
    });

    try {
      // Appel API en arrière-plan
      await apiClient.patch(`/notifications/${id}/mark-read/`);
      console.log(`✅ Notification ${id} marquée comme lue`);
    } catch (error: any) {
      console.error('❌ Erreur marquage comme lu:', error);
      
      // ⬅️ ROLLBACK en cas d'erreur
      if (notificationToRestore) {
        setState(prev => ({
          ...prev,
          notifications: prev.notifications.map(n => 
            n.id === id ? notificationToRestore! : n
          ),
          unreadCount: prev.unreadCount + 1,
        }));
      }
      
      throw error;
    }
  }, []); // ✅ Plus de dépendances problématiques

  // 🔥 CORRIGÉ : Marquer toutes comme lues avec état précédent
  const markAllAsRead = useCallback(async (): Promise<void> => {
    const previousState = { ...state }; // Sauvegarde pour rollback
    
    // 🚀 MISE À JOUR IMMÉDIATE
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => ({ ...n, lu: true })),
      unreadCount: 0,
    }));

    try {
      await apiClient.patch('/notifications/mark-all-read/');
      console.log('✅ Toutes les notifications marquées comme lues');
    } catch (error: any) {
      console.error('❌ Erreur marquage toutes comme lues:', error);
      
      // ⬅️ ROLLBACK
      setState(previousState);
      
      throw error;
    }
  }, []); // ✅ Plus de dépendances problématiques

  // 🔥 CORRIGÉ : Supprimer une notification avec état précédent
  const deleteNotification = useCallback(async (id: string | number): Promise<void> => {
    let deletedNotification: Notification | null = null;
    let wasUnread = false;
    
    // 🚀 SUPPRESSION IMMÉDIATE avec état précédent
    setState(prev => {
      const notificationToDelete = prev.notifications.find(n => n.id === id);
      deletedNotification = notificationToDelete || null;
      wasUnread = deletedNotification ? !deletedNotification.lu : false;
      
      return {
        ...prev,
        notifications: prev.notifications.filter(n => n.id !== id),
        unreadCount: wasUnread ? Math.max(0, prev.unreadCount - 1) : prev.unreadCount,
      };
    });

    try {
      await apiClient.delete(`/notifications/${id}/delete/`);
      console.log(`✅ Notification ${id} supprimée`);
    } catch (error: any) {
      console.error('❌ Erreur suppression:', error);
      
      // ⬅️ ROLLBACK
      if (deletedNotification) {
        setState(prev => ({
          ...prev,
          notifications: [...prev.notifications, deletedNotification!].sort((a, b) => 
            new Date(b.date_creation).getTime() - new Date(a.date_creation).getTime()
          ),
          unreadCount: wasUnread ? prev.unreadCount + 1 : prev.unreadCount,
        }));
      }
      
      throw error;
    }
  }, []); // ✅ Plus de dépendances problématiques

  // 🔥 CORRIGÉ : Supprimer toutes les notifications avec état précédent
  const deleteAllNotifications = useCallback(async (): Promise<void> => {
    const previousNotifications = [...state.notifications];
    const previousUnreadCount = state.unreadCount;
    
    // 🚀 SUPPRESSION IMMÉDIATE
    setState({
      notifications: [],
      unreadCount: 0,
      loading: false,
      error: null,
    });

    try {
      await apiClient.delete('/notifications/delete-all/');
      console.log('✅ Toutes les notifications supprimées');
    } catch (error: any) {
      console.error('❌ Erreur suppression toutes:', error);
      
      // ⬅️ ROLLBACK
      setState(prev => ({
        ...prev,
        notifications: previousNotifications,
        unreadCount: previousUnreadCount,
      }));
      
      throw error;
    }
  }, []); // ✅ Plus de dépendances problématiques

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    notifications: state.notifications,
    unreadCount: state.unreadCount,
    loading: state.loading,
    error: state.error,
    fetchAllNotifications,
    fetchRecentNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    addNotification,
    clearError,
  };
};