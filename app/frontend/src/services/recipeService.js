import { apiClient } from './api';

export async function fetchRecipe(id) {
  const response = await apiClient.get(`/api/recipes/${id}/`);
  return response.data;
}

export async function createRecipe(formData) {
  const response = await apiClient.post('/api/recipes/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function updateRecipe(id, formData) {
  const response = await apiClient.patch(`/api/recipes/${id}/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function fetchIngredients() {
  const response = await apiClient.get('/api/ingredients/');
  return response.data;
}

export async function fetchUnits() {
  const response = await apiClient.get('/api/units/');
  return response.data;
}

export async function submitIngredient(name) {
  const response = await apiClient.post('/api/ingredients/', { name });
  return response.data;
}

export async function submitUnit(name) {
  const response = await apiClient.post('/api/units/', { name });
  return response.data;
}
