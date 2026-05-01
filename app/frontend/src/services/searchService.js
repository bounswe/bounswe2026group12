import { apiClient } from './api';
import { filterMockResults, MOCK_REGIONS } from '../mocks/searchResults';

const USE_MOCK = process.env.REACT_APP_USE_MOCK === 'true';

function normalizeResult(item) {
  return {
    type: item.result_type || item.type,
    id: item.id,
    title: item.title,
    region: item.region_tag ?? null,
    thumbnail: item.image ?? null,
    rankScore: Number(item.rank_score || 0),
    rankReason: item.rank_reason || null,
  };
}

export async function search(q, region, language, filters = {}) {
  if (USE_MOCK) return filterMockResults(q, region);
  const params = { q };
  if (region) params.region = region;
  if (language) params.language = language;
  const filterKeys = [
    'diet',
    'diet_exclude',
    'event',
    'event_exclude',
    'ingredient',
    'ingredient_exclude',
  ];
  filterKeys.forEach((key) => {
    if (filters[key]) params[key] = filters[key];
  });
  const response = await apiClient.get('/api/search/', { params });
  if (Array.isArray(response.data?.results)) {
    return response.data.results.map(normalizeResult);
  }
  const { recipes = [], stories = [] } = response.data;
  return [...recipes, ...stories].map(normalizeResult);
}

export async function fetchRegions() {
  if (USE_MOCK) return MOCK_REGIONS;
  const response = await apiClient.get('/api/regions/');
  return response.data;
}
