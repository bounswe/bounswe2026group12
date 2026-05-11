import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from './AuthContext';
import { fetchNotifications, markAllAsRead, markNotificationAsRead } from '../services/notificationService';

export const NotificationContext = createContext({
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: '',
  refreshNotifications: async () => {},
  markRead: async () => {},
  markAllRead: async () => {},
});

export function NotificationProvider({ children }) {
  const { token } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refreshNotifications = useCallback(async () => {
    if (!token) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const items = await fetchNotifications();
      setNotifications(items);
    } catch {
      setError('Could not load notifications.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  const markRead = useCallback(async (id) => {
    const current = notifications.find((item) => item.id === id);
    if (!current || current.isRead) return;
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    try {
      const updated = await markNotificationAsRead(id);
      if (updated) {
        setNotifications((prev) => prev.map((n) => (n.id === id ? updated : n)));
      }
    } catch {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: false } : n)));
    }
  }, [notifications]);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => (n.isRead ? n : { ...n, isRead: true })));
    try {
      await markAllAsRead();
    } catch {
      // swallow — UI will be re-fetched on next mount
    }
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      error,
      refreshNotifications,
      markRead,
      markAllRead,
    }),
    [notifications, unreadCount, loading, error, refreshNotifications, markRead, markAllRead]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}
