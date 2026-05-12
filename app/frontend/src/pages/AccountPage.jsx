import { useContext, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { extractApiError } from '../services/api';
import { updateMe } from '../services/authService';
import './AccountPage.css';

const SECTIONS = [
  {
    key: 'cultural_interests',
    title: 'Cultural Interests',
    options: ['Ottoman', 'Anatolian', 'Balkan', 'Levantine', 'Mediterranean', 'Central Asian'],
  },
  {
    key: 'regional_ties',
    title: 'Regional Ties',
    options: ['Aegean', 'Marmara', 'Central Anatolia', 'Black Sea', 'Mediterranean', 'Southeastern Anatolia'],
  },
  {
    key: 'religious_preferences',
    title: 'Dietary / Religious Preferences',
    options: ['Halal', 'Kosher', 'Vegetarian', 'Vegan', 'Pescetarian', 'No Preference'],
  },
  {
    key: 'event_interests',
    title: 'Event Interests',
    options: ['Ramadan', 'Eid', 'Weddings', 'Family Gatherings', 'Religious Holidays', 'Weeknight Meals'],
  },
];

function normalizeList(value) {
  return Array.isArray(value) ? value : [];
}

function emptyPrefs() {
  return Object.fromEntries(SECTIONS.map((s) => [s.key, []]));
}

export default function AccountPage() {
  const { user, updateUser } = useContext(AuthContext);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(emptyPrefs);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const initialized = useRef(false);

  useEffect(() => {
    if (user && !initialized.current) {
      initialized.current = true;
      setDraft({
        cultural_interests: normalizeList(user.cultural_interests),
        regional_ties: normalizeList(user.regional_ties),
        religious_preferences: normalizeList(user.religious_preferences),
        event_interests: normalizeList(user.event_interests),
      });
    }
  }, [user]);

  function handleEdit() {
    setDraft({
      cultural_interests: normalizeList(user?.cultural_interests),
      regional_ties: normalizeList(user?.regional_ties),
      religious_preferences: normalizeList(user?.religious_preferences),
      event_interests: normalizeList(user?.event_interests),
    });
    setError('');
    setEditing(true);
  }

  function handleCancel() {
    setEditing(false);
    setError('');
  }

  function toggleOption(key, option) {
    setDraft((prev) => {
      const current = prev[key];
      return {
        ...prev,
        [key]: current.includes(option) ? current.filter((o) => o !== option) : [...current, option],
      };
    });
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const updated = await updateMe(draft);
      updateUser(updated);
      setEditing(false);
    } catch (err) {
      setError(extractApiError(err, 'Could not save preferences.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="page-card account-page">
      {user?.username && (
        <Link to={`/users/${user.username}`} className="account-page-back">
          ← Back to my profile
        </Link>
      )}
      <div className="account-page-header">
        <h1>My Account</h1>
        <p className="account-page-sub">Manage your cultural preferences.</p>
      </div>

      {SECTIONS.map((section) => {
        const saved = normalizeList(user?.[section.key]);
        return (
          <section key={section.key} className="account-section">
            <h2 className="account-section-title">{section.title}</h2>
            {editing ? (
              <div className="account-chips">
                {section.options.map((opt) => {
                  const active = draft[section.key].includes(opt);
                  return (
                    <label
                      key={opt}
                      className={`account-chip${active ? ' account-chip-active' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => toggleOption(section.key, opt)}
                      />
                      <span>{opt}</span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="account-chips">
                {saved.length === 0 ? (
                  <span className="account-empty">None selected</span>
                ) : (
                  saved.map((opt) => (
                    <span key={opt} className="account-chip account-chip-readonly">{opt}</span>
                  ))
                )}
              </div>
            )}
          </section>
        );
      })}

      {error && <p className="account-error">{error}</p>}

      <div className="account-actions">
        {editing ? (
          <>
            <button type="button" className="btn btn-outline" onClick={handleCancel} disabled={saving}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-primary" onClick={handleEdit}>
            Edit Preferences
          </button>
        )}
      </div>
    </main>
  );
}
