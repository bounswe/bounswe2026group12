import { useState, useEffect, useContext, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { fetchRegions } from '../services/searchService';
import './HomePage.css';

export default function HomePage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [region, setRegion] = useState('');
  const [ingredient, setIngredient] = useState('');
  const [mealType, setMealType] = useState('');
  const [regions, setRegions] = useState([]);
  const [dismissedNudge, setDismissedNudge] = useState(() => localStorage.getItem('onboarding_nudge_dismissed') === 'true');

  useEffect(() => {
    fetchRegions().then(setRegions).catch(() => {});
  }, []);

  const showOnboardingNudge = useMemo(() => {
    if (!user || dismissedNudge) return false;
    const hasAnyProfileSignal = [
      user.cultural_interests,
      user.regional_ties,
      user.religious_preferences,
      user.event_interests,
    ].some((list) => Array.isArray(list) && list.length > 0);
    return !hasAnyProfileSignal;
  }, [user, dismissedNudge]);

  function handleSubmit(e) {
    e.preventDefault();
    navigate(
      `/search?q=${encodeURIComponent(q)}&region=${encodeURIComponent(region)}&ingredient=${encodeURIComponent(ingredient)}&meal_type=${encodeURIComponent(mealType)}`
    );
  }

  return (
    <main className="page-card home-page">
      {showOnboardingNudge && (
        <aside className="onboarding-nudge" aria-label="Complete onboarding">
          <p>
            Personalize your feed with cultural onboarding.
            <Link to="/onboarding"> Complete now</Link>
          </p>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => {
              localStorage.setItem('onboarding_nudge_dismissed', 'true');
              setDismissedNudge(true);
            }}
          >
            Later
          </button>
        </aside>
      )}

      <div className="home-hero">
        <h1 className="home-heading">Discover the<br />Recipes of Your Roots</h1>
        <p className="home-subheading">Preserve family recipes, share culinary stories, and connect across generations.</p>
      </div>

      <form className="home-search-form" onSubmit={handleSubmit}>
        <div className="home-search-row">
          <label htmlFor="search-input" className="sr-only">Search</label>
          <input
            id="search-input"
            role="searchbox"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search recipes and stories…"
            className="home-search-input"
          />
          <button type="submit" className="btn btn-primary home-search-btn">Search</button>
        </div>

        <div className="home-filters">
          <div className="form-group home-filter-group">
            <label htmlFor="ingredient-input">Ingredient</label>
            <input
              id="ingredient-input"
              type="text"
              value={ingredient}
              onChange={(e) => setIngredient(e.target.value)}
              placeholder="e.g. yogurt"
            />
          </div>

          <div className="form-group home-filter-group">
            <label htmlFor="meal-type-input">Meal Type</label>
            <input
              id="meal-type-input"
              type="text"
              value={mealType}
              onChange={(e) => setMealType(e.target.value)}
              placeholder="e.g. soup"
            />
          </div>

          <div className="form-group home-filter-group">
            <label htmlFor="region-select">Region</label>
            <select
              id="region-select"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            >
              <option value="">All regions</option>
              {regions.map((r) => (
                <option key={r.id} value={r.name}>{r.name}</option>
              ))}
            </select>
          </div>
        </div>
      </form>
    </main>
  );
}
