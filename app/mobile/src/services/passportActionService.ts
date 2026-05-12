import { apiPostJson } from './httpClient';

/**
 * Passport action endpoints (#599, backed by backend #584 "Stamp" model).
 *
 * The backend exposes two idempotent action endpoints (see
 * `app/backend/apps/passport/urls.py`):
 *
 *   POST `/api/passport/recipes/<id>/try/`   — record a recipe try (also
 *                                              pins the recipe to the user's
 *                                              passport in one shot)
 *   POST `/api/passport/stories/<id>/save/`  — save a story to the passport
 *
 * Both endpoints return the refreshed passport payload (level, stats,
 * stamps, …) plus the action-specific fields the backend chose to surface.
 * The mobile screen only needs to know "did this succeed and what is the
 * current flag" so we narrow the response: read `is_tried` / `saved` if the
 * backend includes it, otherwise fall back to the optimistic `nextValue` the
 * caller passed in so the pill settles into a coherent state instead of
 * flickering. The richer passport payload is consumed elsewhere via
 * `fetchPassport()` (#598).
 *
 * Note: the backend deliberately does not expose a separate "add to
 * passport" route — `/try/` does that work too — so this file does not ship
 * an `addRecipeToPassport` helper. See PR #783 review for context.
 */

type RawTriedResponse = { is_tried?: unknown };
type RawSavedResponse = { saved?: unknown; saved_to_passport?: unknown };

function coerceBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === 1) return true;
  if (value === 'false' || value === 0) return false;
  return fallback;
}

export async function tryRecipe(
  recipeId: number | string,
  nextValue: boolean,
): Promise<{ is_tried: boolean }> {
  const data = await apiPostJson<RawTriedResponse | null>(
    `/api/passport/recipes/${recipeId}/try/`,
    {},
  );
  return { is_tried: coerceBool(data?.is_tried, nextValue) };
}

export async function saveStoryToPassport(
  storyId: number | string,
  nextValue: boolean,
): Promise<{ saved: boolean }> {
  const data = await apiPostJson<RawSavedResponse | null>(
    `/api/passport/stories/${storyId}/save/`,
    {},
  );
  // Backend may surface either `saved` or `saved_to_passport`; accept both.
  const flag = data?.saved ?? data?.saved_to_passport;
  return { saved: coerceBool(flag, nextValue) };
}
