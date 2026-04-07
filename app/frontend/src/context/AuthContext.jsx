import { createContext, useState, useEffect } from 'react';
import { fetchMe } from '../services/authService';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
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
    if (!token) {
      setLoading(false);
      return;
    }
    fetchMe()
      .then((userData) => { setUser(userData); })
      .catch(() => { logout(); })
      .finally(() => { setLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function login(userData, accessToken) {
    setUser(userData);
    setToken(accessToken);
  }

  function logout() {
    setUser(null);
    setToken(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
