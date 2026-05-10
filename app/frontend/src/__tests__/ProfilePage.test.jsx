import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import ProfilePage from '../pages/ProfilePage';

function renderPage({ user = { id: 1, username: 'eren', email: 'e@x.com', is_contactable: true }, logout = jest.fn(), updateUser = jest.fn() } = {}) {
  return render(
    <AuthContext.Provider value={{ user, token: 'tok', login: jest.fn(), logout, updateUser, loading: false }}>
      <MemoryRouter initialEntries={['/profile']}>
        <Routes>
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('ProfilePage', () => {
  it('displays the current user info', () => {
    renderPage();
    expect(screen.getByText('@eren')).toBeInTheDocument();
    expect(screen.getByText('e@x.com')).toBeInTheDocument();
  });

  it('renders the ContactabilityToggle', () => {
    renderPage();
    expect(screen.getByRole('checkbox', { name: /allow new threads|block new threads/i })).toBeInTheDocument();
  });

  it('logs the user out when Log Out is clicked', async () => {
    const logout = jest.fn();
    renderPage({ logout });
    await userEvent.click(screen.getByRole('button', { name: /log out/i }));
    expect(logout).toHaveBeenCalled();
  });

  it('has a link back to onboarding to edit cultural preferences', () => {
    renderPage();
    const link = screen.getByRole('link', { name: /edit cultural preferences/i });
    expect(link).toHaveAttribute('href', '/onboarding');
  });
});
