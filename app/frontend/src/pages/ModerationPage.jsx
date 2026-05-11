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
};

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ModerationPage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (!user.is_staff) { setLoading(false); return; }
    fetchModerationQueue()
      .then(setQueue)
      .finally(() => setLoading(false));
  }, [user, navigate]);

  const handle = async (id, action) => {
    setProcessing(id);
    try {
      if (action === 'approve') await approveTag(id);
      else await rejectTag(id);
      const updated = await fetchModerationQueue();
      setQueue(updated);
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
                      onClick={() => handle(item.id, 'approve')}
                    >
                      Approve
                    </button>
                    <button
                      className="btn btn-sm mod-btn-reject"
                      disabled={processing === item.id}
                      onClick={() => handle(item.id, 'reject')}
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
