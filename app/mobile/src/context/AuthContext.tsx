import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { logoutRequest } from '../services/authService';
import { setAuthExpiredHandler } from '../services/httpClient';
import type { AuthUser } from '../services/mockAuthService';

const TOKEN_KEY = 'token';
const REFRESH_KEY = 'refresh';
const USER_KEY = 'user';

export type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  /** Derived session state (mirrors web usage of token presence). */
  isAuthenticated: boolean;
  isReady: boolean;
  login: (userData: AuthUser, accessToken: string, refreshToken?: string | null) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: AuthUser) => Promise<void>;
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

  const login = useCallback(
    async (userData: AuthUser, accessToken: string, refreshToken?: string | null) => {
      setUser(userData);
      setToken(accessToken);
      const entries: [string, string][] = [
        [TOKEN_KEY, accessToken],
        [USER_KEY, JSON.stringify(userData)],
      ];
      if (refreshToken) entries.push([REFRESH_KEY, refreshToken]);
      await AsyncStorage.multiSet(entries);
      if (!refreshToken) {
        // Older sessions may have a stale refresh from a previous login.
        await AsyncStorage.removeItem(REFRESH_KEY);
      }
    },
    [],
  );

  /**
   * Lightweight local-only logout used when httpClient detects an expired
   * session (token_not_valid + refresh failed). The full `logout()` below
   * also tries to blacklist the refresh server-side, but at this point the
   * refresh is already invalid so we skip the network call and just collapse
   * local state. AsyncStorage was already cleared by httpClient.
   */
  const localLogout = useCallback(() => {
    setUser(null);
    setToken(null);
  }, []);

  useEffect(() => {
    // Register with the http layer so a 401 token_not_valid that can't be
    // refreshed turns into `user === null` in React state. Screens guarded
    // by `isAuthenticated` will then redirect to Login on their own.
    setAuthExpiredHandler(() => localLogout());
    return () => setAuthExpiredHandler(null);
  }, [localLogout]);

  const logout = useCallback(async () => {
    // Best-effort: blacklist the refresh on the backend so a leaked access
    // token can't be paired with a refresh to mint new sessions. Local
    // logout still happens even if the request fails.
    try {
      const refresh = await AsyncStorage.getItem(REFRESH_KEY);
      if (refresh) {
        await logoutRequest(refresh);
      }
    } catch {
      // ignore — local logout below will still happen
    }
    setUser(null);
    setToken(null);
    await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_KEY, USER_KEY]);
  }, []);

  const updateUser = useCallback(async (userData: AuthUser) => {
    setUser(userData);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));
  }, []);

  const value = useMemo(
    () => ({ user, token, isAuthenticated: Boolean(token), isReady, login, logout, updateUser }),
    [user, token, isReady, login, logout, updateUser]
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
