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

export async function fetchIngredients() {
  if (USE_MOCK) return getMockIngredients();
  const response = await apiClient.get('/api/ingredients/');
  return response.data;
}

export async function fetchUnits() {
  if (USE_MOCK) return getMockUnits();
  const response = await apiClient.get('/api/units/');
  return response.data;
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
  const response = await apiClient.get('/api/recipes/');
  return response.data;
}
