import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/apiBase';

const TOKEN_KEY = 'token';
const REFRESH_KEY = 'refresh';
const USER_KEY = 'user';

/**
 * Typed error surfaced when the session is unrecoverable — either there is no
 * refresh token at the moment a `token_not_valid` 401 lands, or the refresh
 * endpoint itself rejected our refresh token. The http layer intentionally
 * does NOT navigate; it just clears local auth state and throws this so the
 * screen / AuthContext can route the user to Login.
 */
export class AuthExpiredError extends Error {
  readonly isAuthExpired = true;
  constructor(message = 'Session expired') {
    super(message);
    this.name = 'AuthExpiredError';
  }
}

/**
 * AuthContext registers a callback here on mount so that when the http layer
 * decides the session is dead it can notify React state (user → null) without
 * the http layer itself knowing about navigation or React. Kept as a single
 * subscriber on purpose: there is only ever one AuthProvider mounted.
 */
type AuthExpiredHandler = () => void;
let authExpiredHandler: AuthExpiredHandler | null = null;
export function setAuthExpiredHandler(handler: AuthExpiredHandler | null): void {
  authExpiredHandler = handler;
}

/**
 * Read a JSON response safely. Returns `null` for 204 No Content and for any
 * empty body — `res.json()` would otherwise throw `SyntaxError: Unexpected end
 * of JSON input` on these inputs and crash the calling screen. Most mutation
 * endpoints in this API do return JSON, so this only kicks in for the rare
 * empty-body cases (delete-style responses, certain 200/204 toggles).
 */
async function parseJsonResponse<T>(res: Response): Promise<T> {
  if (res.status === 204) return null as T;
  const text = await res.text();
  if (!text || !text.trim()) return null as T;
  return JSON.parse(text) as T;
}

/**
 * Convert the `next` URL from a DRF paginated response into a relative path
 * the rest of the client can re-fetch. Bad/malformed links are tolerated by
 * returning `null` (treated as last page) instead of throwing — `new URL()`
 * is strict and used to take down the entire list fetch on a single bad link.
 */
export function nextPagePath(next: string | null | undefined): string | null {
  if (!next) return null;
  try {
    const url = new URL(next);
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

async function readErrorMessage(res: Response): Promise<string> {
  const contentType = res.headers.get('content-type') ?? '';
  try {
    if (contentType.includes('application/json')) {
      const data = (await res.json()) as any;
      const detail = typeof data?.detail === 'string' ? data.detail : null;
      const nonField =
        Array.isArray(data?.non_field_errors) && typeof data.non_field_errors[0] === 'string'
          ? data.non_field_errors[0]
          : null;
      return detail || nonField || JSON.stringify(data);
    }
    const text = await res.text();
    return text;
  } catch {
    return '';
  }
}

/**
 * Module-level single-flight promise. When several authenticated requests
 * race a token_not_valid 401 at the same time we only want ONE call to
 * /api/auth/refresh/; every other 401'd caller awaits the same promise and
 * then replays its own request with the freshly minted access token.
 *
 * Resolves to the new access token on success, or `null` if refresh failed
 * (caller treats `null` as terminal → graceful logout).
 */
let refreshInFlight: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  const refreshToken = await AsyncStorage.getItem(REFRESH_KEY);
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/refresh/`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh: refreshToken }),
    });
    if (res.status === 401 || !res.ok) {
      return null;
    }
    const text = await res.text();
    if (!text) return null;
    const data = JSON.parse(text) as { access?: string };
    if (!data?.access) return null;
    await AsyncStorage.setItem(TOKEN_KEY, data.access);
    return data.access;
  } catch {
    return null;
  }
}

function getOrStartRefresh(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

/**
 * Clear all auth-related AsyncStorage keys and notify any registered handler
 * (AuthContext) so React state collapses to logged-out. The http layer never
 * navigates directly — screens (or the AuthContext consumer) decide that.
 */
async function gracefulLogout(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_KEY, USER_KEY]);
  } catch {
    // ignore — best effort
  }
  try {
    authExpiredHandler?.();
  } catch {
    // never let a bad subscriber take down the request path
  }
}

/**
 * Detect SimpleJWT's `token_not_valid` payload without consuming the body of
 * a response we may still want to return to the caller. The body is read via
 * .clone() so the original `res` remains usable if the caller decides to.
 */
async function isTokenNotValid401(res: Response): Promise<boolean> {
  if (res.status !== 401) return false;
  try {
    const cloned = res.clone();
    const text = await cloned.text();
    if (!text) return false;
    const data = JSON.parse(text) as { code?: string };
    return data?.code === 'token_not_valid';
  } catch {
    return false;
  }
}

type FetchArgs = { path: string; init: RequestInit; isJsonBody: boolean };

/**
 * Core authenticated fetch with one-shot refresh + replay. Flow:
 *   1. Attach current access token (if any) and send the request.
 *   2. Non-401 or non token_not_valid 401 → return as-is (existing behaviour).
 *   3. token_not_valid 401 + no refresh token → graceful logout, throw
 *      AuthExpiredError so callers can route to Login.
 *   4. token_not_valid 401 + refresh token → single-flight refresh. On
 *      success replay the original request ONCE with the new token. On
 *      failure (or replay also 401) → graceful logout + AuthExpiredError.
 *
 * Requests sent without an access token in the first place keep their old
 * behaviour: we don't try to refresh, we just return whatever came back.
 */
async function authedFetch({ path, init, isJsonBody }: FetchArgs): Promise<Response> {
  const initialToken = await AsyncStorage.getItem(TOKEN_KEY);
  const buildHeaders = (token: string | null): Record<string, string> => {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (isJsonBody) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    // Merge any caller-provided headers last so they can override.
    const callerHeaders = init.headers as Record<string, string> | undefined;
    if (callerHeaders) Object.assign(headers, callerHeaders);
    return headers;
  };

  const firstRes = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: buildHeaders(initialToken),
  });

  // Anonymous request, or non-401, or a 401 that isn't `token_not_valid`
  // (e.g. permission denied on a public endpoint) → don't touch refresh.
  if (!initialToken || firstRes.status !== 401) return firstRes;
  const tokenNotValid = await isTokenNotValid401(firstRes);
  if (!tokenNotValid) return firstRes;

  const newAccess = await getOrStartRefresh();
  if (!newAccess) {
    await gracefulLogout();
    throw new AuthExpiredError();
  }

  // Replay exactly once with the fresh token. If this also returns 401 we
  // do NOT loop — refresh just succeeded but the access token still isn't
  // accepted, which means the session is unrecoverable.
  const replayRes = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: buildHeaders(newAccess),
  });
  if (replayRes.status === 401) {
    await gracefulLogout();
    throw new AuthExpiredError();
  }
  return replayRes;
}

/** GET JSON — mirrors axios `apiClient.get` usage on web. */
export async function apiGetJson<T>(path: string): Promise<T> {
  const res = await authedFetch({ path, init: { method: 'GET' }, isJsonBody: false });
  if (!res.ok) {
    const message = (await readErrorMessage(res)).trim();
    throw new Error(message || `GET ${path} failed (${res.status})`);
  }
  return parseJsonResponse<T>(res);
}

/** POST JSON — mirrors axios `apiClient.post` usage on web. */
export async function apiPostJson<T>(path: string, body: object): Promise<T> {
  const res = await authedFetch({
    path,
    init: { method: 'POST', body: JSON.stringify(body) },
    isJsonBody: true,
  });
  if (!res.ok) {
    const message = (await readErrorMessage(res)).trim();
    throw new Error(message || `POST ${path} failed (${res.status})`);
  }
  return parseJsonResponse<T>(res);
}

/** PATCH JSON — e.g. `PATCH /api/stories/:id/`. */
export async function apiPatchJson<T>(path: string, body: object): Promise<T> {
  const res = await authedFetch({
    path,
    init: { method: 'PATCH', body: JSON.stringify(body) },
    isJsonBody: true,
  });
  if (!res.ok) {
    const message = (await readErrorMessage(res)).trim();
    throw new Error(message || `PATCH ${path} failed (${res.status})`);
  }
  return parseJsonResponse<T>(res);
}

/** DELETE — succeeds on 204 with no body. */
export async function apiDelete(path: string): Promise<void> {
  const res = await authedFetch({ path, init: { method: 'DELETE' }, isJsonBody: false });
  if (!res.ok) {
    const message = (await readErrorMessage(res)).trim();
    throw new Error(message || `DELETE ${path} failed (${res.status})`);
  }
}

/**
 * PATCH multipart form (recipe update). Do not set `Content-Type`; RN sets boundary.
 * Same endpoint shape as web `updateRecipe` (`PATCH /api/recipes/:id/`).
 */
export async function apiPatchFormData(path: string, formData: FormData): Promise<void> {
  const res = await authedFetch({
    path,
    init: { method: 'PATCH', body: formData as unknown as BodyInit },
    isJsonBody: false,
  });
  if (!res.ok) {
    const message = (await readErrorMessage(res)).trim();
    throw new Error(message || `PATCH ${path} failed (${res.status})`);
  }
}
