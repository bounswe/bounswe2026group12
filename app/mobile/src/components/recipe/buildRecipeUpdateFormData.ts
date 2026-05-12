import type { AuthoringIngredientRow } from './recipeFormState';
import type { LocalVideoSelection } from './RecipeVideoSection';

/**
 * JSON body for PATCH /api/recipes/:id/ — matches web `RecipeEditPage` payload shape.
 * DRF does not reliably accept `ingredients_write` lists via multipart; use JSON for fields + rows.
 */
export function buildRecipePatchJsonBody(input: {
  title: string;
  description: string;
  qaEnabled: boolean;
  rows: AuthoringIngredientRow[];
  /**
   * Already-trimmed cooking steps (#806). Caller is responsible for trimming
   * and dropping empty rows via `trimStepsForPayload` so this builder stays
   * dumb. Backend `Recipe.steps` is a JSONField, so it rides the JSON PATCH
   * path alongside `ingredients_write` rather than the multipart upload used
   * for media files. Omitted from the body when undefined so callers that
   * don't touch steps don't accidentally clear the server value.
   */
  steps?: string[];
}): Record<string, unknown> {
  // Require an ingredient + a non-empty amount. The unit is *not* required —
  // backend accepts `null` and we no longer silently drop unit-less rows
  // (the previous filter did, swallowing valid edits). UI-level validation
  // in RecipeEditScreen still asks for a unit; this filter only catches
  // rows that slipped through (e.g. legacy data with a missing unit).
  const validRows = input.rows.filter(
    (r) => r.ingredient.id != null && r.amount.trim() !== '',
  );

  // Region intentionally omitted from the patch body. The detail API exposes
  // the region as a friendly NAME, not the FK pk we'd need to PATCH back.
  // Including it here used to silently null the region on every edit because
  // `Number("Aegean")` is `NaN`. Until a proper region picker lands, leaving
  // the field out of the payload keeps the existing region untouched.
  const body: Record<string, unknown> = {
    title: input.title.trim(),
    description: input.description.trim(),
    qa_enabled: input.qaEnabled,
    is_published: true,
    ingredients_write: validRows.map((r) => ({
      ingredient: r.ingredient.id,
      amount: r.amount.trim(),
      unit: r.unit.id ?? null,
    })),
  };
  if (input.steps !== undefined) {
    body.steps = input.steps;
  }
  return body;
}

/** Multipart PATCH with only a new video file (after JSON patch saved other fields). */
export function buildRecipeVideoOnlyFormData(localVideo: LocalVideoSelection): FormData {
  const fd = new FormData();
  fd.append(
    'video',
    {
      uri: localVideo.uri,
      name: localVideo.fileName ?? 'video.mp4',
      type: localVideo.mimeType ?? 'video/mp4',
    } as unknown as Blob,
  );
  return fd;
}

export function buildRecipeImageOnlyFormData(input: {
  uri: string;
  name?: string;
  type?: string;
}): FormData {
  const fd = new FormData();
  fd.append(
    'image',
    {
      uri: input.uri,
      name: input.name ?? 'recipe-image.jpg',
      type: input.type ?? 'image/jpeg',
    } as unknown as Blob,
  );
  return fd;
}
