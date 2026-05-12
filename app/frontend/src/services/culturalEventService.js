import { apiClient } from './api';

export async function fetchCulturalEvents({ month, region } = {}) {
  const params = {};
  if (month !== undefined && month !== null && month !== '') {
    params.month = String(month).padStart(2, '0');
  }
  if (region !== undefined && region !== null && region !== '') {
    params.region = region;
  }
  const response = await apiClient.get('/api/cultural-events/', { params });
  return response.data.results ?? response.data;
}
