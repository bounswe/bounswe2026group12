import { apiClient } from './api';
import { MOCK_MAP_REGIONS } from '../mocks/mapRegions';

const USE_MOCK = process.env.REACT_APP_USE_MOCK === 'true';

export async function fetchMapRegions() {
  if (USE_MOCK) return MOCK_MAP_REGIONS;
  const response = await apiClient.get('/api/regions/map/');
  return response.data;
}
