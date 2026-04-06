import { apiClient } from './api';

export async function search(q, region, language) {
  const response = await apiClient.get('/api/search/', {
    params: { q, region, language },
  });
  return response.data;
}

export async function fetchRegions() {
  const response = await apiClient.get('/api/regions/');
  return response.data;
}
