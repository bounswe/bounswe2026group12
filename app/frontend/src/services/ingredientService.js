import { apiClient } from './api';
import { getMockSubstitutes } from '../mocks/substitutions';

const USE_MOCK = process.env.REACT_APP_USE_MOCK === 'true';

const GROUPS = ['ingredient', 'flavor', 'texture', 'chemical'];

export async function fetchSubstitutes(ingredientId, ingredientName) {
  if (USE_MOCK) return getMockSubstitutes(ingredientName);
  const response = await apiClient.get(`/api/ingredients/${ingredientId}/substitutes/`);
  const grouped = response.data;
  if (Array.isArray(grouped)) return grouped; // tolerate legacy array shape
  return GROUPS.flatMap((group) =>
    (Array.isArray(grouped?.[group]) ? grouped[group] : []).map((item) => ({
      ...item,
      match_type: group,
    })),
  );
}
