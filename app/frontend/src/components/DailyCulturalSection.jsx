import './DailyCulturalSection.css';

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
        {items.map((item) => (
          <article key={item.id} className="daily-cultural-card">
            <h3>{item.title}</h3>
            {item.body && <p>{item.body}</p>}
            {item.tags.length > 0 && (
              <div className="daily-cultural-tags">
                {item.tags.map((tag) => <span key={tag}>{tag}</span>)}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

