import { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import ContactabilityToggle from '../components/ContactabilityToggle';
import { fetchMyRecipes, fetchMyBookmarks } from '../services/recipeService';
import { fetchMyStories } from '../services/storyService';
import './ProfilePage.css';

export default function ProfilePage() {
  const { user, updateUser, logout } = useContext(AuthContext);

  if (!user) return <p className="page-status">Loading…</p>;

  return (
    <main className="page-card profile-page">
      <h1 className="profile-title">Profile</h1>

      <section className="profile-info">
        <p className="profile-username">@{user.username}</p>
        <p className="profile-email">{user.email}</p>
      </section>

      <p className="profile-edit-link-wrap">
        <Link to="/profile/edit" className="btn btn-outline btn-sm">Edit profile</Link>
      </p>

      <ContactabilityToggle user={user} onUserUpdated={updateUser} />

      <ProfileDashboard user={user} />

      <section className="profile-preferences">
        <h2>Cultural Preferences</h2>
        <p className="profile-preferences-desc">
          Update the cultural interests you picked during onboarding to personalize recommendations.
        </p>
        <Link to="/onboarding" className="btn btn-outline btn-sm">
          Edit cultural preferences
        </Link>
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

function ProfileDashboard({ user }) {
  const [recipes, setRecipes] = useState([]);
  const [stories, setStories] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [recipesError, setRecipesError] = useState('');
  const [storiesError, setStoriesError] = useState('');
  const [bookmarksError, setBookmarksError] = useState('');

  useEffect(() => {
    if (!user?.id) return undefined;
    let cancelled = false;
    Promise.allSettled([
      fetchMyRecipes(user.id),
      fetchMyStories(user.id),
      fetchMyBookmarks(),
    ]).then(([r, s, b]) => {
      if (cancelled) return;
      if (r.status === 'fulfilled') setRecipes(Array.isArray(r.value) ? r.value : []);
      else setRecipesError('Could not load recipes.');
      if (s.status === 'fulfilled') setStories(Array.isArray(s.value) ? s.value : []);
      else setStoriesError('Could not load stories.');
      if (b.status === 'fulfilled') setBookmarks(Array.isArray(b.value) ? b.value : []);
      else setBookmarksError('Could not load bookmarks.');
    });
    return () => { cancelled = true; };
  }, [user?.id]);

  return (
    <section className="profile-dashboard">
      <ProfileSection
        title="My recipes"
        items={recipes}
        error={recipesError}
        emptyHint="No recipes yet."
        href={(r) => `/recipes/${r.id}`}
      />
      <ProfileSection
        title="My stories"
        items={stories}
        error={storiesError}
        emptyHint="No stories yet."
        href={(s) => `/stories/${s.id}`}
      />
      <ProfileSection
        title="Saved recipes"
        items={bookmarks}
        error={bookmarksError}
        emptyHint="No saved recipes yet."
        href={(r) => `/recipes/${r.id}`}
      />
    </section>
  );
}

function ProfileSection({ title, items, error, emptyHint, href }) {
  return (
    <div className="profile-section">
      <h2 className="profile-section-title">{title}</h2>
      {error && <p className="profile-section-error">{error}</p>}
      {!error && items.length === 0 && (
        <p className="profile-section-empty">{emptyHint}</p>
      )}
      {!error && items.length > 0 && (
        <ul className="profile-section-list">
          {items.map((item) => (
            <li key={item.id}>
              <Link to={href(item)} className="profile-section-link">
                {item.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
