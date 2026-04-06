import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import LoginPage from '../pages/LoginPage';
import * as authService from '../services/authService';

jest.mock('../services/authService');

const mockLogin = jest.fn();

function renderLogin() {
  render(
    <MemoryRouter>
      <AuthContext.Provider value={{ login: mockLogin, token: null }}>
        <LoginPage />
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    mockLogin.mockClear();
    authService.loginRequest.mockClear();
  });

  test('renders email and password fields and submit button', () => {
    renderLogin();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
  });

  test('shows validation error when email is empty on submit', async () => {
    renderLogin();
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
  });

  test('shows validation error when password is empty on submit', async () => {
    renderLogin();
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.com' } });
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));
    expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
  });

  test('calls loginRequest and login() on valid submit', async () => {
    authService.loginRequest.mockResolvedValueOnce({ access: 'tok', user: { username: 'alice' } });
    renderLogin();
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));
    await waitFor(() => expect(authService.loginRequest).toHaveBeenCalledWith('a@b.com', 'secret'));
    expect(mockLogin).toHaveBeenCalledWith({ username: 'alice' }, 'tok');
  });

  test('shows error message when loginRequest fails', async () => {
    authService.loginRequest.mockRejectedValueOnce(new Error('Invalid credentials'));
    renderLogin();
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));
    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
  });
});
