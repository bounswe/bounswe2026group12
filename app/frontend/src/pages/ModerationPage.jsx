import { useState, useEffect, useContext } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { fetchModerationQueue, approveTag, rejectTag } from '../services/moderationService';
import './ModerationPage.css';

const STATUS_FILTERS = ['pending', 'approved', 'rejected'];

const TAG_TYPE_LABELS = {
  region: { label: 'Region', cls: 'tag-region' },
  event: { label: 'Event', cls: 'tag-event' },
  tradition: { label: 'Tradition', cls: 'tag-tradition' },
  religion: { label: 'Religion', cls: 'tag-religion' },
};

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ModerationPage() {
  const { user, loading: authLoading } = useContext(AuthContext);
  const navigate = useNavigate();
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [processing, setProcessing] = useState(null);
  const [rejectReasons, setRejectReasons] = useState({});
  const [fetchError, setFetchError] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    if (!user.is_staff) { setLoading(false); return; }
    fetchModerationQueue()
      .then(setQueue)
      .catch(() => setFetchError('Could not load moderation queue.'))
      .finally(() => setLoading(false));
  }, [user, authLoading, navigate]);

  const handle = async (typeKey, id, action, reason = '') => {
    setProcessing(id);
    setActionError('');
    try {
      if (action === 'approve') await approveTag(typeKey, id);
      else await rejectTag(typeKey, id, reason);
      const updated = await fetchModerationQueue();
      setQueue(updated);
      if (action === 'reject') {
        setRejectReasons((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    } catch {
      setActionError(`Could not ${action} tag. Please try again.`);
    } finally {
      setProcessing(null);
    }
  };

  const filtered = queue.filter((t) => t.status === statusFilter);
  const counts = STATUS_FILTERS.reduce((acc, s) => {
    acc[s] = queue.filter((t) => t.status === s).length;
    return acc;
  }, {});

  if (user && !user.is_staff) {
    return <Navigate to="/" replace />;
  }

  if (loading) return <p className="page-status">Loading…</p>;
  if (fetchError) return <p className="page-status page-error" role="alert">{fetchError}</p>;

  return (
    <main className="page-card moderation-page">
      <div className="moderation-header">
        <h1>Cultural Tag Moderation</h1>
        <p className="moderation-subtitle">
          Review user-submitted region, event, and tradition tags before they appear in discovery surfaces.
        </p>
      </div>

      <div className="moderation-tabs" role="tablist">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={statusFilter === s}
            className={`mod-tab-btn${statusFilter === s ? ' active' : ''} mod-tab-${s}`}
            onClick={() => setStatusFilter(s)}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
            <span className="mod-tab-count">{counts[s]}</span>
          </button>
        ))}
      </div>

      {actionError && <p className="moderation-error" role="alert">{actionError}</p>}

      {filtered.length === 0 ? (
        <p className="moderation-empty">No {statusFilter} tags.</p>
      ) : (
        <ul className="moderation-list">
          {filtered.map((item) => {
            const typeInfo = TAG_TYPE_LABELS[item.tag_type] ?? { label: item.tag_type, cls: 'tag-default' };
            const isPending = item.status === 'pending';
            return (
              <li key={item.id} className={`mod-item mod-item--${item.status}`}>
                <div className="mod-item-main">
                  <span className={`mod-tag-type ${typeInfo.cls}`}>{typeInfo.label}</span>
                  <span className="mod-tag-value">"{item.tag}"</span>
                </div>
                <div className="mod-item-meta">
                  <span>by @{item.submitted_by}</span>
                  <span>{formatDate(item.submitted_at)}</span>
                </div>
                {isPending && (
                  <div className="mod-item-actions">
                    <button
                      className="btn btn-sm mod-btn-approve"
                      disabled={processing === item.id}
                      onClick={() => handle(item.tag_type, item.id, 'approve')}
                    >
                      Approve
                    </button>
                    <input
                      type="text"
                      className="mod-reject-reason"
                      placeholder="Reason (optional)"
                      value={rejectReasons[item.id] || ''}
                      onChange={(e) =>
                        setRejectReasons((prev) => ({ ...prev, [item.id]: e.target.value }))
                      }
                      aria-label={`Reject reason for ${item.tag}`}
                    />
                    <button
                      className="btn btn-sm mod-btn-reject"
                      disabled={processing === item.id}
                      onClick={() => handle(item.tag_type, item.id, 'reject', rejectReasons[item.id] || '')}
                    >
                      Reject
                    </button>
                  </div>
                )}
                {!isPending && (
                  <span className={`mod-status-badge mod-status-${item.status}`}>
                    {item.status}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
