import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import ModerationPage from '../pages/ModerationPage';
import * as moderationService from '../services/moderationService';

jest.mock('../services/moderationService');

function renderPage(user) {
  return render(
    <AuthContext.Provider value={{ user, token: 'tok', login: jest.fn(), logout: jest.fn(), loading: false }}>
      <MemoryRouter initialEntries={['/admin/moderation']}>
        <Routes>
          <Route path="/admin/moderation" element={<ModerationPage />} />
          <Route path="/" element={<div>Home Page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

beforeEach(() => {
  moderationService.fetchModerationQueue.mockResolvedValue([]);
  moderationService.approveTag.mockResolvedValue();
  moderationService.rejectTag.mockResolvedValue();
});

describe('ModerationPage', () => {
  it('redirects non-staff users to home', async () => {
    renderPage({ id: 1, username: 'visitor', is_staff: false });
    await waitFor(() => expect(screen.getByText('Home Page')).toBeInTheDocument());
    expect(moderationService.fetchModerationQueue).not.toHaveBeenCalled();
  });

  it('renders the moderation queue for staff users', async () => {
    renderPage({ id: 1, username: 'admin', is_staff: true });
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /cultural tag moderation/i })).toBeInTheDocument();
    });
    expect(moderationService.fetchModerationQueue).toHaveBeenCalled();
  });

  it('renders a Religion chip for a pending religion tag', async () => {
    moderationService.fetchModerationQueue.mockResolvedValueOnce([
      {
        id: 21,
        tag: 'Ramazan',
        tag_type: 'religion',
        status: 'pending',
        submitted_by: 'alice',
        submitted_at: '2025-12-01T12:00:00Z',
        reviewed_at: null,
        reason: '',
      },
    ]);
    renderPage({ id: 1, username: 'admin', is_staff: true });
    await waitFor(() => {
      expect(screen.getByText('Religion')).toBeInTheDocument();
    });
    expect(screen.getByText('"Ramazan"')).toBeInTheDocument();
  });

  it('calls approveTag with the row tag_type and id', async () => {
    moderationService.fetchModerationQueue.mockResolvedValueOnce([
      {
        id: 21,
        tag: 'Ramazan',
        tag_type: 'religion',
        status: 'pending',
        submitted_by: 'alice',
        submitted_at: '2025-12-01T12:00:00Z',
        reviewed_at: null,
        reason: '',
      },
    ]);
    renderPage({ id: 1, username: 'admin', is_staff: true });
    const approveBtn = await screen.findByRole('button', { name: /approve/i });
    await userEvent.click(approveBtn);
    await waitFor(() => {
      expect(moderationService.approveTag).toHaveBeenCalledWith('religion', 21);
    });
  });

  it('calls rejectTag with the typed reason', async () => {
    moderationService.fetchModerationQueue.mockResolvedValueOnce([
      {
        id: 21,
        tag: 'Ramazan',
        tag_type: 'religion',
        status: 'pending',
        submitted_by: 'alice',
        submitted_at: '2025-12-01T12:00:00Z',
        reviewed_at: null,
        reason: '',
      },
    ]);
    renderPage({ id: 1, username: 'admin', is_staff: true });
    const reasonInput = await screen.findByLabelText(/reject reason for ramazan/i);
    await userEvent.type(reasonInput, 'looks fake');
    const rejectBtn = screen.getByRole('button', { name: /reject/i });
    await userEvent.click(rejectBtn);
    await waitFor(() => {
      expect(moderationService.rejectTag).toHaveBeenCalledWith('religion', 21, 'looks fake');
    });
  });
});
