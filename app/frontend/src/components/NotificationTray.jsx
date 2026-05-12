import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { NotificationContext } from '../context/NotificationContext';
import './NotificationTray.css';

const ICONS = {
  question: '💬',
  reply: '↪',
  rating: '★',
};

function iconFor(type) {
  return ICONS[type] ?? '🔔';
}

function formatRelativeDate(isoDate) {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMinutes = Math.floor((now - date) / 60000);
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function getNotificationLink(notification) {
  if (notification.recipeId) return `/recipes/${notification.recipeId}`;
  return '/inbox';
}

function getNotificationText(notification) {
  if (notification.message) return notification.message;
  if (notification.recipeTitle) return `New activity on ${notification.recipeTitle}`;
  return 'You have a new notification';
}

export default function NotificationTray() {
  const { notifications, unreadCount, loading, error, markRead, markAllRead } = useContext(NotificationContext);
  const [open, setOpen] = useState(false);
  const trayRef = useRef(null);

  useEffect(() => {
    function onDocumentClick(event) {
      if (!trayRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocumentClick);
    return () => document.removeEventListener('mousedown', onDocumentClick);
  }, []);

  const sortedNotifications = useMemo(
    () => [...notifications].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [notifications]
  );

  return (
    <div className="notification-tray" ref={trayRef}>
      <button
        type="button"
        className="notification-toggle"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span aria-hidden="true">🔔</span>
        {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
      </button>

      {open && (
        <section className="notification-panel" aria-label="Notification list">
          <header className="notification-header">
            <h2>Notifications</h2>
            {unreadCount > 0 && (
              <button
                type="button"
                className="notification-mark-all"
                onClick={() => markAllRead()}
              >
                Mark all read
              </button>
            )}
          </header>

          {loading && <p className="notification-status">Loading…</p>}
          {error && <p className="notification-status notification-error">{error}</p>}
          {!loading && !error && sortedNotifications.length === 0 && (
            <p className="notification-status">No notifications yet.</p>
          )}

          {!loading && !error && sortedNotifications.length > 0 && (
            <ul className="notification-list">
              {sortedNotifications.map((item) => (
                <li key={item.id}>
                  <Link
                    to={getNotificationLink(item)}
                    className={`notification-item ${item.isRead ? 'notification-item-read' : ''}`}
                    onClick={() => {
                      markRead(item.id);
                      setOpen(false);
                    }}
                  >
                    <span className="notification-icon" aria-hidden="true">{iconFor(item.type)}</span>
                    <p className="notification-message">{getNotificationText(item)}</p>
                    <span className="notification-time">{formatRelativeDate(item.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

