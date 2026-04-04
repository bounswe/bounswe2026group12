import { render, screen, act } from '@testing-library/react';
import { useContext } from 'react';
import { AuthProvider, AuthContext } from '../context/AuthContext';

function TestConsumer() {
  const { user, token, login, logout } = useContext(AuthContext);
  return (
    <div>
      <span data-testid="user">{user ? user.username : 'null'}</span>
      <span data-testid="token">{token || 'null'}</span>
      <button onClick={() => login({ username: 'alice' }, 'tok123')}>login</button>
      <button onClick={logout}>logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

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

  test('restores token from localStorage on mount', () => {
    localStorage.setItem('token', 'existing-tok');
    render(<AuthProvider><TestConsumer /></AuthProvider>);
    expect(screen.getByTestId('token').textContent).toBe('existing-tok');
  });
});
