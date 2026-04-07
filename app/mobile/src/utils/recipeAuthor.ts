import type { AuthUser } from '../services/mockAuthService';
import type { RecipeDetail } from '../types/recipe';
import { parseAuthorId } from './parseAuthorId';

/**
 * Same intent as web `RecipeDetailPage` (`user.id === recipe.author`) when the API returns
 * `author` as a primary key, plus support for nested `{ id }` from mocks or future serializers.
 */
export function isRecipeAuthor(
  user: AuthUser | null | undefined,
  recipe: RecipeDetail | null | undefined,
): boolean {
  if (!user || !recipe) return false;
  const authorId = parseAuthorId(recipe.author);
  if (authorId == null) return false;
  return Number(user.id) === authorId;
}
