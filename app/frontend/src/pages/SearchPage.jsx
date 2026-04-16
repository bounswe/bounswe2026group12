import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { search, fetchRegions } from '../services/searchService';
import SearchResultCard from '../components/SearchResultCard';
import './SearchPage.css';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const q = searchParams.get('q') || '';
  const region = searchParams.get('region') || '';
  const ingredient = searchParams.get('ingredient') || '';
  const mealType = searchParams.get('meal_type') || '';
  const language = searchParams.get('language') || '';

  const [localQ, setLocalQ] = useState(q);
  const [localRegion, setLocalRegion] = useState(region);
  const [localIngredient, setLocalIngredient] = useState(ingredient);
  const [localMealType, setLocalMealType] = useState(mealType);
  const [regions, setRegions] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const effectiveQ = [q, ingredient].filter(Boolean).join(' ');

  useEffect(() => {
    fetchRegions().then(setRegions).catch(() => {});
  }, []);

  useEffect(() => {
    setLocalQ(q);
    setLocalRegion(region);
    setLocalIngredient(ingredient);
    setLocalMealType(mealType);
  }, [q, region, ingredient, mealType]);

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

  function handleSubmit(e) {
    e.preventDefault();
    navigate(`/search?q=${encodeURIComponent(localQ)}&region=${encodeURIComponent(localRegion)}&ingredient=${encodeURIComponent(localIngredient)}&meal_type=${encodeURIComponent(localMealType)}&language=${encodeURIComponent(language)}`);
  }

  return (
    <main className="page-card search-page">
      <h1 className="search-heading">
        {q ? `Search results for "${q}"` : 'Search Results'}
      </h1>

      <form className="search-filter-form" onSubmit={handleSubmit} aria-label="Refine search">
        <div className="search-filter-row">
          <label htmlFor="search-refine" className="sr-only">Search</label>
          <input
            id="search-refine"
            type="search"
            value={localQ}
            onChange={(e) => setLocalQ(e.target.value)}
            placeholder="Search recipes and stories…"
            className="search-filter-input"
          />
          <button type="submit" className="btn btn-primary search-filter-btn">Search</button>
        </div>

        <div className="search-filters">
          <div className="search-filter-group">
            <label htmlFor="ingredient-filter">Ingredient</label>
            <input
              id="ingredient-filter"
              type="text"
              value={localIngredient}
              onChange={(e) => setLocalIngredient(e.target.value)}
              placeholder="e.g. yogurt"
              className="search-filter-input"
            />
          </div>

          <div className="search-filter-group">
            <label htmlFor="meal-type-filter">Meal Type</label>
            <input
              id="meal-type-filter"
              type="text"
              value={localMealType}
              onChange={(e) => setLocalMealType(e.target.value)}
              placeholder="e.g. soup"
              className="search-filter-input"
            />
          </div>

          <div className="search-filter-group">
            <label htmlFor="region-filter">Region</label>
            <select
              id="region-filter"
              value={localRegion}
              onChange={(e) => setLocalRegion(e.target.value)}
              className="search-filter-select"
            >
              <option value="">All regions</option>
              {regions.map((r) => (
                <option key={r.id} value={r.name}>{r.name}</option>
              ))}
            </select>
          </div>
        </div>
      </form>

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
