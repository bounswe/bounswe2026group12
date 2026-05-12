import { apiDelete, apiPostJson } from './httpClient';

export type RatingScore = 1 | 2 | 3 | 4 | 5;

export type RatingAggregate = {
  average_rating: number | null;
  rating_count: number;
  user_rating: number | null;
};

/**
 * Defensive coercion — DRF DecimalField (`average_rating`) is serialized as a
 * string like `"4.20"`. Mirrors the pattern used in
 * `ingredientRouteService.ts` / `mapDataService.ts`.
 */
function toNum(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toInt(v: unknown): number {
  const n = toNum(v);
  return n == null ? 0 : Math.trunc(n);
}

type RawRating = {
  average_rating?: number | string | null;
  rating_count?: number | string | null;
  user_rating?: number | string | null;
};

function normalize(raw: RawRating | null | undefined): RatingAggregate {
  return {
    average_rating: toNum(raw?.average_rating),
    rating_count: toInt(raw?.rating_count),
    user_rating: toNum(raw?.user_rating),
  };
}

/** POST `/api/recipes/:id/rate/` with `{ score }`. Backend returns updated aggregate. */
export async function submitRating(
  recipeId: number | string,
  score: RatingScore,
): Promise<RatingAggregate> {
  const data = await apiPostJson<RawRating>(`/api/recipes/${recipeId}/rate/`, { score });
  return normalize(data);
}

/** DELETE `/api/recipes/:id/rate/`. Returns user_rating=null afterwards. */
export async function removeRating(recipeId: number | string): Promise<RatingAggregate> {
  await apiDelete(`/api/recipes/${recipeId}/rate/`);
  // Endpoint typically returns 204 — caller will refetch detail to refresh
  // aggregate. Return a neutral aggregate so optimistic flows can settle.
  return { average_rating: null, rating_count: 0, user_rating: null };
}
