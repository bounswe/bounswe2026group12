import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchEventDetail } from '../services/exploreService';
import './EventDetailPage.css';

const TABS = ['all', 'recipe', 'story'];

export default function EventDetailPage() {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('all');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchEventDetail(eventId)
      .then((data) => { if (!cancelled) setEvent(data); })
      .catch(() => { if (!cancelled) setError('Could not load event content.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [eventId]);

  if (loading) return <p className="page-status">Loading…</p>;
  if (error || !event) {
    return (
      <main className="page-card event-detail">
        <h1>Event not found</h1>
        <p>We couldn't load that event. It may have been removed.</p>
        <Link to="/explore" className="btn btn-outline btn-sm">Back to Explore</Link>
      </main>
    );
  }

  const items = tab === 'all'
    ? event.featured
    : event.featured.filter((item) => item.type === tab);

  return (
    <main className="page-card event-detail-page">
      <Link to="/explore" className="event-detail-back">← Explore</Link>

      <div className="event-detail-header">
        <span className="event-detail-emoji" aria-hidden="true">{event.emoji}</span>
        <div>
          <h1 className="event-detail-title">{event.name}</h1>
          <p className="event-detail-desc">{event.description}</p>
        </div>
      </div>

      <div className="event-detail-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={`event-tab-btn${tab === t ? ' active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'all' ? 'All' : t === 'recipe' ? 'Recipes' : 'Stories'}
            <span className="event-tab-count">
              {t === 'all'
                ? event.featured.length
                : event.featured.filter((i) => i.type === t).length}
            </span>
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="page-status">No {tab}s for this event yet.</p>
      ) : (
        <div className="event-detail-grid">
          {items.map((item) => {
            const href = item.type === 'recipe' ? `/recipes/${item.id}` : `/stories/${item.id}`;
            return (
              <Link to={href} key={`${item.type}-${item.id}`} className="event-detail-card">
                <div className="event-detail-card-placeholder" />
                <div className="event-detail-card-body">
                  <span className={`explore-card-type ${item.type}`}>{item.type}</span>
                  <p className="event-detail-card-title">{item.title}</p>
                  {item.region && (
                    <span className="event-detail-card-region">{item.region}</span>
                  )}
                  <p className="event-detail-card-author">@{item.author_username}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
