import type { AuthSuccess, AuthUser } from './mockAuthService';
import { apiPatchJson, apiPostJson } from './httpClient';

/**
 * Best-effort server-side logout: blacklists the refresh token so a leaked
 * access token can't be paired with the refresh to mint new sessions.
 * Returns true on success, false on any failure — callers should still clear
 * local auth state either way.
 */
export async function logoutRequest(refreshToken: string): Promise<boolean> {
  try {
    await apiPostJson<unknown>('/api/auth/logout/', { refresh: refreshToken });
    return true;
  } catch {
    return false;
  }
}

/**
 * Real backend auth service.
 * Mirrors web `authService.js` but uses the mobile fetch-based client.
 *
 * Endpoints:
 * - POST /api/auth/login/
 * - POST /api/auth/register/
 */

export async function loginRequest(email: string, password: string): Promise<AuthSuccess> {
  return apiPostJson<AuthSuccess>('/api/auth/login/', { email, password });
}

export async function registerRequest(
  username: string,
  email: string,
  password: string
): Promise<AuthSuccess> {
  return apiPostJson<AuthSuccess>('/api/auth/register/', { username, email, password });
}

/** PATCH /api/users/me/ — same shape as web `updateMe` in `authService.js`. */
export async function updateMe(payload: Partial<AuthUser>): Promise<AuthUser> {
  return apiPatchJson<AuthUser>('/api/users/me/', payload);
}

