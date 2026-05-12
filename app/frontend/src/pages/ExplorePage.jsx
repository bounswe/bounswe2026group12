import { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { fetchExploreEvents } from '../services/exploreService';
import { AuthContext } from '../context/AuthContext';
import { toggleBookmark } from '../services/recipeService';
import './ExplorePage.css';

const SPARSE_RAIL_THRESHOLD = 3;

function StoryGlyph() {
  return (
    <span className="explore-card-story-glyph" aria-hidden="true" title="Story">📖</span>
  );
}

function ContentCard({ item, showRegionBadge, featured, canBookmark }) {
  const href = item.type === 'recipe' ? `/recipes/${item.id}` : `/stories/${item.id}`;
  const [imageBroken, setImageBroken] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkBusy, setBookmarkBusy] = useState(false);
  const showImage = item.image && !imageBroken;
  const isRecipe = item.type === 'recipe';

  const handleBookmark = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (bookmarkBusy) return;
    setBookmarkBusy(true);
    try {
      const result = await toggleBookmark(item.id);
      setBookmarked(Boolean(result?.is_bookmarked));
    } catch {
      // Silent: card stays linkable; bookmarking is best-effort.
    } finally {
      setBookmarkBusy(false);
    }
  };

  return (
    <Link to={href} className={`explore-card${featured ? ' explore-card-featured' : ''}`}>
      <div className="explore-card-media">
        {showImage ? (
          <img
            src={item.image}
            alt=""
            className="explore-card-image"
            loading="lazy"
            onError={() => setImageBroken(true)}
          />
        ) : (
          <div className="explore-card-placeholder" aria-hidden="true" />
        )}
        {!isRecipe && <StoryGlyph />}
        {showRegionBadge && item.region && (
          <span className="explore-card-region-badge">📍 {item.region}</span>
        )}
        {canBookmark && isRecipe && (
          <button
            type="button"
            className={`explore-card-bookmark${bookmarked ? ' active' : ''}`}
            onClick={handleBookmark}
            aria-label={bookmarked ? 'Remove bookmark' : 'Save recipe'}
            aria-pressed={bookmarked}
          >
            {bookmarked ? '🔖' : '🏷️'}
          </button>
        )}
        {(item.description || item.rank_reason) && (
          <div className="explore-card-hover">
            {item.description && <p className="explore-card-hover-text">{item.description}</p>}
            {item.rank_reason && (
              <p className="explore-card-hover-reason">
                <span aria-hidden="true">ⓘ</span> {item.rank_reason}
              </p>
            )}
          </div>
        )}
      </div>
      <div className="explore-card-body">
        <div className="explore-card-meta-row">
          <span className={`explore-card-type ${item.type}`}>{item.type}</span>
          {item.linked_recipe_id && !isRecipe && (
            <Link
              to={`/recipes/${item.linked_recipe_id}`}
              className="explore-card-linked"
              onClick={(e) => e.stopPropagation()}
            >
              → recipe
            </Link>
          )}
        </div>
        <p className="explore-card-title">{item.title}</p>
        <p className="explore-card-author">@{item.author_username}</p>
      </div>
    </Link>
  );
}

function EventRail({ event, showRegionBadge, canBookmark }) {
  const items = event.featured || [];
  const isSparse = items.length > 0 && items.length <= SPARSE_RAIL_THRESHOLD;
  const isFeatured = Boolean(event.featuredRail);
  if (!items.length) return null;
  return (
    <section
      className={`event-rail${isFeatured ? ' event-rail-featured' : ''}`}
      id={`rail-${event.id}`}
    >
      <div className="event-rail-header">
        <span className="event-rail-emoji" aria-hidden="true">{event.emoji}</span>
        <h2 className="event-rail-name">{event.name}</h2>
        {!isFeatured && (
          <Link to={`/explore/${event.id}`} className="event-rail-see-all">
            See all →
          </Link>
        )}
      </div>
      <div className={`event-rail-track${isSparse ? ' is-grid' : ' is-scroll'}${isFeatured ? ' is-featured' : ''}`}>
        {items.map((item) => (
          <ContentCard
            key={`${item.type}-${item.id}`}
            item={item}
            showRegionBadge={showRegionBadge || isFeatured}
            featured={isFeatured}
            canBookmark={canBookmark}
          />
        ))}
      </div>
    </section>
  );
}

function SkeletonRail() {
  return (
    <section className="event-rail" aria-hidden="true">
      <div className="event-rail-header">
        <span className="explore-skeleton explore-skeleton-title" />
      </div>
      <div className="event-rail-track is-scroll">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="explore-card explore-card-skeleton">
            <div className="explore-card-media">
              <div className="explore-skeleton explore-skeleton-image" />
            </div>
            <div className="explore-card-body">
              <span className="explore-skeleton explore-skeleton-pill" />
              <span className="explore-skeleton explore-skeleton-line" />
              <span className="explore-skeleton explore-skeleton-line short" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function RegionNav({ rails }) {
  const ref = useRef(null);
  const regionRails = rails.filter((r) => r.id.startsWith('region-') || r.id === 'featured');
  if (regionRails.length < 2) return null;

  const jump = (e, id) => {
    e.preventDefault();
    const el = document.getElementById(`rail-${id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <nav className="explore-region-nav" aria-label="Jump to region" ref={ref}>
      {regionRails.map((r) => (
        <a
          key={r.id}
          href={`#rail-${r.id}`}
          onClick={(e) => jump(e, r.id)}
          className="explore-region-chip"
        >
          <span aria-hidden="true">{r.emoji}</span>
          <span>{r.name}</span>
        </a>
      ))}
    </nav>
  );
}

export default function ExplorePage() {
  const { user } = useContext(AuthContext) || {};
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

  const hasContent = useMemo(
    () => events.some((r) => (r.featured || []).length > 0),
    [events],
  );

  return (
    <main className="page-card explore-page">
      <div className="explore-page-header">
        <h1>Explore</h1>
        <p className="explore-page-subtitle">
          Taste the regions of the table — recipes and stories grouped by where they come from.
        </p>
        {!user && !loading && !error && (
          <div className="explore-signin-banner">
            <Link to="/login">Sign in</Link> to see recipes from your region first.
          </div>
        )}
      </div>

      {error ? (
        <p className="page-status page-error">{error}</p>
      ) : loading ? (
        <div className="explore-rails">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonRail key={i} />)}
        </div>
      ) : !hasContent ? (
        <div className="explore-empty">
          <p className="explore-empty-title">No recipes or stories yet.</p>
          <p className="explore-empty-body">
            Explore the world's culinary regions on the map, or be the first to share.
          </p>
          <div className="explore-empty-actions">
            <Link to="/map" className="btn btn-outline btn-sm">Open the map</Link>
            <Link to="/recipes/new" className="btn btn-primary btn-sm">Share a recipe</Link>
          </div>
        </div>
      ) : (
        <>
          <RegionNav rails={events} />
          <div className="explore-rails">
            {events.map((event) => (
              <EventRail
                key={event.id}
                event={event}
                showRegionBadge={Boolean(event.showRegionBadge)}
                canBookmark={Boolean(user)}
              />
            ))}
          </div>
        </>
      )}
    </main>
  );
}
