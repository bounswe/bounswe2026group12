import { useState, useEffect, useContext, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { search, fetchRegions } from '../services/searchService';
import { fetchDietaryTags, fetchEventTags, fetchIngredients } from '../services/recipeService';
import SearchResultCard from '../components/SearchResultCard';
import './SearchPage.css';

function parseCsv(value) {
  if (!value) return [];
  return value.split(',').map((v) => v.trim()).filter(Boolean);
}

function formatCsv(values) {
  return values.join(',');
}

function toggleInList(list, value) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export default function SearchPage() {
  const auth = useContext(AuthContext) || {};
  const user = auth.user;
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const q = searchParams.get('q') || '';
  const region = searchParams.get('region') || '';
  const ingredient = searchParams.get('ingredient') || '';
  const ingredientExclude = searchParams.get('ingredient_exclude') || '';
  const diet = searchParams.get('diet') || '';
  const dietExclude = searchParams.get('diet_exclude') || '';
  const event = searchParams.get('event') || '';
  const eventExclude = searchParams.get('event_exclude') || '';
  const mealType = searchParams.get('meal_type') || '';
  const language = searchParams.get('language') || '';

  const [localQ, setLocalQ] = useState(q);
  const [localRegion, setLocalRegion] = useState(region);
  const [localMealType, setLocalMealType] = useState(mealType);
  const [localIngredientInclude, setLocalIngredientInclude] = useState(parseCsv(ingredient));
  const [localIngredientExclude, setLocalIngredientExclude] = useState(parseCsv(ingredientExclude));
  const [localDietInclude, setLocalDietInclude] = useState(parseCsv(diet));
  const [localDietExclude, setLocalDietExclude] = useState(parseCsv(dietExclude));
  const [localEventInclude, setLocalEventInclude] = useState(parseCsv(event));
  const [localEventExclude, setLocalEventExclude] = useState(parseCsv(eventExclude));
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
    setLocalIngredientExclude(parseCsv(ingredientExclude));
    setLocalDietInclude(parseCsv(diet));
    setLocalDietExclude(parseCsv(dietExclude));
    setLocalEventInclude(parseCsv(event));
    setLocalEventExclude(parseCsv(eventExclude));
    setLocalMealType(mealType);
  }, [q, region, ingredient, ingredientExclude, diet, dietExclude, event, eventExclude, mealType]);

  const filters = useMemo(() => ({
    ingredient,
    ingredient_exclude: ingredientExclude,
    diet,
    diet_exclude: dietExclude,
    event,
    event_exclude: eventExclude,
  }), [ingredient, ingredientExclude, diet, dietExclude, event, eventExclude]);

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
    ingredient && { label: `Ingredient+: ${ingredient}`, key: 'ingredient' },
    ingredientExclude && { label: `Ingredient-: ${ingredientExclude}`, key: 'ingredient_exclude' },
    diet && { label: `Diet+: ${diet}`, key: 'diet' },
    dietExclude && { label: `Diet-: ${dietExclude}`, key: 'diet_exclude' },
    event && { label: `Event+: ${event}`, key: 'event' },
    eventExclude && { label: `Event-: ${eventExclude}`, key: 'event_exclude' },
    mealType && { label: `Meal type: ${mealType}`, key: 'meal_type' },
    region && { label: `Region: ${region}`, key: 'region' },
  ].filter(Boolean);

  function toggleFilterValue(value, includeState, excludeState, setInclude, setExclude) {
    if (includeState.includes(value)) {
      setInclude(includeState.filter((v) => v !== value));
      return;
    }
    if (excludeState.includes(value)) {
      setExclude(excludeState.filter((v) => v !== value));
      return;
    }
    setInclude([...includeState, value]);
  }

  function setExcludeOnly(value, includeState, excludeState, setInclude, setExclude) {
    if (excludeState.includes(value)) {
      setExclude(excludeState.filter((v) => v !== value));
      return;
    }
    setInclude(includeState.filter((v) => v !== value));
    setExclude([...excludeState, value]);
  }

  function handleSubmit(e) {
    e.preventDefault();
    navigate(
      `/search?q=${encodeURIComponent(localQ)}&region=${encodeURIComponent(localRegion)}` +
      `&ingredient=${encodeURIComponent(formatCsv(localIngredientInclude))}` +
      `&ingredient_exclude=${encodeURIComponent(formatCsv(localIngredientExclude))}` +
      `&diet=${encodeURIComponent(formatCsv(localDietInclude))}` +
      `&diet_exclude=${encodeURIComponent(formatCsv(localDietExclude))}` +
      `&event=${encodeURIComponent(formatCsv(localEventInclude))}` +
      `&event_exclude=${encodeURIComponent(formatCsv(localEventExclude))}` +
      `&meal_type=${encodeURIComponent(localMealType)}&language=${encodeURIComponent(language)}`
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
          <div className="rich-filter-group">
            <h3>Dietary Tags</h3>
            <div className="rich-chip-list">
              {dietaryTags.map((tag) => (
                <div className="rich-chip-wrap" key={tag.id}>
                  <button
                    type="button"
                    className={`rich-chip ${localDietInclude.includes(tag.name) ? 'rich-chip-include' : ''}`}
                    onClick={() => toggleFilterValue(tag.name, localDietInclude, localDietExclude, setLocalDietInclude, setLocalDietExclude)}
                  >
                    + {tag.name}
                  </button>
                  <button
                    type="button"
                    className={`rich-chip rich-chip-exclude ${localDietExclude.includes(tag.name) ? 'rich-chip-exclude-active' : ''}`}
                    onClick={() => setExcludeOnly(tag.name, localDietInclude, localDietExclude, setLocalDietInclude, setLocalDietExclude)}
                  >
                    - {tag.name}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rich-filter-group">
            <h3>Event Tags</h3>
            <div className="rich-chip-list">
              {eventTags.map((tag) => (
                <div className="rich-chip-wrap" key={tag.id}>
                  <button
                    type="button"
                    className={`rich-chip ${localEventInclude.includes(tag.name) ? 'rich-chip-include' : ''}`}
                    onClick={() => toggleFilterValue(tag.name, localEventInclude, localEventExclude, setLocalEventInclude, setLocalEventExclude)}
                  >
                    + {tag.name}
                  </button>
                  <button
                    type="button"
                    className={`rich-chip rich-chip-exclude ${localEventExclude.includes(tag.name) ? 'rich-chip-exclude-active' : ''}`}
                    onClick={() => setExcludeOnly(tag.name, localEventInclude, localEventExclude, setLocalEventInclude, setLocalEventExclude)}
                  >
                    - {tag.name}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rich-filter-group">
            <h3>Ingredients</h3>
            <div className="rich-chip-list">
              {ingredientTags.map((tag) => (
                <div className="rich-chip-wrap" key={tag.id}>
                  <button
                    type="button"
                    className={`rich-chip ${localIngredientInclude.includes(tag.name) ? 'rich-chip-include' : ''}`}
                    onClick={() => toggleFilterValue(tag.name, localIngredientInclude, localIngredientExclude, setLocalIngredientInclude, setLocalIngredientExclude)}
                  >
                    + {tag.name}
                  </button>
                  <button
                    type="button"
                    className={`rich-chip rich-chip-exclude ${localIngredientExclude.includes(tag.name) ? 'rich-chip-exclude-active' : ''}`}
                    onClick={() => setExcludeOnly(tag.name, localIngredientInclude, localIngredientExclude, setLocalIngredientInclude, setLocalIngredientExclude)}
                  >
                    - {tag.name}
                  </button>
                </div>
              ))}
            </div>
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
