import { useContext, useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChatContext } from '../context/ChatContext';
import { AuthContext } from '../context/AuthContext';
import './ChatTray.css';

function relativeTime(isoString) {
  if (!isoString) return '';
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function isRecentlyActive(isoString) {
  if (!isoString) return false;
  return Date.now() - new Date(isoString).getTime() < 5 * 60 * 1000;
}

export default function ChatTray() {
  const { user } = useContext(AuthContext);
  const { threads, totalUnread, loading } = useContext(ChatContext);
  const { markRead } = useContext(ChatContext);
  const [open, setOpen] = useState(false);
  const trayRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(e) {
      if (trayRef.current && !trayRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const sorted = [...threads].sort((a, b) => {
    const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return bTime - aTime;
  });

  function handleThreadClick(thread) {
    markRead(thread.id);
    setOpen(false);
    navigate(`/inbox/${thread.id}`);
  }

  return (
    <div className="chat-tray" ref={trayRef}>
      {open && (
        <div className="chat-tray-panel" role="dialog" aria-label="Messages">
          <div className="chat-tray-header">
            <span className="chat-tray-title">Messages</span>
            <Link to="/inbox" className="chat-tray-view-all" onClick={() => setOpen(false)}>
              View all →
            </Link>
          </div>

          <div className="chat-tray-list">
            {loading && threads.length === 0 && (
              <p className="chat-tray-status">Loading…</p>
            )}
            {!loading && sorted.length === 0 && (
              <p className="chat-tray-status">No conversations yet.</p>
            )}
            {sorted.map((thread) => {
              const active = isRecentlyActive(thread.lastMessage?.createdAt);
              const preview = thread.lastMessage?.body
                ? thread.lastMessage.body.slice(0, 42) + (thread.lastMessage.body.length > 42 ? '…' : '')
                : 'No messages yet';
              return (
                <button
                  key={thread.id}
                  type="button"
                  className="chat-tray-thread"
                  onClick={() => handleThreadClick(thread)}
                >
                  <div className="chat-tray-avatar-wrap">
                    <span className="chat-tray-avatar">
                      {thread.otherUser?.username?.[0]?.toUpperCase() ?? '?'}
                    </span>
                    {active && <span className="chat-tray-online" aria-label="Recently active" />}
                  </div>
                  <div className="chat-tray-thread-body">
                    <div className="chat-tray-thread-top">
                      <span className="chat-tray-username">@{thread.otherUser?.username}</span>
                      <span className="chat-tray-time">{relativeTime(thread.lastMessage?.createdAt)}</span>
                    </div>
                    <div className="chat-tray-thread-bottom">
                      <span className="chat-tray-preview">{preview}</span>
                      {thread.unreadCount > 0 && (
                        <span className="chat-tray-unread-badge">{thread.unreadCount}</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <button
        type="button"
        className="chat-tray-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Messages${totalUnread > 0 ? `, ${totalUnread} unread` : ''}`}
        aria-expanded={open}
      >
        <svg className="chat-tray-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z" />
        </svg>
        {totalUnread > 0 && (
          <span className="chat-tray-badge">{totalUnread > 99 ? '99+' : totalUnread}</span>
        )}
      </button>
    </div>
  );
}
