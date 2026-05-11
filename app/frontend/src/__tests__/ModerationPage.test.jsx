import { render, screen, waitFor } from '@testing-library/react';
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
});
