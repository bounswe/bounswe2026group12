import { useContext, useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
  getPublicProfile,
  getPassportStats,
  getPassportStamps,
  getPassportTimeline,
  getPassportQuests,
} from '../services/passportService';
import { extractApiError } from '../services/api';
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

  const [profile, setProfile]           = useState(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');

  const [passportStats, setPassportStats]   = useState(null);
  const [stamps, setStamps]                 = useState([]);
  const [timeline, setTimeline]             = useState([]);
  const [quests, setQuests]                 = useState([]);
  const [tab, setTab]                       = useState('stamps');

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
    Promise.allSettled([
      getPassportStats(username),
      getPassportStamps(username),
      getPassportTimeline(username),
      getPassportQuests(username),
    ]).then(([statsRes, stampsRes, timelineRes, questsRes]) => {
      if (statsRes.status    === 'fulfilled') setPassportStats(statsRes.value);
      if (stampsRes.status   === 'fulfilled') setStamps(stampsRes.value);
      if (timelineRes.status === 'fulfilled') setTimeline(timelineRes.value);
      if (questsRes.status   === 'fulfilled') setQuests(questsRes.value);
    });
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
        <div className="user-profile-avatar">{profile.username?.[0]?.toUpperCase() ?? '?'}</div>
        <div className="user-profile-identity">
          <h1 className="user-profile-username">@{profile.username}</h1>
          {profile.region && <span className="user-profile-region">📍 {profile.region}</span>}
          {joinedYear && <span className="user-profile-joined">Joined {joinedYear}</span>}
        </div>
        {isOwn && (
          <Link to="/account" className="btn btn-outline btn-sm user-profile-edit-btn">
            Edit preferences
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
        <PassportCover profile={profile} level={passportStats?.level} />
        <PassportStatsBar stats={passportStats} />

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
          {tab === 'stamps'   && <StampGrid stamps={stamps} />}
          {tab === 'cultures' && <CultureGrid cultures={passportStats?.cultures} />}
          {tab === 'map'      && <PassportMap cultures={passportStats?.cultures} />}
          {tab === 'timeline' && <PassportTimeline events={timeline} />}
          {tab === 'quests'   && <QuestList quests={quests} />}
        </div>
      </section>

    </main>
  );
}
