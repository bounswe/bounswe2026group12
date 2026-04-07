import type { RecipeDetail } from '../types/recipe';
import { apiGetJson, apiPatchFormData } from './httpClient';

/**
 * Same endpoint as web `fetchRecipe` in `recipeService.js`.
 */
export async function fetchRecipeById(id: string): Promise<RecipeDetail> {
  const data = await apiGetJson<RecipeDetail>(`/api/recipes/${id}/`);
  return normalizeRecipeDetail(data);
}

function normalizeRecipeDetail(data: RecipeDetail): RecipeDetail {
  return {
    ...data,
    ingredients: Array.isArray(data.ingredients) ? data.ingredients : [],
  };
}

/**
 * Same as web `updateRecipe` (`PATCH` + `FormData`).
 */
export async function updateRecipeById(id: string, formData: FormData): Promise<void> {
  await apiPatchFormData(`/api/recipes/${id}/`, formData);
}

/** Minimal list for story linking / pickers (web: GET `/api/recipes/`). */
export async function fetchRecipesList(): Promise<
  { id: string; title: string; region?: string; author?: any }[]
> {
  // We only need id/title/region/author for UI; backend may return more fields.
  const data = await apiGetJson<any[]>(`/api/recipes/`);
  return (Array.isArray(data) ? data : []).map((r) => {
    const reg = r.region;
    const regionLabel =
      reg == null
        ? undefined
        : typeof reg === 'string'
          ? reg
          : typeof reg === 'object' && reg && 'name' in reg && typeof (reg as { name: unknown }).name === 'string'
            ? (reg as { name: string }).name
            : undefined;
    return {
      id: String(r.id),
      title: String(r.title ?? ''),
      region: regionLabel,
      author: r.author ?? undefined,
    };
  });
}
