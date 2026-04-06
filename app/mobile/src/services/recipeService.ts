import type { RecipeDetail } from '../types/recipe';
import { getMockRecipeDetailById } from '../mocks/recipes';
import { apiGetJson } from './httpClient';

/**
 * Same endpoint as web `fetchRecipe` in `recipeService.js`.
 * Falls back to mock detail when the request fails (offline / no backend).
 */
export async function fetchRecipeById(id: string): Promise<RecipeDetail> {
  try {
    const data = await apiGetJson<RecipeDetail>(`/api/recipes/${id}/`);
    return normalizeRecipeDetail(data);
  } catch {
    const mock = getMockRecipeDetailById(id);
    if (!mock) throw new Error('Could not load recipe.');
    return mock;
  }
}

function normalizeRecipeDetail(data: RecipeDetail): RecipeDetail {
  return {
    ...data,
    ingredients: Array.isArray(data.ingredients) ? data.ingredients : [],
  };
}
