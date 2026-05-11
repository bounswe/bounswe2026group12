/**
 * Single-recipe payload from GET `/api/recipes/:id/` (see web `RecipeDetailPage.jsx`).
 */
export type RecipeIngredientRow = {
  /** Join-table PK from GET /api/recipes/:id/ (`RecipeIngredient.id`) — stable list keys. */
  lineId?: number;
  ingredient: { id: number; name: string };
  amount: string | number;
  unit: { id?: number; name: string };
};

export type RecipeDetail = {
  id: number | string;
  title: string;
  description?: string;
  region?: string;
  image?: string | null;
  video?: string | null;
  /** Normalized to `{ id, username }`; raw API may send `author` as user pk only. */
  author?: number | { id: number; username?: string };
  ingredients?: RecipeIngredientRow[];
  /** Matches web `RecipeEditPage` (`qa_enabled`). */
  qa_enabled?: boolean;
  rank_score?: number;
  rank_reason?: string | null;
  /** Heritage group surfaced by backend serializer when the recipe is grouped. */
  heritage_group?: { id: number; name: string } | null;
};
