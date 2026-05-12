import { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import ContactabilityToggle from '../components/ContactabilityToggle';
import { fetchMyRecipes, fetchBookmarkedRecipes } from '../services/recipeService';
import { fetchMyStories } from '../services/storyService';
import './ProfilePage.css';

function RecipeCardSmall({ recipe }) {
  return (
    <Link to={`/recipes/${recipe.id}`} className="profile-content-card">
      {recipe.image && (
        <img src={recipe.image} alt={recipe.title} className="profile-card-thumb" />
      )}
      <span className="profile-card-title">{recipe.title}</span>
    </Link>
  );
}

function StoryCardSmall({ story }) {
  return (
    <Link to={`/stories/${story.id}`} className="profile-content-card">
      {story.image && (
        <img src={story.image} alt={story.title} className="profile-card-thumb" />
      )}
      <span className="profile-card-title">{story.title}</span>
    </Link>
  );
}

function ContentSection({ items, loading, emptyText, renderItem }) {
  if (loading) return <p className="profile-section-empty">Loading…</p>;
  if (!items.length) return <p className="profile-section-empty">{emptyText}</p>;
  return (
    <div className="profile-content-grid">
      {items.map((item) => renderItem(item))}
    </div>
  );
}

export default function ProfilePage() {
  const { user, updateUser, logout } = useContext(AuthContext);
  const [tab, setTab] = useState('recipes');
  const [myRecipes, setMyRecipes] = useState([]);
  const [myStories, setMyStories] = useState([]);
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [loadingRecipes, setLoadingRecipes] = useState(true);
  const [loadingStories, setLoadingStories] = useState(true);
  const [loadingSaved, setLoadingSaved] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchMyRecipes(user.id)
      .then(setMyRecipes)
      .catch(() => setMyRecipes([]))
      .finally(() => setLoadingRecipes(false));
    fetchMyStories(user.id)
      .then(setMyStories)
      .catch(() => setMyStories([]))
      .finally(() => setLoadingStories(false));
    fetchBookmarkedRecipes()
      .then(setSavedRecipes)
      .catch(() => setSavedRecipes([]))
      .finally(() => setLoadingSaved(false));
  }, [user]);

  if (!user) return <p className="page-status">Loading…</p>;

  return (
    <main className="page-card profile-page">
      <h1 className="profile-title">Profile</h1>

      <section className="profile-info">
        <p className="profile-username">@{user.username}</p>
        <p className="profile-email">{user.email}</p>
      </section>

      <ContactabilityToggle user={user} onUserUpdated={updateUser} />

      <section className="profile-preferences">
        <h2>Cultural Preferences</h2>
        <p className="profile-preferences-desc">
          Update the cultural interests you picked during onboarding to personalize recommendations.
        </p>
        <Link to="/onboarding" className="btn btn-outline btn-sm">
          Edit cultural preferences
        </Link>
      </section>

      <section className="profile-content-section">
        <div className="profile-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={tab === 'recipes'}
            className={`profile-tab${tab === 'recipes' ? ' active' : ''}`}
            onClick={() => setTab('recipes')}
          >
            My Recipes
            {!loadingRecipes && <span className="profile-tab-count">({myRecipes.length})</span>}
          </button>
          <button
            role="tab"
            aria-selected={tab === 'stories'}
            className={`profile-tab${tab === 'stories' ? ' active' : ''}`}
            onClick={() => setTab('stories')}
          >
            My Stories
            {!loadingStories && <span className="profile-tab-count">({myStories.length})</span>}
          </button>
          <button
            role="tab"
            aria-selected={tab === 'saved'}
            className={`profile-tab${tab === 'saved' ? ' active' : ''}`}
            onClick={() => setTab('saved')}
          >
            Saved Recipes
            {!loadingSaved && <span className="profile-tab-count">({savedRecipes.length})</span>}
          </button>
        </div>

        {tab === 'recipes' && (
          <ContentSection
            items={myRecipes}
            loading={loadingRecipes}
            emptyText="You haven't published any recipes yet."
            renderItem={(r) => <RecipeCardSmall key={r.id} recipe={r} />}
          />
        )}
        {tab === 'stories' && (
          <ContentSection
            items={myStories}
            loading={loadingStories}
            emptyText="You haven't published any stories yet."
            renderItem={(s) => <StoryCardSmall key={s.id} story={s} />}
          />
        )}
        {tab === 'saved' && (
          <ContentSection
            items={savedRecipes}
            loading={loadingSaved}
            emptyText="No saved recipes yet."
            renderItem={(r) => <RecipeCardSmall key={r.id} recipe={r} />}
          />
        )}
      </section>

      <section className="profile-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={logout}
        >
          Log Out
        </button>
      </section>
    </main>
  );
}
