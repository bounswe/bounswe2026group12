import { useContext, useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { getPublicProfile, getPassport } from '../services/passportService';
import { extractApiError } from '../services/api';
import Avatar from '../components/Avatar';
import PassportCover from '../components/passport/PassportCover';
import PassportStatsBar from '../components/passport/PassportStatsBar';
import StampGrid from '../components/passport/StampGrid';
import CultureGrid from '../components/passport/CultureGrid';
import PassportMap from '../components/passport/PassportMap';
import PassportTimeline from '../components/passport/PassportTimeline';
import QuestList from '../components/passport/QuestList';
import './UserProfilePage.css';

const TABS = ['stamps', 'cultures', 'map', 'timeline', 'quests'];

export default function UserProfilePage() {
  const { username } = useParams();
  const { user: currentUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const [profile, setProfile]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [passport, setPassport] = useState(null);
  const [tab, setTab]           = useState('stamps');

  const isOwn = currentUser?.username === username;

  useEffect(() => {
    setLoading(true);
    setError('');
    getPublicProfile(username)
      .then(setProfile)
      .catch((err) => {
        const msg = extractApiError(err, '');
        if (err?.response?.status === 404) {
          setError('404');
        } else {
          setError(msg || 'Could not load profile.');
        }
      })
      .finally(() => setLoading(false));
  }, [username]);

  useEffect(() => {
    if (!username) return;
    getPassport(username).then(setPassport).catch(() => {});
  }, [username]);

  if (loading) return <p className="page-status">Loading…</p>;

  if (error === '404') {
    return (
      <main className="page-card user-profile-page">
        <p className="user-profile-404">No user found with username <strong>@{username}</strong>.</p>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => navigate(-1)}>Go back</button>
      </main>
    );
  }

  if (error) return <p className="page-status page-status-error">{error}</p>;
  if (!profile) return null;

  const joinedYear = profile.created_at ? new Date(profile.created_at).getFullYear() : null;

  return (
    <main className="page-card user-profile-page">

      {/* Header */}
      <div className="user-profile-header">
        <Avatar user={profile} size="md" className="user-profile-avatar" />
        <div className="user-profile-identity">
          <h1 className="user-profile-username">@{profile.username}</h1>
          {profile.region && <span className="user-profile-region">📍 {profile.region}</span>}
          {joinedYear && <span className="user-profile-joined">Joined {joinedYear}</span>}
        </div>
        {isOwn && (
          <Link to="/account" className="btn btn-outline btn-sm user-profile-edit-btn">
            Edit Preferences
          </Link>
        )}
      </div>

      {/* Bio */}
      {profile.bio && <p className="user-profile-bio">{profile.bio}</p>}

      {/* Stats */}
      <div className="user-profile-stats">
        <div className="user-profile-stat">
          <span className="user-profile-stat-value">{profile.recipe_count ?? 0}</span>
          <span className="user-profile-stat-label">Recipes</span>
        </div>
        <div className="user-profile-stat">
          <span className="user-profile-stat-value">{profile.story_count ?? 0}</span>
          <span className="user-profile-stat-label">Stories</span>
        </div>
      </div>

      {/* Cultural preferences */}
      {[
        { label: 'Cultural Interests', values: profile.cultural_interests },
        { label: 'Dietary Preferences', values: profile.religious_preferences },
        { label: 'Event Interests', values: profile.event_interests },
      ].filter(s => s.values?.length > 0).map(section => (
        <section key={section.label} className="user-profile-pref-section">
          <h2 className="user-profile-pref-title">{section.label}</h2>
          <div className="user-profile-tags">
            {section.values.map(v => (
              <span key={v} className="user-profile-tag">{v}</span>
            ))}
          </div>
        </section>
      ))}

      {/* Cultural Passport */}
      <section className="user-profile-passport">
        <PassportCover theme={passport?.active_theme} />
        <PassportStatsBar stats={passport?.stats} level={passport?.level} />

        <nav className="passport-tab-nav" aria-label="Passport sections">
          {TABS.map(t => (
            <button
              key={t}
              className={`passport-tab-btn${tab === t ? ' active' : ''}`}
              onClick={() => setTab(t)}
              aria-current={tab === t ? 'true' : undefined}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </nav>

        <div className="passport-tab-content">
          {tab === 'stamps'   && <StampGrid stamps={passport?.stamps ?? []} />}
          {tab === 'cultures' && <CultureGrid cultures={passport?.culture_summaries ?? []} />}
          {tab === 'map'      && <PassportMap cultures={passport?.culture_summaries ?? []} />}
          {tab === 'timeline' && <PassportTimeline events={passport?.timeline ?? []} />}
          {tab === 'quests'   && <QuestList quests={passport?.active_quests ?? []} />}
        </div>
      </section>

    </main>
  );
}
