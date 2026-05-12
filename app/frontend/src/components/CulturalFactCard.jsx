import './CulturalFactCard.css';

export default function CulturalFactCard({ fact }) {
  if (!fact) return null;
  return (
    <article className="cultural-fact-card">
      <header className="cultural-fact-header">
        <span className="cultural-fact-icon" aria-hidden="true">💡</span>
        <span className="cultural-fact-eyebrow">Did You Know?</span>
      </header>
      <p className="cultural-fact-text">{fact.text}</p>
      {fact.source_url && (
        <a
          className="cultural-fact-source"
          href={fact.source_url}
          target="_blank"
          rel="noopener noreferrer"
        >
          Source ↗
        </a>
      )}
    </article>
  );
}
