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
  author?: { id: number; username: string };
  ingredients?: RecipeIngredientRow[];
};
