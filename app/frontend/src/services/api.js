import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: BASE_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 401 → refresh → retry. Parallel 401s queue on a single refresh promise.
let refreshInFlight = null;

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    if (status !== 401 || !original || original._retry) {
      return Promise.reject(error);
    }
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      hardLogout();
      return Promise.reject(error);
    }
    original._retry = true;
    try {
      if (!refreshInFlight) {
        // Use raw axios (not apiClient) so the refresh POST bypasses this
        // interceptor — otherwise a 401 from the refresh endpoint would
        // re-enter and self-await refreshInFlight, deadlocking forever.
        refreshInFlight = axios
          .post(`${BASE_URL}/api/auth/refresh/`, { refresh: refreshToken })
          .then((res) => {
            const { access, refresh } = res.data;
            localStorage.setItem('token', access);
            if (refresh) localStorage.setItem('refresh_token', refresh);
            return access;
          })
          .finally(() => { refreshInFlight = null; });
      }
      const newAccess = await refreshInFlight;
      original.headers = original.headers || {};
      original.headers.Authorization = `Bearer ${newAccess}`;
      return apiClient.request(original);
    } catch (refreshError) {
      hardLogout();
      return Promise.reject(refreshError);
    }
  },
);

function hardLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('refresh_token');
  // Full reload guarantees React state resets and ProtectedRoute redirects cleanly.
  if (typeof window !== 'undefined' && window.location) {
    window.location.href = '/login';
  }
}

export function extractApiError(err, fallback = 'Something went wrong. Please try again.') {
  const data = err?.response?.data;
  if (!data || typeof data !== 'object') return fallback;

  const messages = [];
  for (const [key, value] of Object.entries(data)) {
    const items = Array.isArray(value) ? value : [value];
    if (key === 'non_field_errors' || key === 'detail') {
      messages.push(...items);
    } else {
      const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
      items.forEach((m) => messages.push(`${label}: ${m}`));
    }
  }
  return messages.length > 0 ? messages.join(' ') : fallback;
}
