import { apiClient } from './api';

export async function fetchCheckedIngredients(recipeId) {
  const response = await apiClient.get(`/api/recipes/${recipeId}/checked-ingredients/`);
  return response.data;
}

export async function toggleCheckedIngredient(recipeId, ingredientId, checked) {
  const response = await apiClient.post(
    `/api/recipes/${recipeId}/checked-ingredients/`,
    { ingredient_id: ingredientId, checked },
  );
  return response.data;
}
