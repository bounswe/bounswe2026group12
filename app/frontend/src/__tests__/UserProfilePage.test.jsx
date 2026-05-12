import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import UserProfilePage from '../pages/UserProfilePage';
import * as passportService from '../services/passportService';

jest.mock('../services/passportService');

const mockProfile = {
  username: 'alice',
  bio: 'Loves Anatolian cuisine.',
  region: 'Aegean',
  created_at: '2024-03-01T00:00:00Z',
  recipe_count: 4,
  story_count: 2,
  cultural_interests: ['Ottoman', 'Mediterranean'],
  religious_preferences: ['Halal'],
  event_interests: ['Ramadan'],
};

function renderPage(username, currentUser = null) {
  return render(
    <AuthContext.Provider value={{ user: currentUser, token: currentUser ? 'tok' : null, login: jest.fn(), logout: jest.fn(), updateUser: jest.fn() }}>
      <MemoryRouter initialEntries={[`/users/${username}`]}>
        <Routes>
          <Route path="/users/:username" element={<UserProfilePage />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  passportService.getPublicProfile.mockResolvedValue(mockProfile);
  // UserProfilePage also fires getPassport in a separate effect; without a
  // resolved mock the auto-mocked function returns undefined and the .then
  // call crashes before the .catch handler can swallow it.
  passportService.getPassport.mockResolvedValue(null);
});

describe('UserProfilePage', () => {
  it('renders username and stats after load', async () => {
    renderPage('alice');
    await waitFor(() => expect(screen.getByText('@alice')).toBeInTheDocument());
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders cultural preference tags', async () => {
    renderPage('alice');
    await waitFor(() => expect(screen.getByText('Ottoman')).toBeInTheDocument());
    expect(screen.getByText('Halal')).toBeInTheDocument();
    expect(screen.getByText('Ramadan')).toBeInTheDocument();
  });

  it('renders bio when present', async () => {
    renderPage('alice');
    await waitFor(() => expect(screen.getByText('Loves Anatolian cuisine.')).toBeInTheDocument());
  });

  it('shows Edit preferences link in own-profile mode', async () => {
    renderPage('alice', { id: 1, username: 'alice' });
    await waitFor(() => expect(screen.getByRole('link', { name: /edit preferences/i })).toBeInTheDocument());
  });

  it('does not show Edit preferences link in visitor mode', async () => {
    renderPage('alice', { id: 2, username: 'bob' });
    await waitFor(() => expect(screen.queryByRole('link', { name: /edit preferences/i })).not.toBeInTheDocument());
  });

  it('does not show Edit preferences link when logged out', async () => {
    renderPage('alice', null);
    await waitFor(() => expect(screen.queryByRole('link', { name: /edit preferences/i })).not.toBeInTheDocument());
  });

  it('shows 404 message when profile not found', async () => {
    passportService.getPublicProfile.mockRejectedValue({ response: { status: 404 } });
    renderPage('ghost');
    await waitFor(() => expect(screen.getByText(/no user found/i)).toBeInTheDocument());
  });

  it('shows error message on other failures', async () => {
    passportService.getPublicProfile.mockRejectedValue({ response: { status: 500, data: { detail: 'Server error' } } });
    renderPage('alice');
    await waitFor(() => expect(screen.getByText(/server error/i)).toBeInTheDocument());
  });

  it('handles empty username gracefully (no crash)', async () => {
    passportService.getPublicProfile.mockResolvedValue({ ...mockProfile, username: '' });
    renderPage('');
    await waitFor(() => expect(screen.queryByText('loading', { exact: false })).not.toBeInTheDocument());
    expect(screen.queryByText('@@')).not.toBeInTheDocument();
  });
});
