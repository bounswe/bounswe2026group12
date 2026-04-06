import type { RecipeDetail } from '../types/recipe';
import { getMockRecipeDetailById, listMockRecipes, type MockRecipeListItem } from '../mocks/recipes';
import { apiGetJson, apiPatchFormData } from './httpClient';
import { mockSubmitRecipeUpdate } from './mockRecipeCreate';

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

/**
 * Same as web `updateRecipe` (`PATCH` + `FormData`). Falls back to mock when the request fails.
 */
export async function updateRecipeById(id: string, formData: FormData): Promise<void> {
  try {
    await apiPatchFormData(`/api/recipes/${id}/`, formData);
  } catch {
    await mockSubmitRecipeUpdate(id);
  }
}

/** Minimal list for story linking / pickers (web: GET `/api/recipes/`). */
export async function fetchRecipesList(): Promise<MockRecipeListItem[]> {
  try {
    // We only need id/title/region/author for UI; backend may return more fields.
    const data = await apiGetJson<any[]>(`/api/recipes/`);
    return (Array.isArray(data) ? data : []).map((r) => ({
      id: String(r.id),
      title: String(r.title ?? ''),
      region: r.region ?? undefined,
      author: r.author ?? undefined,
    }));
  } catch {
    return listMockRecipes();
  }
}
