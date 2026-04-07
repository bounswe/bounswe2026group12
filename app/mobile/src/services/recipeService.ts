import type { RecipeDetail, RecipeIngredientRow } from '../types/recipe';
import { parseAuthorId } from '../utils/parseAuthorId';
import { apiGetJson, apiPatchFormData, apiPatchJson } from './httpClient';

/**
 * Same endpoint as web `fetchRecipe` in `recipeService.js`.
 */
export async function fetchRecipeById(id: string): Promise<RecipeDetail> {
  const data = await apiGetJson<RecipeDetail & Record<string, unknown>>(`/api/recipes/${id}/`);
  return normalizeRecipeDetail(data);
}

/**
 * DRF `RecipeIngredientSerializer` returns `ingredient` / `unit` as PKs plus
 * `ingredient_name` / `unit_name`. The mobile form expects nested `{ id, name }`.
 */
function normalizeRecipeIngredients(raw: unknown): RecipeIngredientRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row: Record<string, unknown>) => {
    const ing = row.ingredient;
    const unit = row.unit;
    const ingredient: RecipeIngredientRow['ingredient'] =
      typeof ing === 'object' && ing !== null && 'id' in ing
        ? {
            id: Number((ing as { id: unknown }).id),
            name: String((ing as { name?: string }).name ?? ''),
          }
        : {
            id: ing != null && ing !== '' ? Number(ing) : 0,
            name: typeof row.ingredient_name === 'string' ? row.ingredient_name : '',
          };

    const unitObj: RecipeIngredientRow['unit'] =
      typeof unit === 'object' && unit !== null && 'id' in unit
        ? {
            id: Number((unit as { id: unknown }).id),
            name: String((unit as { name?: string }).name ?? ''),
          }
        : {
            id: unit != null && unit !== '' ? Number(unit) : undefined,
            name: typeof row.unit_name === 'string' ? row.unit_name : '',
          };

    const amt = row.amount;
    const amount: string | number =
      typeof amt === 'string' || typeof amt === 'number' ? amt : amt != null ? String(amt) : '';

    const lid = row.id;
    const lineIdParsed =
      typeof lid === 'number'
        ? lid
        : typeof lid === 'string' && lid !== ''
          ? Number(lid)
          : undefined;
    const lineId =
      lineIdParsed != null && Number.isFinite(lineIdParsed) ? lineIdParsed : undefined;

    return {
      lineId,
      ingredient,
      amount,
      unit: unitObj,
    };
  });
}

function normalizeRecipeDetail(data: RecipeDetail & Record<string, unknown>): RecipeDetail {
  const authorId = parseAuthorId(data.author);
  const author =
    authorId != null
      ? {
          id: authorId,
          username:
            typeof data.author_username === 'string'
              ? data.author_username
              : typeof data.author === 'object' &&
                  data.author &&
                  typeof (data.author as { username?: string }).username === 'string'
                ? (data.author as { username: string }).username
                : '',
        }
      : undefined;

  return {
    ...data,
    ingredients: normalizeRecipeIngredients(data.ingredients),
    author,
  };
}

/** PATCH recipe fields as JSON (e.g. `ingredients_write`) — same as web non-file update. */
export async function patchRecipeJson(id: string, body: Record<string, unknown>): Promise<void> {
  await apiPatchJson(`/api/recipes/${id}/`, body);
}

/** PATCH multipart only — use for file fields (e.g. new video) after JSON patch when needed. */
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
