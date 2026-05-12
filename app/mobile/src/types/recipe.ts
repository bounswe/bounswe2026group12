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
  /**
   * Ordered cooking steps surfaced by backend (#806). Each entry is a plain
   * string; embedded newlines are preserved on render. Optional because older
   * payloads omit the field — UI treats `undefined`/empty as "no steps".
   */
  steps?: string[];
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
  /** Aggregate star rating (1-5, decimal). Backend may serialize DecimalField as string. */
  average_rating?: number | string | null;
  /** Number of users who have rated this recipe. */
  rating_count?: number;
  /** Current user's submitted score (1-5) or null when not rated / unauthenticated. */
  user_rating?: number | null;
  /**
   * Bookmark fields surfaced by backend (#706). Optional because older
   * responses and minimal-list shapes can omit them — UI must treat
   * `undefined` as "not yet known" rather than "false".
   */
  is_bookmarked?: boolean;
  bookmark_count?: number;
  /**
   * "I tried this" flag surfaced by backend #584 ("Stamp" model, #599).
   * Optional because older / minimal payloads can omit it — UI treats
   * `undefined` as "not yet known" rather than "false". A successful try
   * also implicitly pins the recipe to the user's cultural passport.
   */
  is_tried?: boolean;
};
