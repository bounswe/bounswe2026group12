import { useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChatContext } from '../context/ChatContext';
import { AuthContext } from '../context/AuthContext';
import { fetchMessages, sendMessage } from '../services/messageService';
import './ChatTray.css';

function relativeTime(isoString) {
  if (!isoString) return '';
  const diff = Math.max(0, Math.floor((Date.now() - new Date(isoString).getTime()) / 1000));
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function isRecentlyActive(isoString) {
  if (!isoString) return false;
  return Date.now() - new Date(isoString).getTime() < 5 * 60 * 1000;
}

// ─── Mini chat view ───────────────────────────────────────────────────────────
function ChatConversation({ thread, currentUser, onBack }) {
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    fetchMessages(thread.id)
      .then(setMessages)
      .catch(() => {});
  }, [thread.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async () => {
    const trimmed = body.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setBody('');
    try {
      const msg = await sendMessage(thread.id, trimmed);
      setMessages((prev) => [...prev, msg]);
    } catch {
      setBody(trimmed);
    } finally {
      setSending(false);
    }
  }, [body, sending, thread.id]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <div className="chat-conv">
      <div className="chat-conv-header">
        <button type="button" className="chat-conv-back" onClick={onBack} aria-label="Back">
          ←
        </button>
        <span className="chat-conv-username">@{thread.otherUser?.username}</span>
      </div>

      <div className="chat-conv-messages">
        {messages.length === 0 && (
          <p className="chat-conv-empty">No messages yet.</p>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender?.id === currentUser?.id;
          return (
            <div key={msg.id} className={`chat-msg${isMe ? ' chat-msg-me' : ''}`}>
              <span className="chat-msg-body">{msg.body}</span>
              <span className="chat-msg-time">{relativeTime(msg.createdAt)}</span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="chat-conv-input-row">
        <textarea
          className="chat-conv-input"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message…"
          rows={1}
          disabled={sending}
        />
        <button
          type="button"
          className="chat-conv-send"
          onClick={handleSend}
          disabled={!body.trim() || sending}
          aria-label="Send"
        >
          →
        </button>
      </div>
    </div>
  );
}

// ─── Main tray ────────────────────────────────────────────────────────────────
export default function ChatTray() {
  const { user } = useContext(AuthContext);
  const { threads, totalUnread, loading, markRead } = useContext(ChatContext);
  const [open, setOpen] = useState(false);
  const [activeThread, setActiveThread] = useState(null);
  const trayRef = useRef(null);

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
    const aT = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const bT = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return bT - aT;
  });

  function handleThreadClick(thread) {
    markRead(thread.id);
    setActiveThread(thread);
  }

  function handleToggle() {
    setOpen((o) => {
      if (o) setActiveThread(null);
      return !o;
    });
  }

  return (
    <div className="chat-tray" ref={trayRef}>

      {/* Panel — yukarı açılır */}
      {open && (
        <div className="chat-tray-panel" role="dialog" aria-label="Messages">
          {activeThread ? (
            <ChatConversation
              thread={activeThread}
              currentUser={user}
              onBack={() => setActiveThread(null)}
            />
          ) : (
            <>
              <div className="chat-tray-list">
                {loading && sorted.length === 0 && (
                  <p className="chat-tray-status">Loading…</p>
                )}
                {!loading && sorted.length === 0 && (
                  <p className="chat-tray-status">No conversations yet.</p>
                )}
                {sorted.map((thread) => {
                  const active = isRecentlyActive(thread.lastMessage?.createdAt);
                  const preview = thread.lastMessage?.body
                    ? thread.lastMessage.body.slice(0, 40) + (thread.lastMessage.body.length > 40 ? '…' : '')
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
                        {active && <span className="chat-tray-online" />}
                      </div>
                      <div className="chat-tray-thread-body">
                        <div className="chat-tray-thread-top">
                          <span className="chat-tray-uname">@{thread.otherUser?.username}</span>
                          <span className="chat-tray-time">{relativeTime(thread.lastMessage?.createdAt)}</span>
                        </div>
                        <div className="chat-tray-thread-bottom">
                          <span className="chat-tray-preview">{preview}</span>
                          {thread.unreadCount > 0 && (
                            <span className="chat-tray-unread">{thread.unreadCount}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="chat-tray-footer">
                <Link to="/inbox" className="chat-tray-viewall" onClick={() => setOpen(false)}>
                  View all messages →
                </Link>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab bar — her zaman görünür */}
      <button
        type="button"
        className="chat-tray-tab"
        onClick={handleToggle}
        aria-expanded={open}
        aria-label={`Messages${totalUnread > 0 ? `, ${totalUnread} unread` : ''}`}
      >
        <svg className="chat-tray-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z" />
        </svg>
        <span className="chat-tray-label">Messages</span>
        {totalUnread > 0 && (
          <span className="chat-tray-badge">{totalUnread > 99 ? '99+' : totalUnread}</span>
        )}
        <span className={`chat-tray-chevron${open ? ' open' : ''}`} aria-hidden="true" />
      </button>

    </div>
  );
}
