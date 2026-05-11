import { apiClient } from './api';
import { getMockSubstitutes } from '../mocks/substitutions';

const USE_MOCK = process.env.REACT_APP_USE_MOCK === 'true';

export async function fetchSubstitutes(ingredientId, ingredientName) {
  if (USE_MOCK) return getMockSubstitutes(ingredientName);
  const response = await apiClient.get(`/api/ingredients/${ingredientId}/substitutes/`);
  return response.data;
}
