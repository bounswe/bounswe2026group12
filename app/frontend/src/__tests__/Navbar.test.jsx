import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Navbar from '../components/Navbar';

function renderNavbar(user = null, logout = jest.fn()) {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={{ user, logout }}>
        <Navbar />
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
    expect(screen.getByRole('link', { name: /new recipe/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /new story/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
  });

  it('calls logout when Log Out clicked', () => {
    const mockLogout = jest.fn();
    renderNavbar({ username: 'alice', id: 1 }, mockLogout);
    fireEvent.click(screen.getByRole('button', { name: /log out/i }));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
