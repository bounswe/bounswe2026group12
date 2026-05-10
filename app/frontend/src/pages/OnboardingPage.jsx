import { useContext, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { extractApiError } from '../services/api';
import { updateMe } from '../services/authService';
import './OnboardingPage.css';

const STEPS = [
  {
    key: 'cultural_interests',
    title: 'Cultural Interests',
    description: 'Choose cuisines and traditions you want to explore.',
    options: ['Ottoman', 'Anatolian', 'Balkan', 'Levantine', 'Mediterranean', 'Central Asian'],
  },
  {
    key: 'regional_ties',
    title: 'Regional Ties',
    description: 'Select regions connected to your family or roots.',
    options: ['Aegean', 'Marmara', 'Central Anatolia', 'Black Sea', 'Mediterranean', 'Southeastern Anatolia'],
  },
  {
    key: 'religious_preferences',
    title: 'Dietary / Religious Preferences',
    description: 'Pick preferences to personalize recommendations.',
    options: ['Halal', 'Kosher', 'Vegetarian', 'Vegan', 'Pescetarian', 'No Preference'],
  },
  {
    key: 'event_interests',
    title: 'Event Interests',
    description: 'Choose occasions you cook for most often.',
    options: ['Ramadan', 'Eid', 'Weddings', 'Family Gatherings', 'Religious Holidays', 'Weeknight Meals'],
  },
];

function normalizeList(value) {
  return Array.isArray(value) ? value : [];
}

export default function OnboardingPage() {
  const { user, updateUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [values, setValues] = useState(() => ({
    cultural_interests: normalizeList(user?.cultural_interests),
    regional_ties: normalizeList(user?.regional_ties),
    religious_preferences: normalizeList(user?.religious_preferences),
    event_interests: normalizeList(user?.event_interests),
  }));

  const current = STEPS[stepIndex];
  const progress = Math.round(((stepIndex + 1) / STEPS.length) * 100);

  const isComplete = useMemo(() => (
    STEPS.every((step) => Array.isArray(values[step.key]) && values[step.key].length > 0)
  ), [values]);

  function toggleValue(option) {
    setValues((prev) => {
      const currentValues = prev[current.key];
      const exists = currentValues.includes(option);
      const nextValues = exists
        ? currentValues.filter((item) => item !== option)
        : [...currentValues, option];
      return { ...prev, [current.key]: nextValues };
    });
  }

  function handleSkip() {
    localStorage.setItem('onboarding_skipped', 'true');
    navigate('/');
  }

  async function handleFinish() {
    setSaving(true);
    setError('');
    try {
      const payload = { ...values };
      const updated = await updateMe(payload);
      updateUser(updated);
      localStorage.removeItem('onboarding_skipped');
      navigate('/');
    } catch (err) {
      setError(extractApiError(err, 'Could not save onboarding preferences.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="page-card onboarding-page">
      <header className="onboarding-header">
        <h1>Cultural Onboarding</h1>
        <p>Help us personalize recipes, stories, and recommendations for you.</p>
        <div className="onboarding-progress" aria-label="Onboarding progress">
          <div className="onboarding-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="onboarding-step-label">Step {stepIndex + 1} of {STEPS.length}</span>
      </header>

      <section className="onboarding-step">
        <h2>{current.title}</h2>
        <p>{current.description}</p>
        <div className="onboarding-options">
          {current.options.map((option) => {
            const checked = values[current.key].includes(option);
            return (
              <label key={option} className={`onboarding-chip ${checked ? 'onboarding-chip-active' : ''}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleValue(option)}
                />
                <span>{option}</span>
              </label>
            );
          })}
        </div>
      </section>

      {error && <p className="onboarding-error">{error}</p>}

      <footer className="onboarding-actions">
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => setStepIndex((prev) => Math.max(0, prev - 1))}
          disabled={stepIndex === 0 || saving}
        >
          Back
        </button>

        <div className="onboarding-right-actions">
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleSkip}
            disabled={saving}
          >
            Skip for now
          </button>

          {stepIndex < STEPS.length - 1 ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setStepIndex((prev) => Math.min(STEPS.length - 1, prev + 1))}
              disabled={saving}
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleFinish}
              disabled={!isComplete || saving}
            >
              {saving ? 'Saving…' : 'Finish'}
            </button>
          )}
        </div>
      </footer>

      <p className="onboarding-help">
        You can update these preferences later from your account area.
        <Link to="/"> Go back home</Link>
      </p>
    </main>
  );
}

