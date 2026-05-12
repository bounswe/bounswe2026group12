import { useEffect, useRef, useState } from 'react';
import { submitFeedback } from '../services/feedbackService';
import './FeedbackBar.css';

export default function FeedbackBar() {
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const timerRef = useRef(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setStatus('');
    const trimmed = message.trim();
    if (!trimmed) {
      setError('Share something — even a single word helps.');
      return;
    }
    setSubmitting(true);
    try {
      await submitFeedback(trimmed);
      setMessage('');
      setStatus('Thanks! Our team reads every note.');
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setStatus(''), 4000);
    } catch {
      setError('Could not send your note right now. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="feedback-bar" aria-label="Send feedback">
      <form className="feedback-bar-form" onSubmit={handleSubmit}>
        <label className="feedback-bar-label" htmlFor="feedback-bar-input">
          What would you like to see on Genipe?
        </label>
        <div className="feedback-bar-row">
          <input
            id="feedback-bar-input"
            className="feedback-bar-input"
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Share an idea, a recipe you want, a region you're curious about…"
            disabled={submitting}
          />
          <button type="submit" className="feedback-bar-send btn btn-primary" disabled={submitting}>
            {submitting ? 'Sending…' : 'Send'}
          </button>
        </div>
        {error && <p className="feedback-bar-error" role="alert">{error}</p>}
        {status && <p className="feedback-bar-status" role="status">{status}</p>}
      </form>
    </section>
  );
}
