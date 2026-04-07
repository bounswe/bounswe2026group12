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
