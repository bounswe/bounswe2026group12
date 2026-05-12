import { apiClient } from './api';

const USE_MOCK = process.env.REACT_APP_USE_MOCK === 'true';

/**
 * Fetch every published ingredient migration route (#514). Backend may return
 * either a DRF-paginated `{ results: [...] }` envelope or a bare array
 * (depending on whether default pagination is on for `IngredientRouteViewSet`)
 * — normalise to a plain array here so callers stay simple.
 *
 * `USE_MOCK=true` returns an empty list rather than a stub fixture: the
 * page renders an empty-state CTA instead of pretending we have routes.
 */
function unwrap(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.results)) return payload.results;
  return [];
}

export async function fetchIngredientRoutes() {
  if (USE_MOCK) return [];
  const response = await apiClient.get('/api/ingredient-routes/', {
    params: { page_size: 50 },
  });
  return unwrap(response.data);
}

/** Fetch routes for one ingredient (server-side `?ingredient=<id>` filter). */
export async function fetchIngredientRoutesByIngredient(ingredientId) {
  if (USE_MOCK) return [];
  const response = await apiClient.get('/api/ingredient-routes/', {
    params: { ingredient: ingredientId, page_size: 50 },
  });
  return unwrap(response.data);
}
