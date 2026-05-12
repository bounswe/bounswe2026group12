import { Link } from 'react-router-dom';
import './DailyCulturalSection.css';

const KIND_CONFIG = {
  fact:      { emoji: '🌿', colorClass: 'card-fact',      label: 'Fact' },
  tradition: { emoji: '🕯️', colorClass: 'card-tradition', label: 'Tradition' },
  holiday:   { emoji: '🎉', colorClass: 'card-holiday',   label: 'Holiday' },
  dish:      { emoji: '🍽️', colorClass: 'card-dish',      label: 'Dish' },
};
const FALLBACK = { emoji: '🌍', colorClass: 'card-default', label: 'Culture' };

// Always route Read more to the dedicated highlight detail page. The backend
// ships an optional `link: { kind, id }` per card, but its target may have
// been deleted between when the highlight was authored and when the user
// clicks — sending the user straight to /recipes/:id only to greet them with
// "could not load recipe" is worse than landing on the highlight page where
// the body is always available. The detail page itself surfaces the linked
// content as a secondary action.
function targetForItem(item) {
  return `/highlights/${encodeURIComponent(item.id)}`;
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
          const href = targetForItem(item);
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
                <Link to={href} className="card-read-more">
                  Read more →
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
