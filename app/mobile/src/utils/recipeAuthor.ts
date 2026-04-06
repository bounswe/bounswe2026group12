import type { AuthUser } from '../services/mockAuthService';
import type { RecipeDetail } from '../types/recipe';

/**
 * Same intent as web `RecipeDetailPage` (`user && recipe.author && user.id === recipe.author.id`),
 * with numeric coercion so string `id` from mock auth matches numeric API author ids.
 */
export function isRecipeAuthor(
  user: AuthUser | null | undefined,
  recipe: RecipeDetail | null | undefined,
): boolean {
  if (!user || !recipe?.author) return false;
  return Number(user.id) === Number(recipe.author.id);
}
