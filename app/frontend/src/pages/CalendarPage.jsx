import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchCulturalEvents } from '../services/culturalEventService';
import { fetchRegions } from '../services/searchService';
import './CalendarPage.css';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function parseDateRule(rule) {
  if (typeof rule !== 'string') return { kind: 'unknown' };
  if (rule.startsWith('fixed:')) {
    const [mm, dd] = rule.slice('fixed:'.length).split('-');
    const month = parseInt(mm, 10);
    return { kind: 'fixed', month, day: parseInt(dd, 10) };
  }
  if (rule.startsWith('lunar:')) {
    return { kind: 'lunar', name: rule.slice('lunar:'.length) };
  }
  return { kind: 'unknown' };
}

export default function CalendarPage() {
  const [regions, setRegions] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState('');
  const [region, setRegion] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchRegions().then((data) => { if (!cancelled) setRegions(data); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchCulturalEvents({ month, region })
      .then((data) => { if (!cancelled) setEvents(data); })
      .catch(() => { if (!cancelled) setEvents([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [month, region]);

  const grouped = useMemo(() => {
    const byMonth = Array.from({ length: 12 }, () => []);
    const lunar = [];
    for (const event of events) {
      const parsed = parseDateRule(event.date_rule);
      if (parsed.kind === 'fixed' && parsed.month >= 1 && parsed.month <= 12) {
        byMonth[parsed.month - 1].push(event);
      } else if (parsed.kind === 'lunar') {
        lunar.push(event);
      }
    }
    return { byMonth, lunar };
  }, [events]);

  return (
    <main className="page-card calendar-page">
      <header className="calendar-page-header">
        <h1>Cultural Food Calendar</h1>
        <p className="calendar-page-subtitle">
          Explore which foods belong to which seasons, rituals and celebrations.
        </p>
      </header>

      <div className="calendar-filters">
        <label className="calendar-filter">
          <span>Month</span>
          <select value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Month">
            <option value="">All months</option>
            {MONTHS.map((label, idx) => {
              const value = String(idx + 1).padStart(2, '0');
              return <option key={value} value={value}>{label}</option>;
            })}
          </select>
        </label>
        <label className="calendar-filter">
          <span>Region</span>
          <select value={region} onChange={(e) => setRegion(e.target.value)} aria-label="Region">
            <option value="">All regions</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </label>
      </div>

      {loading && <p className="page-status">Loading…</p>}

      <div className="calendar-grid">
        {MONTHS.map((label, idx) => {
          const monthEvents = grouped.byMonth[idx];
          return (
            <section
              key={label}
              className="calendar-month"
              data-testid={`calendar-month-${idx + 1}`}
            >
              <h2>{label}</h2>
              {monthEvents.length === 0 ? (
                <p className="calendar-month-empty">No events.</p>
              ) : (
                <ul>
                  {monthEvents.map((event) => (
                    <li key={event.id}>
                      <button
                        type="button"
                        className="calendar-event-card"
                        aria-label={`Open ${event.name} details`}
                        onClick={() => setSelected(event)}
                      >
                        <span className="calendar-event-name">{event.name}</span>
                        {event.region?.name && (
                          <span className="calendar-event-region">{event.region.name}</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {grouped.lunar.length > 0 && (
        <section className="calendar-lunar" data-testid="calendar-lunar">
          <h2>Lunar-Anchored Events</h2>
          <p className="calendar-lunar-note">
            Lunar dates shift each year; check a current lunar calendar for the exact day.
          </p>
          <ul>
            {grouped.lunar.map((event) => (
              <li key={event.id}>
                <button
                  type="button"
                  className="calendar-event-card"
                  aria-label={`Open ${event.name} details`}
                  onClick={() => setSelected(event)}
                >
                  <span className="calendar-event-name">{event.name}</span>
                  {event.region?.name && (
                    <span className="calendar-event-region">{event.region.name}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {selected && (
        <aside className="calendar-event-detail" data-testid="event-detail">
          <button
            type="button"
            className="calendar-event-detail-close"
            aria-label="Close details"
            onClick={() => setSelected(null)}
          >
            ×
          </button>
          <h2>{selected.name}</h2>
          <p className="calendar-event-detail-rule">{selected.date_rule}</p>
          {selected.region?.name && (
            <p className="calendar-event-detail-region">Region: {selected.region.name}</p>
          )}
          {selected.description && (
            <p className="calendar-event-detail-description">{selected.description}</p>
          )}
          {selected.recipes?.length > 0 && (
            <>
              <h3>Linked Recipes</h3>
              <ul className="calendar-event-detail-recipes">
                {selected.recipes.map((recipe) => (
                  <li key={recipe.id}>
                    <Link to={`/recipes/${recipe.id}`}>{recipe.title}</Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </aside>
      )}
    </main>
  );
}
