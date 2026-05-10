import { apiGetJson, apiPostJson } from './httpClient';

function pickIds(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n));
}

export async function fetchCheckedIngredients(
  recipeId: number | string,
): Promise<number[]> {
  const data = await apiGetJson<unknown>(`/api/recipes/${recipeId}/checked-ingredients/`);
  return pickIds(data);
}

export async function toggleCheckedIngredient(
  recipeId: number | string,
  ingredientId: number,
  checked: boolean,
): Promise<number[]> {
  const data = await apiPostJson<unknown>(
    `/api/recipes/${recipeId}/checked-ingredients/`,
    { ingredient_id: ingredientId, checked },
  );
  return pickIds(data);
}
