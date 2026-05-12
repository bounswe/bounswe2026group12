import { submitFeedback } from '../services/feedbackService';

describe('submitFeedback (#876 stub)', () => {
  it('resolves with { message } so consumers can chain', async () => {
    const result = await submitFeedback('I want more Persian recipes.');
    expect(result).toEqual({ message: 'I want more Persian recipes.' });
  });

  it('rejects when message is blank after trim', async () => {
    await expect(submitFeedback('   ')).rejects.toThrow(/required/i);
  });
});
