import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { NotificationContext } from '../context/NotificationContext';
import Navbar from '../components/Navbar';

function renderNavbar(user = null, logout = jest.fn()) {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={{ user, logout }}>
        <NotificationContext.Provider
          value={{
            notifications: [{ id: 1, message: 'test', isRead: false, createdAt: new Date().toISOString() }],
            unreadCount: 1,
            loading: false,
            error: '',
            markRead: jest.fn(),
          }}
        >
          <Navbar />
        </NotificationContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

describe('Navbar', () => {
  it('renders brand link pointing to /', () => {
    renderNavbar();
    expect(screen.getByRole('link', { name: /genipe/i })).toHaveAttribute('href', '/');
  });

  it('shows Log In and Sign Up links when logged out', () => {
    renderNavbar();
    expect(screen.getByRole('link', { name: /log in/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign up/i })).toBeInTheDocument();
  });

  it('does not show Log Out button when logged out', () => {
    renderNavbar();
    expect(screen.queryByRole('button', { name: /log out/i })).not.toBeInTheDocument();
  });

  it('shows username and nav links when logged in', () => {
    renderNavbar({ username: 'alice', id: 1 });
    expect(screen.getByText('@alice')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /@alice/i }));
    expect(screen.getByRole('link', { name: /new recipe/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /new story/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
  });

  it('calls logout when Log Out clicked', () => {
    const mockLogout = jest.fn();
    renderNavbar({ username: 'alice', id: 1 }, mockLogout);
    fireEvent.click(screen.getByRole('button', { name: /@alice/i }));
    fireEvent.click(screen.getByRole('button', { name: /log out/i }));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('renders Recipes browse link', () => {
    renderNavbar();
    expect(screen.getByRole('link', { name: /^recipes$/i })).toBeInTheDocument();
  });

  it('renders Stories browse link', () => {
    renderNavbar();
    expect(screen.getByRole('link', { name: /^stories$/i })).toBeInTheDocument();
  });

  it('exposes a Profile link to /profile inside the user dropdown', () => {
    renderNavbar({ id: 1, username: 'eren' });
    fireEvent.click(screen.getByRole('button', { name: /@eren/i }));
    const link = screen.getByRole('link', { name: /^profile$/i });
    expect(link).toHaveAttribute('href', '/profile');
  });

  it('routes "My Account" to the user\'s public profile by username', () => {
    renderNavbar({ id: 1, username: 'eren' });
    fireEvent.click(screen.getByRole('button', { name: /@eren/i }));
    const link = screen.getByRole('link', { name: /my account/i });
    expect(link).toHaveAttribute('href', '/users/eren');
  });

  it('renders @username inside the toggle button (no separate profile link)', () => {
    renderNavbar({ id: 1, username: 'eren' });
    const toggle = screen.getByRole('button', { name: /@eren/i });
    expect(toggle.textContent).toContain('@eren');
    // The username text should not be a standalone link in the header anymore.
    expect(screen.queryByRole('link', { name: '@eren' })).not.toBeInTheDocument();
  });

  it('renders a Calendar link to /calendar', () => {
    renderNavbar();
    const link = screen.getByRole('link', { name: /calendar/i });
    expect(link).toHaveAttribute('href', '/calendar');
  });
});
