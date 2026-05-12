import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { updateMe } from '../services/authService';
import './ProfileEditPage.css';

const LANGUAGES = [
  { code: '',   label: '— None —' },
  { code: 'tr', label: 'Turkish' },
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'Arabic' },
];

export default function ProfileEditPage() {
  const { user, updateUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const [username, setUsername]     = useState(user?.username ?? '');
  const [bio, setBio]               = useState(user?.bio ?? '');
  const [region, setRegion]         = useState(user?.region ?? '');
  const [language, setLanguage]     = useState(user?.preferred_language ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!username.trim()) {
      setError('Username is required.');
      return;
    }
    setSubmitting(true);
    try {
      const next = await updateMe({
        username: username.trim(),
        bio,
        region,
        preferred_language: language,
      });
      updateUser({ ...(user ?? {}), ...next });
      navigate('/profile');
    } catch (err) {
      const data = err?.response?.data;
      if (data?.username?.[0]) setError(String(data.username[0]));
      else if (typeof data?.detail === 'string') setError(data.detail);
      else setError('Could not save changes. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleCancel() {
    navigate('/profile');
  }

  return (
    <main className="page-card profile-edit">
      <h1>Edit profile</h1>
      {error && <p className="profile-edit-error" role="alert">{error}</p>}
      <form className="profile-edit-form" onSubmit={handleSubmit}>
        <label className="profile-edit-field">
          <span>Username</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={submitting}
          />
        </label>

        <label className="profile-edit-field">
          <span>Email</span>
          <input
            type="email"
            value={user?.email ?? ''}
            readOnly
          />
        </label>

        <label className="profile-edit-field">
          <span>Bio</span>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            disabled={submitting}
          />
        </label>

        <label className="profile-edit-field">
          <span>Region</span>
          <input
            type="text"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            disabled={submitting}
          />
        </label>

        <label className="profile-edit-field">
          <span>Preferred language</span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            disabled={submitting}
          >
            {LANGUAGES.map((l) => (
              <option key={l.code || 'none'} value={l.code}>{l.label}</option>
            ))}
          </select>
        </label>

        <div className="profile-edit-actions">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save'}
          </button>
          <button type="button" className="btn btn-outline" onClick={handleCancel} disabled={submitting}>
            Cancel
          </button>
        </div>
      </form>
    </main>
  );
}
