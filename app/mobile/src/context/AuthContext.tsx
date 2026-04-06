import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { AuthUser } from '../services/mockAuthService';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

export type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isReady: boolean;
  login: (userData: AuthUser, accessToken: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [t, uJson] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);
        if (cancelled) return;
        if (t) setToken(t);
        if (uJson) setUser(JSON.parse(uJson) as AuthUser);
      } catch {
        // ignore corrupt storage
      } finally {
        if (!cancelled) setIsReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (userData: AuthUser, accessToken: string) => {
    setUser(userData);
    setToken(accessToken);
    await AsyncStorage.multiSet([
      [TOKEN_KEY, accessToken],
      [USER_KEY, JSON.stringify(userData)],
    ]);
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    setToken(null);
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
  }, []);

  const value = useMemo(
    () => ({ user, token, isReady, login, logout }),
    [user, token, isReady, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
