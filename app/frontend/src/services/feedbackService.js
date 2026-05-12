/**
 * Frontend-only stub for the home page Feedback Bar (#876).
 *
 * The real backend endpoint (POST /api/feedback/) is tracked in #877. Once
 * that lands, swap the body for `apiClient.post('/api/feedback/', { message })`
 * and update the test in feedbackService.test.js.
 */
export async function submitFeedback(message) {
  const trimmed = typeof message === 'string' ? message.trim() : '';
  if (!trimmed) {
    throw new Error('Message is required.');
  }
  if (process.env.NODE_ENV !== 'test') {
    // Light client-side trace until the backend lands.
    // eslint-disable-next-line no-console
    console.info('[feedback]', trimmed);
  }
  return { message: trimmed };
}
