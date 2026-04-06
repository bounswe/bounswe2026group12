import { apiClient } from './api';

export async function search(q, region, language) {
  const params = { q };
  if (region) params.region = region;
  if (language) params.language = language;
  const response = await apiClient.get('/api/search/', { params });
  return response.data;
}

export async function fetchRegions() {
  const response = await apiClient.get('/api/regions/');
  return response.data;
}
