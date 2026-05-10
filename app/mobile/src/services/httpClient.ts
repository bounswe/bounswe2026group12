import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/apiBase';

const TOKEN_KEY = 'token';

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

async function authHeaders(): Promise<HeadersInit> {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function authJsonHeaders(): Promise<HeadersInit> {
  return {
    ...(await authHeaders()),
    'Content-Type': 'application/json',
  };
}

/** GET JSON — mirrors axios `apiClient.get` usage on web. */
export async function apiGetJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'GET',
    headers: await authHeaders(),
  });
  if (!res.ok) {
    const message = (await readErrorMessage(res)).trim();
    throw new Error(message || `GET ${path} failed (${res.status})`);
  }
  return parseJsonResponse<T>(res);
}

/** POST JSON — mirrors axios `apiClient.post` usage on web. */
export async function apiPostJson<T>(path: string, body: object): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: await authJsonHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const message = (await readErrorMessage(res)).trim();
    throw new Error(message || `POST ${path} failed (${res.status})`);
  }
  return parseJsonResponse<T>(res);
}

/** PATCH JSON — e.g. `PATCH /api/stories/:id/`. */
export async function apiPatchJson<T>(path: string, body: object): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'PATCH',
    headers: await authJsonHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const message = (await readErrorMessage(res)).trim();
    throw new Error(message || `PATCH ${path} failed (${res.status})`);
  }
  return parseJsonResponse<T>(res);
}

/** DELETE — succeeds on 204 with no body. */
export async function apiDelete(path: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  });
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
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'PATCH',
    headers,
    body: formData,
  });
  if (!res.ok) {
    const message = (await readErrorMessage(res)).trim();
    throw new Error(message || `PATCH ${path} failed (${res.status})`);
  }
}
