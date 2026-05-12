import { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { fetchRegions } from '../services/searchService';
import { fetchDailyCulturalContent } from '../services/culturalContentService';
import ChipGroup from '../components/ChipGroup';
import DailyCulturalSection from '../components/DailyCulturalSection';
import FloatingCulturalPrompt from '../components/FloatingCulturalPrompt';
import RandomCulturalFact from '../components/RandomCulturalFact';
import HomeRegionMapSection from '../components/HomeRegionMapSection';
import HomeWeeklySection from '../components/HomeWeeklySection';
import FeedbackBar from '../components/FeedbackBar';
import HomeClosingBanner from '../components/HomeClosingBanner';
import useKeyboardShortcuts from '../hooks/useKeyboardShortcuts';
import './HomePage.css';

const MEAL_TYPES = ['Breakfast', 'Soup', 'Main Course', 'Dessert', 'Snack', 'Drink'];
// Display labels paired with API slugs (matches Story.StoryType choices on the
// backend — see app/backend/apps/stories/models.py).
const STORY_TYPES = [
  { label: 'Traditional', value: 'traditional' },
  { label: 'Historical', value: 'historical' },
  { label: 'Family', value: 'family' },
  { label: 'Festive', value: 'festive' },
  { label: 'Personal', value: 'personal' },
];

export default function HomePage() {
  const auth = useContext(AuthContext) || {};
  const user = auth.user;
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedMealType, setSelectedMealType] = useState('');
  const [selectedStoryType, setSelectedStoryType] = useState('');
  const [regions, setRegions] = useState([]);
  const [dailyCards, setDailyCards] = useState([]);
  const searchInputRef = useRef(null);

  // Press "/" to focus the search box
  useKeyboardShortcuts({ '/': () => searchInputRef.current?.focus() });
  const [dismissedNudge, setDismissedNudge] = useState(() => localStorage.getItem('onboarding_nudge_dismissed') === 'true');

  useEffect(() => {
    fetchRegions().then(setRegions).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchDailyCulturalContent()
      .then((items) => { if (!cancelled) setDailyCards(items); })
      .catch(() => { if (!cancelled) setDailyCards([]); });
    return () => { cancelled = true; };
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

  const isPersonalized = useMemo(() => {
    if (!user) return false;
    return [
      user.cultural_interests,
      user.regional_ties,
      user.religious_preferences,
      user.event_interests,
    ].some((list) => Array.isArray(list) && list.length > 0);
  }, [user]);

  function handleSubmit(e) {
    e.preventDefault();
    navigate(
      `/search?q=${encodeURIComponent(q)}` +
      `&region=${encodeURIComponent(selectedRegion)}` +
      `&meal_type=${encodeURIComponent(selectedMealType)}` +
      `&story_type=${encodeURIComponent(selectedStoryType)}`
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
            ref={searchInputRef}
            role="searchbox"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search recipes and stories… (press / to focus)"
            className="home-search-input"
            aria-label="Search recipes and stories"
          />
          <button type="submit" className="btn btn-primary home-search-btn">Search</button>
        </div>

        <div className="home-chip-filters">
          <ChipGroup
            label="Region"
            icon="🌍"
            visibleCount={12}
            className="home-chip-group"
            labelClassName="home-chip-label"
            itemsClassName="home-chips"
          >
            {regions.map((r) => (
              <button
                key={r.id}
                type="button"
                className={`home-chip${selectedRegion === r.name ? ' active' : ''}`}
                onClick={() => setSelectedRegion(selectedRegion === r.name ? '' : r.name)}
              >
                {r.name}
              </button>
            ))}
          </ChipGroup>

          <ChipGroup
            label="Meal Type"
            icon="🍽"
            className="home-chip-group"
            labelClassName="home-chip-label"
            itemsClassName="home-chips"
          >
            {MEAL_TYPES.map((m) => (
              <button
                key={m}
                type="button"
                className={`home-chip${selectedMealType === m ? ' active' : ''}`}
                onClick={() => setSelectedMealType(selectedMealType === m ? '' : m)}
              >
                {m}
              </button>
            ))}
          </ChipGroup>

          <ChipGroup
            label="Story Type"
            icon="📜"
            className="home-chip-group"
            labelClassName="home-chip-label"
            itemsClassName="home-chips"
          >
            {STORY_TYPES.map((s) => (
              <button
                key={s.value}
                type="button"
                className={`home-chip${selectedStoryType === s.value ? ' active' : ''}`}
                onClick={() => setSelectedStoryType(selectedStoryType === s.value ? '' : s.value)}
              >
                {s.label}
              </button>
            ))}
          </ChipGroup>
        </div>
      </form>

      <DailyCulturalSection items={dailyCards} personalized={isPersonalized} />
      <aside className="home-random-fact" aria-label="Cultural fact of the moment">
        <RandomCulturalFact />
      </aside>
      <HomeRegionMapSection />
      <HomeWeeklySection />
      <FeedbackBar />
      <HomeClosingBanner />
      <FloatingCulturalPrompt regions={regions} />
    </main>
  );
}
