import { fetchIngredientRoutes } from '../../src/services/ingredientRouteService';
import { apiGetJson } from '../../src/services/httpClient';

jest.mock('../../src/services/httpClient', () => ({
  apiGetJson: jest.fn(),
  nextPagePath: (next: string | null | undefined) => {
    if (!next) return null;
    try {
      const url = new URL(next);
      return `${url.pathname}${url.search}`;
    } catch {
      return null;
    }
  },
}));

const mockedGet = apiGetJson as jest.MockedFunction<typeof apiGetJson>;

describe('fetchIngredientRoutes', () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  it('normalizes string lat/lng to numbers and id/ingredient as numbers', async () => {
    mockedGet.mockResolvedValueOnce({
      next: null,
      results: [
        {
          id: '5',
          ingredient: '11',
          ingredient_name: 'Saffron',
          waypoints: [
            { lat: '38.5', lng: '27.0', era: 'antiquity', label: 'Aegean' },
          ],
        },
      ],
    });

    const routes = await fetchIngredientRoutes();

    expect(routes).toHaveLength(1);
    expect(routes[0]).toEqual({
      id: 5,
      ingredient: 11,
      ingredient_name: 'Saffron',
      waypoints: [
        { lat: 38.5, lng: 27.0, era: 'antiquity', label: 'Aegean' },
      ],
    });
  });

  it('drops waypoints with null or non-numeric lat/lng', async () => {
    mockedGet.mockResolvedValueOnce({
      next: null,
      results: [
        {
          id: 1,
          ingredient: 2,
          ingredient_name: 'Pepper',
          waypoints: [
            { lat: 10, lng: 20, era: 'medieval', label: 'good' },
            { lat: null, lng: 20, era: 'x', label: 'missing-lat' },
            { lat: 10, lng: 'not-a-number', era: 'x', label: 'bad-lng' },
            { lat: 'abc', lng: 'def', era: 'x', label: 'garbage' },
          ],
        },
      ],
    });

    const routes = await fetchIngredientRoutes();

    expect(routes[0].waypoints).toEqual([
      { lat: 10, lng: 20, era: 'medieval', label: 'good' },
    ]);
  });

  it('walks pagination, combining results from each page', async () => {
    mockedGet
      .mockResolvedValueOnce({
        next: 'http://api.example.com/api/ingredient-routes/?page=2',
        results: [
          { id: 1, ingredient: 1, ingredient_name: 'A', waypoints: [] },
        ],
      })
      .mockResolvedValueOnce({
        next: null,
        results: [
          { id: 2, ingredient: 2, ingredient_name: 'B', waypoints: [] },
        ],
      });

    const routes = await fetchIngredientRoutes();

    expect(mockedGet).toHaveBeenCalledTimes(2);
    expect(mockedGet).toHaveBeenNthCalledWith(1, '/api/ingredient-routes/');
    expect(mockedGet).toHaveBeenNthCalledWith(2, '/api/ingredient-routes/?page=2');
    expect(routes.map((r) => r.id)).toEqual([1, 2]);
  });

  it('handles a bare array response (unpaginated)', async () => {
    mockedGet.mockResolvedValueOnce([
      { id: 1, ingredient: 1, ingredient_name: 'A', waypoints: null },
    ]);

    const routes = await fetchIngredientRoutes();
    expect(routes).toHaveLength(1);
    expect(routes[0].waypoints).toEqual([]);
  });
});
