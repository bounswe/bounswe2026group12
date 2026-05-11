import { useContext, useState, useEffect, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { updateMe } from '../services/authService';
import { extractApiError } from '../services/api';
import './AccountPage.css';

const PREFERENCE_SECTIONS = [
  {
    key: 'cultural_interests',
    title: 'Cultural Interests',
    description: 'Cuisines and traditions you want to explore.',
    options: ['Ottoman', 'Anatolian', 'Balkan', 'Levantine', 'Mediterranean', 'Central Asian'],
  },
  {
    key: 'regional_ties',
    title: 'Regional Ties',
    description: 'Regions connected to your family or roots.',
    options: ['Aegean', 'Marmara', 'Central Anatolia', 'Black Sea', 'Mediterranean', 'Southeastern Anatolia'],
  },
  {
    key: 'religious_preferences',
    title: 'Dietary / Religious Preferences',
    description: 'Preferences that personalize your recommendations.',
    options: ['Halal', 'Kosher', 'Vegetarian', 'Vegan', 'Pescetarian', 'No Preference'],
  },
  {
    key: 'event_interests',
    title: 'Event Interests',
    description: 'Occasions you cook for most often.',
    options: ['Ramadan', 'Eid', 'Weddings', 'Family Gatherings', 'Religious Holidays', 'Weeknight Meals'],
  },
];

function normalizeList(value) {
  return Array.isArray(value) ? value : [];
}

function buildValues(user) {
  return {
    cultural_interests: normalizeList(user?.cultural_interests),
    regional_ties: normalizeList(user?.regional_ties),
    religious_preferences: normalizeList(user?.religious_preferences),
    event_interests: normalizeList(user?.event_interests),
  };
}

export default function AccountPage() {
  const { user, updateUser } = useContext(AuthContext);

  const [values, setValues] = useState(() => buildValues(user));
  const initialized = useRef(!!user);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(values);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user && !initialized.current) {
      initialized.current = true;
      const v = buildValues(user);
      setValues(v);
      setDraft(v);
    }
  }, [user]);

  function handleEdit() {
    setDraft(values);
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
      const next = current.includes(option)
        ? current.filter((v) => v !== option)
        : [...current, option];
      return { ...prev, [key]: next };
    });
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const updated = await updateMe(draft);
      updateUser(updated);
      const v = buildValues(updated);
      setValues(v);
      setDraft(v);
      setEditing(false);
    } catch (err) {
      setError(extractApiError(err, 'Could not save changes. Please try again.'));
    } finally {
      setSaving(false);
    }
  }

  if (!user) return <p className="page-status">Loading…</p>;

  return (
    <main className="page-card account-page">
      <h1 className="account-title">My Account</h1>

      <section className="account-info">
        <div className="account-info-row">
          <span className="account-info-label">Username</span>
          <span className="account-info-value">@{user.username}</span>
        </div>
        <div className="account-info-row">
          <span className="account-info-label">Email</span>
          <span className="account-info-value">{user.email}</span>
        </div>
      </section>

      <section className="account-preferences">
        <div className="account-prefs-header">
          <h2 className="account-prefs-heading">Preferences</h2>
          {!editing && (
            <button type="button" className="btn btn-outline btn-sm" onClick={handleEdit}>
              Edit
            </button>
          )}
        </div>

        {PREFERENCE_SECTIONS.map((section) => {
          const selected = editing ? draft[section.key] : values[section.key];
          return (
            <div key={section.key} className="account-pref-section">
              <h3 className="account-pref-title">{section.title}</h3>

              {editing ? (
                <div className="account-chips">
                  {section.options.map((option) => {
                    const checked = draft[section.key].includes(option);
                    return (
                      <label
                        key={option}
                        className={`account-chip${checked ? ' account-chip-active' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleOption(section.key, option)}
                        />
                        <span>{option}</span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div className="account-tags">
                  {selected.length > 0
                    ? selected.map((item) => (
                        <span key={item} className="account-tag">{item}</span>
                      ))
                    : <span className="account-tags-empty">None selected</span>
                  }
                </div>
              )}
            </div>
          );
        })}
      </section>

      {error && <p className="account-error">{error}</p>}

      {editing && (
        <div className="account-actions">
          <button type="button" className="btn btn-outline" onClick={handleCancel} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      )}
    </main>
  );
}
