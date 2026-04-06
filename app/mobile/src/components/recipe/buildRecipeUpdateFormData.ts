import type { AuthoringIngredientRow } from './recipeFormState';
import type { LocalVideoSelection } from './RecipeVideoSection';

/** Mirrors web `RecipeEditPage` `FormData` assembly (`PATCH /api/recipes/:id/`). */
export function buildRecipeUpdateFormData(input: {
  title: string;
  description: string;
  region: string;
  qaEnabled: boolean;
  localVideo: LocalVideoSelection | null;
  rows: AuthoringIngredientRow[];
}): FormData {
  const fd = new FormData();
  fd.append('title', input.title.trim());
  fd.append('description', input.description.trim());
  fd.append('region', input.region.trim());
  fd.append('qa_enabled', String(input.qaEnabled));
  fd.append('is_published', 'true');

  if (input.localVideo) {
    fd.append('video', {
      uri: input.localVideo.uri,
      name: input.localVideo.fileName ?? 'video.mp4',
      type: input.localVideo.mimeType ?? 'video/mp4',
    } as unknown as Blob);
  }

  const validRows = input.rows.filter(
    (r) => r.ingredient.id != null && r.amount.trim() !== '' && r.unit.id != null,
  );
  validRows.forEach((r, i) => {
    fd.append(`ingredients[${i}][ingredient]`, String(r.ingredient.id));
    fd.append(`ingredients[${i}][amount]`, r.amount.trim());
    fd.append(`ingredients[${i}][unit]`, String(r.unit.id));
  });

  return fd;
}
