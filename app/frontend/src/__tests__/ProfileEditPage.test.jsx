import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProfileEditPage from '../pages/ProfileEditPage';
import { AuthContext } from '../context/AuthContext';
import * as authService from '../services/authService';

jest.mock('../services/authService');

function renderPage({ user = { id: 1, username: 'me', email: 'me@x.com', bio: 'old bio', region: 'Aegean', preferred_language: 'tr' }, updateUser = jest.fn() } = {}) {
  return {
    updateUser,
    ...render(
      <MemoryRouter initialEntries={['/profile/edit']}>
        <AuthContext.Provider value={{ user, token: 't', refreshToken: 'r', login: jest.fn(), logout: jest.fn(), updateUser, loading: false }}>
          <Routes>
            <Route path="/profile/edit" element={<ProfileEditPage />} />
            <Route path="/profile" element={<div>profile-home</div>} />
          </Routes>
        </AuthContext.Provider>
      </MemoryRouter>,
    ),
  };
}

beforeEach(() => jest.clearAllMocks());

describe('ProfileEditPage', () => {
  it('prefills inputs from AuthContext user', () => {
    renderPage();
    expect(screen.getByLabelText(/username/i)).toHaveValue('me');
    expect(screen.getByLabelText(/bio/i)).toHaveValue('old bio');
    expect(screen.getByLabelText(/region/i)).toHaveValue('Aegean');
    expect(screen.getByLabelText(/language/i)).toHaveValue('tr');
  });

  it('renders email as read-only', () => {
    renderPage();
    const email = screen.getByLabelText(/email/i);
    expect(email).toHaveValue('me@x.com');
    expect(email).toHaveAttribute('readonly');
  });

  it('Save calls authService.updateMe with edited payload and calls updateUser', async () => {
    authService.updateMe.mockResolvedValue({ id: 1, username: 'me2', email: 'me@x.com', bio: 'new bio', region: 'Aegean', preferred_language: 'tr' });
    const { updateUser } = renderPage();
    await userEvent.clear(screen.getByLabelText(/username/i));
    await userEvent.type(screen.getByLabelText(/username/i), 'me2');
    await userEvent.clear(screen.getByLabelText(/bio/i));
    await userEvent.type(screen.getByLabelText(/bio/i), 'new bio');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(authService.updateMe).toHaveBeenCalledWith({
      username: 'me2',
      bio: 'new bio',
      region: 'Aegean',
      preferred_language: 'tr',
    }));
    expect(updateUser).toHaveBeenCalledWith(expect.objectContaining({ username: 'me2', bio: 'new bio' }));
  });

  it('Cancel navigates back to /profile without calling updateMe', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(authService.updateMe).not.toHaveBeenCalled();
    expect(await screen.findByText('profile-home')).toBeInTheDocument();
  });

  it('shows a username-required error when username is empty', async () => {
    renderPage();
    await userEvent.clear(screen.getByLabelText(/username/i));
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(await screen.findByText(/username is required/i)).toBeInTheDocument();
    expect(authService.updateMe).not.toHaveBeenCalled();
  });

  it('surfaces a 400 username-taken error from the backend', async () => {
    authService.updateMe.mockRejectedValue({ response: { status: 400, data: { username: ['username already taken'] } } });
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(await screen.findByText(/username already taken/i)).toBeInTheDocument();
  });

  it('disables Save while the request is in flight', async () => {
    let resolve;
    authService.updateMe.mockReturnValue(new Promise((r) => { resolve = r; }));
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
    resolve({ id: 1, username: 'me', email: 'me@x.com' });
    await waitFor(() => expect(screen.queryByRole('button', { name: /saving/i })).not.toBeInTheDocument());
  });
});
