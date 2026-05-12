import { apiClient } from '../services/api';
import {
  fetchIngredientRoutes,
  fetchIngredientRoutesByIngredient,
} from '../services/ingredientRouteService';

jest.mock('../services/api', () => ({
  apiClient: { get: jest.fn() },
}));

beforeEach(() => jest.clearAllMocks());

describe('fetchIngredientRoutes', () => {
  it('unwraps a DRF-paginated response', async () => {
    apiClient.get.mockResolvedValue({
      data: { results: [{ id: 1, ingredient_name: 'Tomato', waypoints: [] }] },
    });
    const routes = await fetchIngredientRoutes();
    expect(apiClient.get).toHaveBeenCalledWith('/api/ingredient-routes/', {
      params: { page_size: 50 },
    });
    expect(routes).toEqual([{ id: 1, ingredient_name: 'Tomato', waypoints: [] }]);
  });

  it('returns a bare array as-is when pagination is off', async () => {
    apiClient.get.mockResolvedValue({
      data: [{ id: 5, ingredient_name: 'Lentils', waypoints: [] }],
    });
    expect(await fetchIngredientRoutes()).toEqual([
      { id: 5, ingredient_name: 'Lentils', waypoints: [] },
    ]);
  });

  it('returns [] for an empty payload', async () => {
    apiClient.get.mockResolvedValue({ data: null });
    expect(await fetchIngredientRoutes()).toEqual([]);
  });
});

describe('fetchIngredientRoutesByIngredient', () => {
  it('passes the ingredient id as a query param', async () => {
    apiClient.get.mockResolvedValue({ data: { results: [] } });
    await fetchIngredientRoutesByIngredient(42);
    expect(apiClient.get).toHaveBeenCalledWith('/api/ingredient-routes/', {
      params: { ingredient: 42, page_size: 50 },
    });
  });
});
