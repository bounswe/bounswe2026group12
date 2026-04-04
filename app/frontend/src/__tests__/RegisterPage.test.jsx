import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import RegisterPage from '../pages/RegisterPage';
import * as authService from '../services/authService';

jest.mock('../services/authService');

const mockLogin = jest.fn();

function renderRegister() {
  render(
    <MemoryRouter>
      <AuthContext.Provider value={{ login: mockLogin, token: null }}>
        <RegisterPage />
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

describe('RegisterPage', () => {
  beforeEach(() => {
    mockLogin.mockClear();
    authService.registerRequest.mockClear();
  });

  test('renders username, email, password fields and submit button', () => {
    renderRegister();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
  });

  test('shows validation error when username is empty', async () => {
    renderRegister();
    fireEvent.click(screen.getByRole('button', { name: /register/i }));
    expect(await screen.findByText(/username is required/i)).toBeInTheDocument();
  });

  test('shows validation error when email is empty', async () => {
    renderRegister();
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'alice' } });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
  });

  test('shows validation error when password is empty', async () => {
    renderRegister();
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'alice' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.com' } });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));
    expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
  });

  test('calls registerRequest and login() on valid submit', async () => {
    authService.registerRequest.mockResolvedValueOnce({ access: 'tok', user: { username: 'alice' } });
    renderRegister();
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'alice' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));
    await waitFor(() =>
      expect(authService.registerRequest).toHaveBeenCalledWith('alice', 'a@b.com', 'secret')
    );
    expect(mockLogin).toHaveBeenCalledWith({ username: 'alice' }, 'tok');
  });

  test('shows error message when registerRequest fails', async () => {
    authService.registerRequest.mockRejectedValueOnce(new Error('Email already exists'));
    renderRegister();
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'alice' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));
    expect(await screen.findByText(/email already exists/i)).toBeInTheDocument();
  });
});
