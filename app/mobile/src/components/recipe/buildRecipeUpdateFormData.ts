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
}): Record<string, unknown> {
  const validRows = input.rows.filter(
    (r) => r.ingredient.id != null && r.amount.trim() !== '' && r.unit.id != null,
  );

  // Region intentionally omitted from the patch body. The detail API exposes
  // the region as a friendly NAME, not the FK pk we'd need to PATCH back.
  // Including it here used to silently null the region on every edit because
  // `Number("Aegean")` is `NaN`. Until a proper region picker lands, leaving
  // the field out of the payload keeps the existing region untouched.
  return {
    title: input.title.trim(),
    description: input.description.trim(),
    qa_enabled: input.qaEnabled,
    is_published: true,
    ingredients_write: validRows.map((r) => ({
      ingredient: r.ingredient.id,
      amount: r.amount.trim(),
      unit: r.unit.id,
    })),
  };
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
