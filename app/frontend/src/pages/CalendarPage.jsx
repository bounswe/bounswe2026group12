import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { fetchCulturalEvents, parseEventDate } from '../services/calendarService';
import { extractApiError } from '../services/api';
import './CalendarPage.css';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

const MOVABLE_KEY = '__movable__';

export default function CalendarPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [regionFilter, setRegionFilter] = useState('');

  useEffect(() => {
    fetchCulturalEvents()
      .then(setEvents)
      .catch(err => setError(extractApiError(err, 'Could not load events.')))
      .finally(() => setLoading(false));
  }, []);

  const regions = useMemo(() => {
    const names = new Set();
    events.forEach(e => { if (e.region?.name) names.add(e.region.name); });
    return [...names].sort();
  }, [events]);

  const filtered = useMemo(() => {
    return regionFilter ? events.filter(e => e.region?.name === regionFilter) : events;
  }, [events, regionFilter]);

  // Group events by month index, unresolved lunar → movable bucket
  const byMonth = useMemo(() => {
    const map = {};
    for (const ev of filtered) {
      const parsed = parseEventDate(ev.date_rule);
      const key = (!parsed || parsed.lunarUnresolved) ? MOVABLE_KEY : parsed.monthIndex;
      if (!map[key]) map[key] = [];
      map[key].push({ ev, parsed });
    }
    return map;
  }, [filtered]);

  const monthsToShow = selectedMonth !== null
    ? [selectedMonth]
    : [...Array(12).keys()];

  if (loading) return <p className="page-status">Loading…</p>;
  if (error) return <p className="page-status page-status-error">{error}</p>;

  return (
    <main className="page-card calendar-page">
      <h1 className="calendar-title">Cultural Food Calendar</h1>
      <p className="calendar-subtitle">Seasonal traditions, ritual meals, and cultural food events.</p>

      <div className="calendar-filters">
        <div className="calendar-filter-group">
          <label htmlFor="cal-region">Region</label>
          <select
            id="cal-region"
            value={regionFilter}
            onChange={e => setRegionFilter(e.target.value)}
          >
            <option value="">All regions</option>
            {regions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="calendar-filter-group">
          <label htmlFor="cal-month">Month</label>
          <select
            id="cal-month"
            value={selectedMonth ?? ''}
            onChange={e => setSelectedMonth(e.target.value === '' ? null : Number(e.target.value))}
          >
            <option value="">All months</option>
            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
        </div>
      </div>

      <div className="calendar-grid">
        {monthsToShow.map(mi => {
          const entries = byMonth[mi] ?? [];
          if (entries.length === 0 && selectedMonth === null) return null;
          return (
            <div key={mi} className="calendar-month">
              <h2 className="calendar-month-name">{MONTHS[mi]}</h2>
              {entries.length === 0
                ? <p className="calendar-empty">No events this month.</p>
                : entries.map(({ ev, parsed }) => (
                    <button
                      key={ev.id}
                      type="button"
                      className={`calendar-event-card${selectedEvent?.id === ev.id ? ' selected' : ''}`}
                      onClick={() => setSelectedEvent(selectedEvent?.id === ev.id ? null : ev)}
                    >
                      <div className="calendar-event-top">
                        <span className={`calendar-event-badge${parsed?.isLunar ? ' lunar' : ''}`}>
                          {parsed?.isLunar ? '☾' : parsed?.day ?? '?'}
                        </span>
                        <span className="calendar-event-name">{ev.name}</span>
                        {ev.region?.name && (
                          <span className="calendar-event-region">{ev.region.name}</span>
                        )}
                      </div>
                      {parsed?.isLunar && !parsed?.lunarUnresolved && (
                        <p className="calendar-lunar-subline">
                          ☾ On the lunar calendar: {ev.name} this year
                        </p>
                      )}
                      {parsed?.lunarUnresolved && (
                        <p className="calendar-lunar-subline movable">(movable feast)</p>
                      )}
                    </button>
                  ))
              }
            </div>
          );
        })}

        {/* Movable feasts bucket */}
        {byMonth[MOVABLE_KEY]?.length > 0 && selectedMonth === null && (
          <div className="calendar-month calendar-movable">
            <h2 className="calendar-month-name">Lunar / Movable Feasts</h2>
            {byMonth[MOVABLE_KEY].map(({ ev }) => (
              <button
                key={ev.id}
                type="button"
                className={`calendar-event-card${selectedEvent?.id === ev.id ? ' selected' : ''}`}
                onClick={() => setSelectedEvent(selectedEvent?.id === ev.id ? null : ev)}
              >
                <div className="calendar-event-top">
                  <span className="calendar-event-badge lunar">☾</span>
                  <span className="calendar-event-name">{ev.name}</span>
                </div>
                <p className="calendar-lunar-subline movable">(movable — date varies by year)</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Event detail panel */}
      {selectedEvent && (
        <div className="calendar-detail">
          <div className="calendar-detail-header">
            <h2>{selectedEvent.name}</h2>
            <button type="button" className="calendar-detail-close" onClick={() => setSelectedEvent(null)}>✕</button>
          </div>
          {selectedEvent.region?.name && (
            <p className="calendar-detail-region">📍 {selectedEvent.region.name}</p>
          )}
          {selectedEvent.description && (
            <p className="calendar-detail-desc">{selectedEvent.description}</p>
          )}
          {selectedEvent.recipes?.length > 0 && (
            <div className="calendar-detail-recipes">
              <h3>Related Recipes</h3>
              <ul>
                {selectedEvent.recipes.map(r => (
                  <li key={r.id}>
                    <Link to={`/recipes/${r.id}`}>🍽 {r.title}</Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
