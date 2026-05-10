import { createContext, useState, useEffect } from 'react';
import { fetchMe } from '../services/authService';
import { registerWebDeviceToken } from '../services/deviceTokenService';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem('refresh_token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => !!localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  useEffect(() => {
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
    } else {
      localStorage.removeItem('refresh_token');
    }
  }, [refreshToken]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    fetchMe()
      .then((userData) => {
        setUser(userData);
        registerWebDeviceToken().catch(() => {});
      })
      .catch(() => { logout(); })
      .finally(() => { setLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function login(userData, accessToken, refreshTokenValue = null) {
    setUser(userData);
    setToken(accessToken);
    setRefreshToken(refreshTokenValue);
    registerWebDeviceToken().catch(() => {});
  }

  function updateUser(nextUserData) {
    setUser(nextUserData);
  }

  function logout() {
    setUser(null);
    setToken(null);
    setRefreshToken(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, refreshToken, login, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
