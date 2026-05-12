import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FeedbackBar from '../components/FeedbackBar';
import * as feedbackService from '../services/feedbackService';

jest.mock('../services/feedbackService');

function renderBar() {
  return render(<FeedbackBar />);
}

beforeEach(() => {
  jest.clearAllMocks();
  feedbackService.submitFeedback = jest.fn().mockResolvedValue({ message: 'ok' });
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('FeedbackBar', () => {
  it('renders the label, input, and Send button', () => {
    renderBar();
    expect(screen.getByLabelText(/what would you like to see on genipe/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
  });

  it('blocks submission when the input is empty and shows a validation message', async () => {
    renderBar();
    await userEvent.click(screen.getByRole('button', { name: /send/i }));
    expect(feedbackService.submitFeedback).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/share something/i);
  });

  it('calls submitFeedback with the entered text on submit', async () => {
    renderBar();
    await userEvent.type(screen.getByLabelText(/what would you like to see/i), 'More Persian recipes please');
    await userEvent.click(screen.getByRole('button', { name: /send/i }));
    await waitFor(() => expect(feedbackService.submitFeedback).toHaveBeenCalledWith('More Persian recipes please'));
  });

  it('shows the thank-you status after a successful submit and resets the input', async () => {
    renderBar();
    const input = screen.getByLabelText(/what would you like to see/i);
    await userEvent.type(input, 'Andean recipes');
    await userEvent.click(screen.getByRole('button', { name: /send/i }));
    expect(await screen.findByRole('status')).toHaveTextContent(/thanks! our team reads every note/i);
    expect(input).toHaveValue('');
  });

  it('clears the thank-you status after 4 seconds', async () => {
    renderBar();
    await userEvent.type(screen.getByLabelText(/what would you like to see/i), 'Hello');
    await userEvent.click(screen.getByRole('button', { name: /send/i }));
    expect(await screen.findByRole('status')).toBeInTheDocument();
    act(() => { jest.advanceTimersByTime(4000); });
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  });

  it('shows an error alert if the submission rejects', async () => {
    feedbackService.submitFeedback.mockRejectedValue(new Error('boom'));
    renderBar();
    await userEvent.type(screen.getByLabelText(/what would you like to see/i), 'Hello');
    await userEvent.click(screen.getByRole('button', { name: /send/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not send/i);
  });
});
