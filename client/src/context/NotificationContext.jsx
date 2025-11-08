import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from '../services/notificationService';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const latestNotificationId = useRef(null);
  const notificationsRef = useRef([]);

  const updateUnreadCount = useCallback((items) => {
    setUnreadCount(items.filter((n) => !n.readAt).length);
  }, []);

  const loadNotifications = useCallback(async () => {
    // Don't fetch notifications if user is not authenticated
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    setLoading(true);
    try {
      const items = await fetchNotifications({ take: 30 });
      if (latestNotificationId.current && items.length) {
        const newest = items[0];
        if (newest.id !== latestNotificationId.current) {
          const existingIds = new Set((notificationsRef.current || []).map((n) => n.id));
          const newOnes = items.filter((item) => !existingIds.has(item.id));
          newOnes.forEach((notification) => {
            const payload = notification.payload || {};
            const title = payload.title || 'Notification';
            const message = payload.message || '';
            const text = message ? `${title}: ${message}` : title;
            switch ((notification.type || '').toLowerCase()) {
              case 'success':
                toast.success(text);
                break;
              case 'warning':
              case 'error':
                toast.error(text);
                break;
              case 'info':
              default:
                toast(text);
            }
          });
        }
      }
      if (items.length) {
        latestNotificationId.current = items[0].id;
      }
      setNotifications(items);
      notificationsRef.current = items;
      updateUnreadCount(items);
    } catch (err) {
      if (err?.response?.status !== 401 && err?.response?.status !== 403) {
        console.error('Failed to load notifications', err);
      }
    } finally {
      setLoading(false);
    }
  }, [updateUnreadCount, user]);

  useEffect(() => {
    // Only fetch notifications if user is authenticated
    if (user) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 30000);
      return () => clearInterval(interval);
    } else {
      // Clear notifications when user logs out
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [loadNotifications, user]);

  const markRead = useCallback(async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark notifications as read', err);
    }
  }, []);

  const value = {
    notifications,
    unreadCount,
    loading,
    refresh: loadNotifications,
    markRead,
    markAllRead
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return ctx;
};

