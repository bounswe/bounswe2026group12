import { useState, useEffect, useContext, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { fetchMessages, sendMessage, markThreadRead } from '../services/messageService';
import './ThreadPage.css';

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDay(iso) {
  return new Date(iso).toLocaleDateString([], {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

export default function ThreadPage() {
  const { threadId } = useParams();
  const { user } = useContext(AuthContext);
  const bottomRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchMessages(threadId)
      .then((data) => {
        if (!cancelled) setMessages(data);
        markThreadRead(threadId).catch(() => {});
      })
      .catch(() => { if (!cancelled) setError('Could not load messages.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [threadId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    if (!body.trim() || sending) return;
    setSending(true);
    try {
      const msg = await sendMessage(threadId, body.trim());
      setMessages((prev) => [...prev, msg]);
      setBody('');
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  }

  const groupedByDay = messages.reduce((acc, msg) => {
    const day = new Date(msg.createdAt).toDateString();
    if (!acc[day]) acc[day] = [];
    acc[day].push(msg);
    return acc;
  }, {});

  return (
    <main className="thread-page">
      <div className="thread-topbar">
        <Link to="/inbox" className="thread-back">← Inbox</Link>
      </div>

      <div className="thread-messages">
        {loading && <p className="page-status">Loading…</p>}
        {error && <p className="page-status page-error">{error}</p>}

        {Object.entries(groupedByDay).map(([day, msgs]) => (
          <div key={day}>
            <div className="thread-day-divider">
              <span>{formatDay(msgs[0].createdAt)}</span>
            </div>
            {msgs.map((msg) => {
              const isMine = user && msg.sender.id === user.id;
              return (
                <div key={msg.id} className={`bubble-row ${isMine ? 'mine' : 'theirs'}`}>
                  {!isMine && (
                    <div className="bubble-avatar" aria-hidden="true">
                      {msg.sender.username[0].toUpperCase()}
                    </div>
                  )}
                  <div className="bubble-wrap">
                    {!isMine && (
                      <span className="bubble-sender">@{msg.sender.username}</span>
                    )}
                    <div className={`bubble ${isMine ? 'bubble-mine' : 'bubble-theirs'}`}>
                      {msg.body}
                    </div>
                    <span className="bubble-time">{formatTime(msg.createdAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form className="thread-send-bar" onSubmit={handleSend}>
        <textarea
          className="send-input"
          placeholder="Write a message… (Enter to send)"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          required
        />
        <button type="submit" className="btn btn-primary send-btn" disabled={sending || !body.trim()}>
          Send
        </button>
      </form>
    </main>
  );
}
