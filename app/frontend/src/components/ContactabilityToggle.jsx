import { useEffect, useState } from 'react';
import { extractApiError } from '../services/api';
import { getContactabilityValue, updateMe } from '../services/authService';

export default function ContactabilityToggle({ user, onUserUpdated }) {
  const [enabled, setEnabled] = useState(getContactabilityValue(user));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setEnabled(getContactabilityValue(user));
  }, [user]);

  async function handleChange(event) {
    const nextValue = event.target.checked;
    const previousValue = enabled;
    setEnabled(nextValue);
    setSaving(true);
    setError('');

    try {
      const updated = await updateMe({ is_contactable: nextValue });
      onUserUpdated(updated);
    } catch (err) {
      setEnabled(previousValue);
      setError(extractApiError(err, 'Could not update messaging preference.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="contactability-card" aria-label="Messaging preferences">
      <div>
        <h2 className="contactability-title">Messaging Preferences</h2>
        <p className="contactability-desc">
          Allow others to start new message threads with you.
        </p>
      </div>
      <label className="contactability-toggle">
        <input
          type="checkbox"
          checked={enabled}
          onChange={handleChange}
          disabled={saving}
        />
        <span>{enabled ? 'Allow new threads' : 'Block new threads'}</span>
      </label>
      {error && <p className="contactability-error">{error}</p>}
    </section>
  );
}

