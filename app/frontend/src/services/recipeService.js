import { apiClient } from './api';
import {
  getMockIngredients,
  getMockUnits,
  mockCreateIngredient,
  mockCreateUnit,
} from '../mocks/catalogStore';
import { getMockRecipeById, MOCK_RECIPES_LIST } from '../mocks/recipes';

const USE_MOCK = process.env.REACT_APP_USE_MOCK === 'true';

export async function fetchRecipe(id) {
  if (USE_MOCK) return getMockRecipeById(Number(id)) ?? Promise.reject(new Error('Not found'));
  const response = await apiClient.get(`/api/recipes/${id}/`);
  return response.data;
}

export async function createRecipe(formData) {
  if (USE_MOCK) return { id: Date.now() };
  const response = await apiClient.post('/api/recipes/', formData);
  return response.data;
}

export async function updateRecipe(id, formData) {
  if (USE_MOCK) return { id: Number(id) };
  const response = await apiClient.patch(`/api/recipes/${id}/`, formData);
  return response.data;
}

export async function deleteRecipe(id) {
  if (USE_MOCK) return { status: 204 };
  return apiClient.delete(`/api/recipes/${id}/`);
}

let _ingredientsPromise = null;
let _unitsPromise = null;

export async function fetchIngredients() {
  if (USE_MOCK) return getMockIngredients();
  if (!_ingredientsPromise) {
    _ingredientsPromise = apiClient.get('/api/ingredients/')
      .then(r => r.data)
      .catch(err => { _ingredientsPromise = null; return Promise.reject(err); });
  }
  return _ingredientsPromise;
}

export async function fetchUnits() {
  if (USE_MOCK) return getMockUnits();
  if (!_unitsPromise) {
    _unitsPromise = apiClient.get('/api/units/')
      .then(r => r.data)
      .catch(err => { _unitsPromise = null; return Promise.reject(err); });
  }
  return _unitsPromise;
}

export async function submitIngredient(name) {
  if (USE_MOCK) return mockCreateIngredient(name);
  const response = await apiClient.post('/api/ingredients/', { name });
  return response.data;
}

export async function submitUnit(name) {
  if (USE_MOCK) return mockCreateUnit(name);
  const response = await apiClient.post('/api/units/', { name });
  return response.data;
}

export async function fetchRecipes() {
  if (USE_MOCK) return MOCK_RECIPES_LIST;
  const response = await apiClient.get('/api/recipes/', { params: { page_size: 100 } });
  return response.data.results ?? response.data;
}

export async function fetchDietaryTags() {
  if (USE_MOCK) return [];
  const response = await apiClient.get('/api/dietary-tags/');
  return response.data;
}

export async function fetchEventTags() {
  if (USE_MOCK) return [];
  const response = await apiClient.get('/api/event-tags/');
  return response.data;
}

/**
 * Submit or update the current user's rating for a recipe (#736).
 * Backend: `POST /api/recipes/<id>/rate/` body `{ score: 1-5 }`.
 * Returns `{ average_rating, rating_count, user_rating }`. 403 if the
 * authenticated user is the recipe author.
 */
export async function rateRecipe(id, score) {
  if (USE_MOCK) return { average_rating: score, rating_count: 1, user_rating: score };
  const response = await apiClient.post(`/api/recipes/${id}/rate/`, { score });
  return response.data;
}

/**
 * Clear the current user's rating for a recipe (#736).
 * Backend: `DELETE /api/recipes/<id>/rate/`. Returns the updated summary.
 */
export async function unrateRecipe(id) {
  if (USE_MOCK) return { average_rating: null, rating_count: 0, user_rating: null };
  const response = await apiClient.delete(`/api/recipes/${id}/rate/`);
  return response.data;
}

/**
 * Toggle the current user's bookmark on a recipe (#707).
 * Backend: `POST /api/recipes/<id>/bookmark/` — idempotent toggle, no body.
 * Returns `{ is_bookmarked, bookmark_count }`.
 */
export async function toggleBookmark(id) {
  if (USE_MOCK) return { is_bookmarked: true, bookmark_count: 1 };
  const response = await apiClient.post(`/api/recipes/${id}/bookmark/`);
  return response.data;
}

/**
 * Recipes authored by a specific user (#709 — "My recipes" section).
 * Backend: `GET /api/recipes/?author=<userId>`.
 */
export async function fetchMyRecipes(authorId) {
  if (USE_MOCK) return MOCK_RECIPES_LIST.filter((r) => r.author === authorId);
  const response = await apiClient.get('/api/recipes/', { params: { author: authorId, page_size: 100 } });
  return response.data.results ?? response.data;
}

/**
 * Recipes the current user has bookmarked (#709 — "Saved recipes").
 * Backend: `GET /api/recipes/?bookmarked=true` (requires authentication).
 */
export async function fetchMyBookmarks() {
  if (USE_MOCK) return [];
  const response = await apiClient.get('/api/recipes/', { params: { bookmarked: 'true', page_size: 100 } });
  return response.data.results ?? response.data;
}

/**
 * Recipes attached to a region by name (#732 — map story-pin parity).
 * Backend: `GET /api/recipes/?region=<name>`. Returns items with optional
 * `latitude` / `longitude` for plotting on the region map.
 */
export async function fetchRecipesByRegion(regionName) {
  if (USE_MOCK) {
    return MOCK_RECIPES_LIST.filter((r) => r.region_name === regionName);
  }
  const response = await apiClient.get('/api/recipes/', { params: { region: regionName, page_size: 100 } });
  return response.data.results ?? response.data;
}
