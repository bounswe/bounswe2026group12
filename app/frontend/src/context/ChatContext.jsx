import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AuthContext } from './AuthContext';
import { fetchThreads, markThreadRead } from '../services/messageService';

export const ChatContext = createContext({
  threads: [],
  totalUnread: 0,
  loading: false,
  markRead: () => {},
  refresh: () => {},
});

export function ChatProvider({ children }) {
  const { user } = useContext(AuthContext);
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef(null);

  const totalUnread = threads.reduce((sum, t) => sum + (t.unreadCount || 0), 0);

  const refresh = useCallback(() => {
    if (!user) return;
    fetchThreads()
      .then(setThreads)
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) {
      setThreads([]);
      return;
    }
    setLoading(true);
    fetchThreads()
      .then(setThreads)
      .catch(() => {})
      .finally(() => setLoading(false));

    intervalRef.current = setInterval(refresh, 30000);
    return () => clearInterval(intervalRef.current);
  }, [user, refresh]);

  function markRead(threadId) {
    setThreads((prev) =>
      prev.map((t) => t.id === threadId ? { ...t, unreadCount: 0 } : t)
    );
    markThreadRead(threadId).catch(() => {});
  }

  return (
    <ChatContext.Provider value={{ threads, totalUnread, loading, markRead, refresh }}>
      {children}
    </ChatContext.Provider>
  );
}
