import { render, screen, act, waitFor } from '@testing-library/react';
import { useContext } from 'react';
import { AuthProvider, AuthContext } from '../context/AuthContext';
import * as authService from '../services/authService';
import * as deviceTokenService from '../services/deviceTokenService';

jest.mock('../services/authService');
jest.mock('../services/deviceTokenService');

function TestConsumer() {
  const { user, token, login, logout, loading } = useContext(AuthContext);
  return (
    <div>
      <span data-testid="user">{user ? user.username : 'null'}</span>
      <span data-testid="token">{token || 'null'}</span>
      <span data-testid="loading">{loading ? 'true' : 'false'}</span>
      <button onClick={() => login({ username: 'alice' }, 'tok123')}>login</button>
      <button onClick={logout}>logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    authService.fetchMe.mockResolvedValue({ id: 1, username: 'restored-user' });
    deviceTokenService.registerWebDeviceToken.mockResolvedValue({});
  });

  afterEach(() => { jest.clearAllMocks(); });

  test('provides null user and token by default', () => {
    render(<AuthProvider><TestConsumer /></AuthProvider>);
    expect(screen.getByTestId('user').textContent).toBe('null');
    expect(screen.getByTestId('token').textContent).toBe('null');
  });

  test('login() sets user and token', () => {
    render(<AuthProvider><TestConsumer /></AuthProvider>);
    act(() => screen.getByText('login').click());
    expect(screen.getByTestId('user').textContent).toBe('alice');
    expect(screen.getByTestId('token').textContent).toBe('tok123');
    expect(deviceTokenService.registerWebDeviceToken).toHaveBeenCalledTimes(1);
  });

  test('login() persists token to localStorage', () => {
    render(<AuthProvider><TestConsumer /></AuthProvider>);
    act(() => screen.getByText('login').click());
    expect(localStorage.getItem('token')).toBe('tok123');
  });

  test('logout() clears user and token', () => {
    render(<AuthProvider><TestConsumer /></AuthProvider>);
    act(() => screen.getByText('login').click());
    act(() => screen.getByText('logout').click());
    expect(screen.getByTestId('user').textContent).toBe('null');
    expect(screen.getByTestId('token').textContent).toBe('null');
  });

  test('logout() removes token from localStorage', () => {
    render(<AuthProvider><TestConsumer /></AuthProvider>);
    act(() => screen.getByText('login').click());
    act(() => screen.getByText('logout').click());
    expect(localStorage.getItem('token')).toBeNull();
  });

  test('restores token from localStorage on mount', async () => {
    localStorage.setItem('token', 'existing-tok');
    render(<AuthProvider><TestConsumer /></AuthProvider>);
    expect(screen.getByTestId('token').textContent).toBe('existing-tok');
    await waitFor(() =>
      expect(screen.getByTestId('loading').textContent).toBe('false')
    );
  });

  test('restores user from /api/users/me/ when token exists on mount', async () => {
    authService.fetchMe.mockResolvedValue({ id: 7, username: 'restored-user' });
    localStorage.setItem('token', 'valid-tok');
    render(<AuthProvider><TestConsumer /></AuthProvider>);
    expect(screen.getByTestId('user').textContent).toBe('null');
    await waitFor(() =>
      expect(screen.getByTestId('user').textContent).toBe('restored-user')
    );
    expect(authService.fetchMe).toHaveBeenCalledTimes(1);
    expect(deviceTokenService.registerWebDeviceToken).toHaveBeenCalledTimes(1);
  });

  test('loading is true while fetching and false after fetchMe resolves', async () => {
    let resolveFetchMe;
    authService.fetchMe.mockReturnValue(
      new Promise((resolve) => { resolveFetchMe = resolve; })
    );
    localStorage.setItem('token', 'valid-tok');
    render(<AuthProvider><TestConsumer /></AuthProvider>);
    expect(screen.getByTestId('loading').textContent).toBe('true');
    await act(async () => { resolveFetchMe({ id: 7, username: 'restored-user' }); });
    expect(screen.getByTestId('loading').textContent).toBe('false');
  });

  test('calls logout() and clears token when fetchMe returns a 401 error', async () => {
    authService.fetchMe.mockRejectedValue({ response: { status: 401 } });
    localStorage.setItem('token', 'expired-tok');
    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() =>
      expect(screen.getByTestId('token').textContent).toBe('null')
    );
    expect(screen.getByTestId('user').textContent).toBe('null');
    expect(localStorage.getItem('token')).toBeNull();
  });
});
