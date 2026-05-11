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

  // Backend sends `region` as the FK pk (integer) and the human label as
  // `region_name`. Normalise to the friendly name so callers can render it
  // directly without showing the raw id.
  const reg = data.region;
  const regionLabel =
    typeof reg === 'string'
      ? reg
      : reg && typeof reg === 'object' && 'name' in reg && typeof (reg as { name: unknown }).name === 'string'
        ? (reg as { name: string }).name
        : typeof data.region_name === 'string'
          ? data.region_name
          : undefined;
  const regionId =
    typeof reg === 'number'
      ? reg
      : reg && typeof reg === 'object' && 'id' in reg && typeof (reg as { id: unknown }).id === 'number'
        ? (reg as { id: number }).id
        : null;

  return {
    ...data,
    ingredients: normalizeRecipeIngredients(data.ingredients),
    image: typeof data.image === 'string' ? data.image : null,
    author,
    region: regionLabel,
    region_id: regionId,
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
  {
    id: string;
    title: string;
    region?: string;
    author?: any;
    author_username?: string;
    image?: string | null;
    rank_score?: number;
    rank_reason?: string | null;
  }[]
> {
  const data = await apiGetJson<any>(`/api/recipes/`);
  const list: any[] = Array.isArray(data)
    ? data
    : data && Array.isArray(data.results)
      ? data.results
      : [];
  return list.map((r) => {
    const reg = r.region;
    const regionLabel =
      reg == null
        ? typeof r.region_name === 'string'
          ? r.region_name
          : undefined
        : typeof reg === 'string'
          ? reg
          : typeof reg === 'object' && reg && 'name' in reg && typeof (reg as { name: unknown }).name === 'string'
            ? (reg as { name: string }).name
            : typeof r.region_name === 'string'
              ? r.region_name
              : undefined;
    return {
      id: String(r.id),
      title: String(r.title ?? ''),
      region: regionLabel,
      author: r.author ?? undefined,
      author_username: typeof r.author_username === 'string' ? r.author_username : undefined,
      image: typeof r.image === 'string' ? r.image : null,
      rank_score: typeof r.rank_score === 'number' ? r.rank_score : undefined,
      rank_reason: typeof r.rank_reason === 'string' ? r.rank_reason : null,
    };
  });
}
