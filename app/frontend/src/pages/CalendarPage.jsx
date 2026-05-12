import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchCulturalEvents } from '../services/culturalEventService';
import { parseEventDate } from '../services/calendarService';
import { fetchRegions } from '../services/searchService';
import './CalendarPage.css';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function ruleFromEvent(event) {
  const r = event.date_rule;
  if (typeof r !== 'string') return null;
  if (r.startsWith('fixed:')) return r.slice('fixed:'.length);
  return r;
}

export default function CalendarPage() {
  const [regions, setRegions] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState('');
  const [region, setRegion] = useState('');
  const [selected, setSelected] = useState(null);
  const detailRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    fetchRegions().then((data) => { if (!cancelled) setRegions(data); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selected) return;
    if (typeof detailRef.current?.scrollIntoView === 'function') {
      detailRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selected]);

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
    const movable = [];
    for (const event of events) {
      const rule = ruleFromEvent(event);
      const parsed = parseEventDate(rule);
      if (!parsed) continue;
      if (parsed.isLunar && parsed.lunarUnresolved) {
        movable.push({ event, parsed });
        continue;
      }
      if (Number.isInteger(parsed.monthIndex) && parsed.monthIndex >= 0 && parsed.monthIndex <= 11) {
        byMonth[parsed.monthIndex].push({ event, parsed });
      }
    }
    return { byMonth, movable };
  }, [events]);

  return (
    <main className="page-card calendar-page">
      <header className="calendar-page-header">
        <h1>Cultural Food Calendar</h1>
        <p className="calendar-page-subtitle">
          Explore which foods belong to which seasons, rituals and celebrations.
        </p>
      </header>

      <ul className="calendar-legend" aria-label="Date legend">
        <li>
          <span className="calendar-event-badge" aria-hidden="true">Mar 21</span>
          Gregorian date
        </li>
        <li>
          <span className="calendar-event-badge is-lunar" aria-hidden="true">Mar 19</span>
          Lunar / movable feast
        </li>
      </ul>

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
        {(month
          ? [parseInt(month, 10) - 1].filter((i) => i >= 0 && i <= 11)
          : MONTHS.map((_, i) => i)
        ).map((idx) => {
          const label = MONTHS[idx];
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
                  {monthEvents.map(({ event, parsed }) => (
                    <CalendarEventCard
                      key={event.id}
                      event={event}
                      parsed={parsed}
                      onSelect={() => setSelected(event)}
                    />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {grouped.movable.length > 0 && (
        <section className="calendar-lunar" data-testid="calendar-lunar">
          <h2>Lunar / movable feasts</h2>
          <p className="calendar-lunar-note">
            These shift each year — check a current lunar calendar for the exact day.
          </p>
          <ul>
            {grouped.movable.map(({ event, parsed }) => (
              <CalendarEventCard
                key={event.id}
                event={event}
                parsed={parsed}
                onSelect={() => setSelected(event)}
              />
            ))}
          </ul>
        </section>
      )}

      {selected && (
        <aside ref={detailRef} className="calendar-event-detail" data-testid="event-detail">
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

function CalendarEventCard({ event, parsed, onSelect }) {
  const isLunar = Boolean(parsed?.isLunar);
  const isMovable = isLunar && parsed?.lunarUnresolved;
  const dateLabel = isMovable
    ? '(movable)'
    : `${MONTHS[parsed.monthIndex].slice(0, 3)} ${parsed.day}`;

  return (
    <li>
      <button
        type="button"
        className="calendar-event-card"
        aria-label={`Open ${event.name} details`}
        onClick={onSelect}
      >
        <span className={`calendar-event-badge${isLunar ? ' is-lunar' : ''}`}>
          {dateLabel}
        </span>
        <span className="calendar-event-name">{event.name}</span>
        {event.region?.name && (
          <span className="calendar-event-region">{event.region.name}</span>
        )}
      </button>
    </li>
  );
}
