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
  /** Region FK pk surfaced for filtered queries (e.g. cultural facts by region). */
  region_id?: number | null;
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
  /** Endangered-heritage status (#507/#524): one of 'none' | 'endangered' | 'preserved' | 'revived'. */
  heritage_status?: 'none' | 'endangered' | 'preserved' | 'revived' | string | null;
  /** Sourced notes attached to a recipe's endangered-heritage status. */
  endangered_notes?: Array<{
    id: number;
    text: string;
    source_url: string;
    created_at?: string;
  }>;
};
