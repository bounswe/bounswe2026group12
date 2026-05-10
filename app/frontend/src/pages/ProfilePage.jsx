import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import ContactabilityToggle from '../components/ContactabilityToggle';
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
