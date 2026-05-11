import { useState, useEffect, useContext } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { fetchThreads, createThread } from '../services/messageService';
import { extractApiError } from '../services/api';
import './InboxPage.css';

function formatDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function InboxPage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const isCompose = searchParams.get('compose') === 'true';
  const toUserId = Number(searchParams.get('to'));
  const toUsername = searchParams.get('toUsername') || '';
  const recipeId = Number(searchParams.get('recipeId'));
  const recipeTitle = searchParams.get('recipeTitle') || '';

  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [composeBody, setComposeBody] = useState('');
  const [sending, setSending] = useState(false);
  const [composeError, setComposeError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchThreads()
      .then((data) => { if (!cancelled) setThreads(data); })
      .catch(() => { if (!cancelled) setError('Could not load inbox.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function handleSend(e) {
    e.preventDefault();
    if (!composeBody.trim()) return;
    setSending(true);
    setComposeError('');
    try {
      const thread = await createThread({
        toUserId,
        toUsername,
        recipeId,
        recipeTitle,
        body: composeBody.trim(),
      });
      navigate(`/inbox/${thread.id}`);
    } catch (err) {
      setComposeError(extractApiError(err, 'Failed to send message. Please try again.'));
      setSending(false);
    }
  }

  return (
    <main className="page-card inbox-page">
      <h1 className="inbox-title">Inbox</h1>

      {isCompose && (
        <section className="inbox-compose">
          <div className="compose-meta">
            <span className="compose-label">To:</span>
            <span className="compose-recipient">@{toUsername}</span>
            {recipeTitle && (
              <>
                <span className="compose-label">Re:</span>
                <span className="compose-recipe">{recipeTitle}</span>
              </>
            )}
          </div>
          <form onSubmit={handleSend} className="compose-form">
            <textarea
              className="compose-textarea"
              placeholder="Write your message…"
              value={composeBody}
              onChange={(e) => setComposeBody(e.target.value)}
              rows={4}
              required
            />
            {composeError && <p className="compose-error">{composeError}</p>}
            <div className="compose-actions">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => navigate('/inbox')}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={sending}>
                {sending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </form>
        </section>
      )}

      {loading && <p className="page-status">Loading…</p>}
      {error && <p className="page-status page-error">{error}</p>}

      {!loading && !error && threads.length === 0 && !isCompose && (
        <p className="inbox-empty">No messages yet. Contact a recipe author to start a conversation.</p>
      )}

      {threads.length > 0 && (
        <ul className="thread-list">
          {threads.map((thread) => (
            <li key={thread.id}>
              <Link to={`/inbox/${thread.id}`} className="thread-row">
                <div className="thread-avatar" aria-hidden="true">
                  {thread.otherUser.username[0].toUpperCase()}
                </div>
                <div className="thread-info">
                  <div className="thread-header-row">
                    <span className="thread-username">@{thread.otherUser.username}</span>
                    {thread.lastMessage && (
                      <span className="thread-date">
                        {formatDate(thread.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  {thread.recipe && (
                    <span className="thread-recipe-context">Re: {thread.recipe.title}</span>
                  )}
                  {thread.lastMessage && (
                    <p className="thread-preview">
                      {thread.lastMessage.senderId === user?.id ? 'You: ' : ''}
                      {thread.lastMessage.body}
                    </p>
                  )}
                </div>
                {thread.unreadCount > 0 && (
                  <span className="thread-unread">{thread.unreadCount}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
