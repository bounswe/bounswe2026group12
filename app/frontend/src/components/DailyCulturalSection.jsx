import { Link } from 'react-router-dom';
import './DailyCulturalSection.css';

const KIND_CONFIG = {
  fact:      { emoji: '🌿', colorClass: 'card-fact',      label: 'Fact' },
  tradition: { emoji: '🕯️', colorClass: 'card-tradition', label: 'Tradition' },
  holiday:   { emoji: '🎉', colorClass: 'card-holiday',   label: 'Holiday' },
  dish:      { emoji: '🍽️', colorClass: 'card-dish',      label: 'Dish' },
};
const FALLBACK = { emoji: '🌍', colorClass: 'card-default', label: 'Culture' };

// Backend ships an optional `link: { kind, id }` per card pointing at the
// recipe / story / event that owns the highlight. Map that to a real route
// so "Read more" actually opens something instead of dumping the title into
// the search box.
function targetForLink(link) {
  if (!link || !link.kind || link.id == null) return null;
  switch (String(link.kind).toLowerCase()) {
    case 'recipe': return `/recipes/${link.id}`;
    case 'story':  return `/stories/${link.id}`;
    case 'event':  return '/calendar';
    default:       return null;
  }
}

export default function DailyCulturalSection({ items, personalized }) {
  if (!items || items.length === 0) return null;

  return (
    <section className="daily-cultural-section" aria-label="Daily cultural content">
      <div className="daily-cultural-header">
        <h2>{personalized ? 'For You: Cultural Highlights' : 'Daily Cultural Highlights'}</h2>
        <p>
          {personalized
            ? 'Ranked based on your cultural profile.'
            : 'Explore curated stories and traditions from the community.'}
        </p>
      </div>

      <div className="daily-cultural-grid">
        {items.map((item, index) => {
          const config = KIND_CONFIG[item.kind] ?? FALLBACK;
          const href = targetForLink(item.link);
          return (
            <article
              key={item.id}
              className={`daily-cultural-card ${config.colorClass}`}
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="card-top-row">
                <span className="card-emoji" aria-hidden="true">{config.emoji}</span>
                <span className="card-badge">{config.label}</span>
              </div>
              <h3>{item.title}</h3>
              {item.body && <p className="card-body">{item.body}</p>}
              <div className="card-footer">
                {item.region && <span className="card-region">{item.region}</span>}
                {href && (
                  <Link to={href} className="card-read-more">
                    Read more →
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
