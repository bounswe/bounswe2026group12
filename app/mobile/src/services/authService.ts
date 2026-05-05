import type { AuthSuccess, AuthUser } from './mockAuthService';
import { apiPatchJson, apiPostJson } from './httpClient';

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

