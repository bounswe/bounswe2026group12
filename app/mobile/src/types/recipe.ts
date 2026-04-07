/**
 * Single-recipe payload from GET `/api/recipes/:id/` (see web `RecipeDetailPage.jsx`).
 */
export type RecipeIngredientRow = {
  ingredient: { id: number; name: string };
  amount: string | number;
  unit: { id?: number; name: string };
};

export type RecipeDetail = {
  id: number | string;
  title: string;
  description?: string;
  region?: string;
  video?: string | null;
  /** Normalized to `{ id, username }`; raw API may send `author` as user pk only. */
  author?: number | { id: number; username?: string };
  ingredients?: RecipeIngredientRow[];
  /** Matches web `RecipeEditPage` (`qa_enabled`). */
  qa_enabled?: boolean;
};
