import { apiClient } from './api';
import { filterMockResults, MOCK_REGIONS } from '../mocks/searchResults';

const USE_MOCK = process.env.REACT_APP_USE_MOCK === 'true';

function normalizeResult(item) {
  return {
    type: item.result_type,
    id: item.id,
    title: item.title,
    region: item.region_tag ?? null,
    thumbnail: item.image ?? null,
  };
}

export async function search(q, region, language) {
  if (USE_MOCK) return filterMockResults(q, region);
  const params = { q };
  if (region) params.region = region;
  if (language) params.language = language;
  const response = await apiClient.get('/api/search/', { params });
  const { recipes = [], stories = [] } = response.data;
  return [...recipes, ...stories].map(normalizeResult);
}

export async function fetchRegions() {
  if (USE_MOCK) return MOCK_REGIONS;
  const response = await apiClient.get('/api/regions/');
  return response.data;
}
