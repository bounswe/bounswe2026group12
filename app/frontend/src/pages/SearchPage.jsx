import { useState, useEffect, useContext, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { search, fetchRegions } from '../services/searchService';
import { fetchDietaryTags, fetchEventTags, fetchIngredients } from '../services/recipeService';
import SearchResultCard from '../components/SearchResultCard';
import './SearchPage.css';

function FilterAccordion({ title, activeCount, children }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (activeCount > 0) setOpen(true);
  }, [activeCount]);

  return (
    <div className={`filter-accordion${open ? ' filter-accordion-open' : ''}`}>
      <button
        type="button"
        className="filter-accordion-header"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="filter-accordion-title">
          {title}
          {activeCount > 0 && (
            <span className="filter-accordion-badge">{activeCount}</span>
          )}
        </span>
        <span className="filter-accordion-chevron" aria-hidden="true">▼</span>
      </button>
      <div className="filter-accordion-body">
        <div className="filter-accordion-inner">{children}</div>
      </div>
    </div>
  );
}

function parseCsv(value) {
  if (!value) return [];
  return value.split(',').map((v) => v.trim()).filter(Boolean);
}

function formatCsv(values) {
  return values.join(',');
}

export default function SearchPage() {
  const auth = useContext(AuthContext) || {};
  const user = auth.user;
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const q = searchParams.get('q') || '';
  const region = searchParams.get('region') || '';
  const ingredient = searchParams.get('ingredient') || '';
  const diet = searchParams.get('diet') || '';
  const event = searchParams.get('event') || '';
  const mealType = searchParams.get('meal_type') || '';
  const storyType = searchParams.get('story_type') || '';
  const language = searchParams.get('language') || '';

  const [localQ, setLocalQ] = useState(q);
  const [localRegion, setLocalRegion] = useState(region);
  const [localMealType, setLocalMealType] = useState(mealType);
  const [localIngredientInclude, setLocalIngredientInclude] = useState(parseCsv(ingredient));
  const [localDietInclude, setLocalDietInclude] = useState(parseCsv(diet));
  const [localEventInclude, setLocalEventInclude] = useState(parseCsv(event));
  const [regions, setRegions] = useState([]);
  const [dietaryTags, setDietaryTags] = useState([]);
  const [eventTags, setEventTags] = useState([]);
  const [ingredientTags, setIngredientTags] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const effectiveQ = q;
  const effectiveLanguage = language || user?.preferred_language || '';

  useEffect(() => {
    fetchRegions().then(setRegions).catch(() => {});
    fetchDietaryTags().then(setDietaryTags).catch(() => {});
    fetchEventTags().then(setEventTags).catch(() => {});
    fetchIngredients().then(setIngredientTags).catch(() => {});
  }, []);

  useEffect(() => {
    setLocalQ(q);
    setLocalRegion(region);
    setLocalIngredientInclude(parseCsv(ingredient));
    setLocalDietInclude(parseCsv(diet));
    setLocalEventInclude(parseCsv(event));
    setLocalMealType(mealType);
  }, [q, region, ingredient, diet, event, mealType]);

  const filters = useMemo(() => ({
    ingredient,
    diet,
    event,
    meal_type: mealType,
  }), [ingredient, diet, event, mealType]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    search(effectiveQ, region, effectiveLanguage, filters)
      .then((data) => { if (!cancelled) setResults(data); })
      .catch(() => { if (!cancelled) setError('Could not load results.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [effectiveQ, region, effectiveLanguage, filters]);

  const hasProfileSignals = useMemo(() => {
    if (!user) return false;
    return [
      user.cultural_interests,
      user.regional_ties,
      user.religious_preferences,
      user.event_interests,
    ].some((list) => Array.isArray(list) && list.length > 0);
  }, [user]);

  // Client-side filter for story_type: Story.story_type exists on the backend
  // but the unified /api/search/ endpoint does not yet pass the query param
  // through. Apply it here until the backend lands. meal_type is now handled
  // server-side via the filters memo above.
  const displayResults = storyType.trim()
    ? results.filter((r) => r.type !== 'story' || (r.story_type || '').toLowerCase() === storyType.toLowerCase())
    : results;

  function removeFilter(paramKey) {
    const next = new URLSearchParams(searchParams);
    next.set(paramKey, '');
    setSearchParams(next);
  }

  const activeFilters = [
    ingredient && { label: `Ingredient: ${ingredient}`, key: 'ingredient' },
    diet && { label: `Diet: ${diet}`, key: 'diet' },
    event && { label: `Event: ${event}`, key: 'event' },
    mealType && { label: `Meal type: ${mealType}`, key: 'meal_type' },
    storyType && { label: `Story type: ${storyType}`, key: 'story_type' },
    region && { label: `Region: ${region}`, key: 'region' },
  ].filter(Boolean);

  // Single-state toggle: clicking a pill adds it to the include list, clicking
  // again removes it. The previous +/- pair UI doubled every chip and the
  // include filter covers the typical case — keep advanced exclude for later
  // if a real product need surfaces.
  function toggleFilterValue(value, includeState, setInclude) {
    if (includeState.includes(value)) {
      setInclude(includeState.filter((v) => v !== value));
      return;
    }
    setInclude([...includeState, value]);
  }

  function handleSubmit(e) {
    e.preventDefault();
    navigate(
      `/search?q=${encodeURIComponent(localQ)}&region=${encodeURIComponent(localRegion)}` +
      `&ingredient=${encodeURIComponent(formatCsv(localIngredientInclude))}` +
      `&diet=${encodeURIComponent(formatCsv(localDietInclude))}` +
      `&event=${encodeURIComponent(formatCsv(localEventInclude))}` +
      `&meal_type=${encodeURIComponent(localMealType)}` +
      `&story_type=${encodeURIComponent(storyType)}` +
      `&language=${encodeURIComponent(language)}`
    );
  }

  return (
    <main className="page-card search-page">
      <h1 className="search-heading">
        {q ? `Search results for "${q}"` : 'Search Results'}
      </h1>
      {hasProfileSignals && (
        <p className="search-personalized-note">
          Results are ranked using your cultural onboarding profile.
        </p>
      )}

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

        <div className="rich-filter-panels">
          <FilterAccordion title="Dietary Tags" activeCount={localDietInclude.length}>
            <div className="rich-chip-list">
              {dietaryTags.map((tag) => {
                const selected = localDietInclude.includes(tag.name);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    className={`rich-chip ${selected ? 'rich-chip-include' : ''}`}
                    aria-pressed={selected}
                    onClick={() => toggleFilterValue(tag.name, localDietInclude, setLocalDietInclude)}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
          </FilterAccordion>

          <FilterAccordion title="Event Tags" activeCount={localEventInclude.length}>
            <div className="rich-chip-list">
              {eventTags.map((tag) => {
                const selected = localEventInclude.includes(tag.name);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    className={`rich-chip ${selected ? 'rich-chip-include' : ''}`}
                    aria-pressed={selected}
                    onClick={() => toggleFilterValue(tag.name, localEventInclude, setLocalEventInclude)}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
          </FilterAccordion>

          <FilterAccordion title="Ingredients" activeCount={localIngredientInclude.length}>
            <div className="rich-chip-list">
              {ingredientTags.map((tag) => {
                const selected = localIngredientInclude.includes(tag.name);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    className={`rich-chip ${selected ? 'rich-chip-include' : ''}`}
                    aria-pressed={selected}
                    onClick={() => toggleFilterValue(tag.name, localIngredientInclude, setLocalIngredientInclude)}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
          </FilterAccordion>
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
