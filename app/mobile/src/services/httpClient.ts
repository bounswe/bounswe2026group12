import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/apiBase';

const TOKEN_KEY = 'token';

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
    'Content-Type': 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
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
  return res.json() as Promise<T>;
}

/** POST JSON — mirrors axios `apiClient.post` usage on web. */
export async function apiPostJson<T>(path: string, body: object): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const message = (await readErrorMessage(res)).trim();
    throw new Error(message || `POST ${path} failed (${res.status})`);
  }
  return res.json() as Promise<T>;
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
