import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchDailyCulturalContent } from '../services/culturalContentService';
import './CulturalHighlightPage.css';

const KIND_LABEL = {
  fact: 'Fact',
  tradition: 'Tradition',
  holiday: 'Holiday',
  dish: 'Dish',
};

export default function CulturalHighlightPage() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchDailyCulturalContent()
      .then((items) => {
        if (cancelled) return;
        const match = items.find((it) => String(it.id) === String(id));
        if (!match) setError('not_found');
        else setItem(match);
      })
      .catch(() => {
        if (!cancelled) setError('load_failed');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <p className="page-status">Loading…</p>;

  if (error === 'load_failed') {
    return <p className="page-status page-error">Could not load this highlight.</p>;
  }

  if (error === 'not_found' || !item) {
    return (
      <main className="page-card cultural-highlight not-found">
        <h1>Highlight not found</h1>
        <p>This cultural highlight is no longer available.</p>
        <Link to="/explore" className="btn btn-outline">Back to Explore</Link>
      </main>
    );
  }

  const kindLabel = item.kind ? KIND_LABEL[item.kind] ?? null : null;

  return (
    <main className="page-card cultural-highlight">
      <p className="cultural-highlight-back">
        <Link to="/explore">← Back to Explore</Link>
      </p>

      {kindLabel && <span className="cultural-highlight-badge">{kindLabel}</span>}
      <h1>{item.title}</h1>

      {item.region && <p className="cultural-highlight-region">{item.region}</p>}

      {item.body && <p className="cultural-highlight-body">{item.body}</p>}

      {item.tags && item.tags.length > 0 && (
        <ul className="cultural-highlight-tags" aria-label="Tags">
          {item.tags.map((tag) => (
            <li key={tag} className="cultural-highlight-tag">{tag}</li>
          ))}
        </ul>
      )}
    </main>
  );
}
