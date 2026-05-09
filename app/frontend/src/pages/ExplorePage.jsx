import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchExploreEvents } from '../services/exploreService';
import './ExplorePage.css';

function ContentCard({ item }) {
  const href = item.type === 'recipe' ? `/recipes/${item.id}` : `/stories/${item.id}`;
  return (
    <Link to={href} className="explore-card">
      <div className="explore-card-placeholder" />
      <div className="explore-card-body">
        <span className={`explore-card-type ${item.type}`}>{item.type}</span>
        <p className="explore-card-title">{item.title}</p>
        <p className="explore-card-author">@{item.author_username}</p>
      </div>
    </Link>
  );
}

function EventRail({ event }) {
  return (
    <section className="event-rail">
      <div className="event-rail-header">
        <span className="event-rail-emoji" aria-hidden="true">{event.emoji}</span>
        <h2 className="event-rail-name">{event.name}</h2>
        <Link to={`/explore/${event.id}`} className="event-rail-see-all">
          See all →
        </Link>
      </div>
      <div className="event-rail-scroll">
        {event.featured.map((item) => (
          <ContentCard key={`${item.type}-${item.id}`} item={item} />
        ))}
      </div>
    </section>
  );
}

export default function ExplorePage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchExploreEvents()
      .then((data) => { if (!cancelled) setEvents(data); })
      .catch(() => { if (!cancelled) setError('Could not load explore content.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <p className="page-status">Loading…</p>;
  if (error) return <p className="page-status page-error">{error}</p>;

  return (
    <main className="page-card explore-page">
      <div className="explore-page-header">
        <h1>Explore</h1>
        <p className="explore-page-subtitle">
          Discover recipes and stories curated around life's most meaningful moments.
        </p>
      </div>
      <div className="explore-rails">
        {events.map((event) => (
          <EventRail key={event.id} event={event} />
        ))}
      </div>
    </main>
  );
}
