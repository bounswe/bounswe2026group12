import { apiClient } from './api';
import { MOCK_MAP_REGIONS } from '../mocks/mapRegions';

const USE_MOCK = process.env.REACT_APP_USE_MOCK === 'true';

export async function fetchMapRegions() {
  if (USE_MOCK) return MOCK_MAP_REGIONS;
  const response = await apiClient.get('/api/map/regions/');
  return response.data;
}

export async function fetchMapRegionContent(regionId) {
  if (USE_MOCK) return [];
  const response = await apiClient.get(`/api/map/regions/${regionId}/content/`, { params: { page_size: 100 } });
  return response.data.results ?? response.data;
}
