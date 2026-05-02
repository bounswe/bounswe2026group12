import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchEventDetail } from '../services/exploreService';
import './EventDetailPage.css';

const TABS = ['all', 'recipe', 'story'];
const RELIGIONS = ['Muslim', 'Christian', 'Jewish', 'Secular', 'Universal'];

function FilterChip({ label, active, onClick }) {
  return (
    <button
      className={`filter-chip${active ? ' active' : ''}`}
      onClick={onClick}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

export default function EventDetailPage() {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('all');
  const [selectedReligion, setSelectedReligion] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSelectedReligion(null);
    setSelectedRegion(null);
    fetchEventDetail(eventId)
      .then((data) => { if (!cancelled) setEvent(data); })
      .catch(() => { if (!cancelled) setError('Could not load event content.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [eventId]);

  const availableRegions = useMemo(() => {
    if (!event) return [];
    return [...new Set(event.featured.map((i) => i.region).filter(Boolean))].sort();
  }, [event]);

  const availableReligions = useMemo(() => {
    if (!event) return [];
    const present = new Set(event.featured.map((i) => i.religion).filter(Boolean));
    return RELIGIONS.filter((r) => present.has(r));
  }, [event]);

  const items = useMemo(() => {
    if (!event) return [];
    return event.featured.filter((item) => {
      if (tab !== 'all' && item.type !== tab) return false;
      if (selectedReligion && item.religion !== selectedReligion) return false;
      if (selectedRegion && item.region !== selectedRegion) return false;
      return true;
    });
  }, [event, tab, selectedReligion, selectedRegion]);

  const hasActiveFilter = selectedReligion || selectedRegion;

  if (loading) return <p className="page-status">Loading…</p>;
  if (error) return <p className="page-status page-error">{error}</p>;
  if (!event) return null;

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

      {/* Type tabs */}
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
              {event.featured.filter((i) => t === 'all' || i.type === t).length}
            </span>
          </button>
        ))}
      </div>

      {/* Cultural filters (#388) */}
      {(availableReligions.length > 0 || availableRegions.length > 0) && (
        <div className="cultural-filters">
          <div className="cultural-filters-row">
            {availableReligions.length > 0 && (
              <div className="filter-group">
                <span className="filter-group-label">Religion</span>
                <div className="filter-chips">
                  {availableReligions.map((r) => (
                    <FilterChip
                      key={r}
                      label={r}
                      active={selectedReligion === r}
                      onClick={() => setSelectedReligion(selectedReligion === r ? null : r)}
                    />
                  ))}
                </div>
              </div>
            )}
            {availableRegions.length > 0 && (
              <div className="filter-group">
                <span className="filter-group-label">Region</span>
                <div className="filter-chips">
                  {availableRegions.map((r) => (
                    <FilterChip
                      key={r}
                      label={r}
                      active={selectedRegion === r}
                      onClick={() => setSelectedRegion(selectedRegion === r ? null : r)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          {hasActiveFilter && (
            <button
              className="filter-clear"
              onClick={() => { setSelectedReligion(null); setSelectedRegion(null); }}
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <p className="page-status">
          {hasActiveFilter ? 'No results for this combination.' : `No ${tab}s for this event yet.`}
        </p>
      ) : (
        <div className="event-detail-grid">
          {items.map((item) => {
            const href = item.type === 'recipe' ? `/recipes/${item.id}` : `/stories/${item.id}`;
            return (
              <Link to={href} key={`${item.type}-${item.id}`} className="event-detail-card">
                <div className="event-detail-card-placeholder" />
                <div className="event-detail-card-body">
                  <div className="event-detail-card-badges">
                    <span className={`explore-card-type ${item.type}`}>{item.type}</span>
                    {item.religion && item.religion !== 'Universal' && (
                      <span className="event-detail-card-religion">{item.religion}</span>
                    )}
                  </div>
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
