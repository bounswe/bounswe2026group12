import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { search } from '../services/searchService';
import SearchResultCard from '../components/SearchResultCard';
import './SearchPage.css';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const region = searchParams.get('region') || '';
  const ingredient = searchParams.get('ingredient') || '';
  const mealType = searchParams.get('meal_type') || '';
  const language = searchParams.get('language') || '';

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const effectiveQ = [q, ingredient].filter(Boolean).join(' ');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    search(effectiveQ, region, language)
      .then((data) => { if (!cancelled) setResults(data); })
      .catch(() => { if (!cancelled) setError('Could not load results.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [effectiveQ, region, language]);

  const displayResults = mealType.trim()
    ? results.filter((r) =>
        r.title.toLowerCase().includes(mealType.toLowerCase())
      )
    : results;

  function removeFilter(paramKey) {
    const next = new URLSearchParams(searchParams);
    next.set(paramKey, '');
    setSearchParams(next);
  }

  const activeFilters = [
    ingredient && { label: `Ingredient: ${ingredient}`, key: 'ingredient' },
    mealType && { label: `Meal type: ${mealType}`, key: 'meal_type' },
    region && { label: `Region: ${region}`, key: 'region' },
  ].filter(Boolean);

  return (
    <main className="page-card search-page">
      <h1 className="search-heading">
        {q ? `Search results for "${q}"` : 'Search Results'}
      </h1>

      {activeFilters.length > 0 && (
        <div className="filter-chips" aria-label="Active filters">
          {activeFilters.map(({ label, key }) => (
            <button
              key={key}
              className="filter-chip"
              onClick={() => removeFilter(key)}
              aria-label={`Remove ${label} filter`}
            >
              {label} ×
            </button>
          ))}
        </div>
      )}

      {loading && <p className="search-status">Loading…</p>}
      {error && <p className="search-status search-error">{error}</p>}
      {!loading && !error && displayResults.length === 0 && (
        <p className="search-status search-empty">No results found. Try a different keyword or region.</p>
      )}
      {!loading && !error && displayResults.length > 0 && (
        <section className="results-grid">
          {displayResults.map((result) => (
            <SearchResultCard key={`${result.type}-${result.id}`} result={result} />
          ))}
        </section>
      )}
    </main>
  );
}
