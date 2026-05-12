import { apiClient } from './api';

export async function fetchCulturalFacts({ heritageGroup, region } = {}) {
  const params = {};
  if (heritageGroup !== undefined && heritageGroup !== null) params.heritage_group = heritageGroup;
  if (region !== undefined && region !== null) params.region = region;
  const response = await apiClient.get('/api/cultural-facts/', { params });
  return response.data.results ?? response.data;
}

export async function fetchRandomCulturalFact() {
  try {
    const response = await apiClient.get('/api/cultural-facts/random/');
    return response.data;
  } catch (err) {
    if (err?.response?.status === 404) return null;
    throw err;
  }
}
