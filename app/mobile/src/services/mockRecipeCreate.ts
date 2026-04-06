/**
 * Stand-in for `createRecipe` until mobile posts real `FormData` to the API.
 * Keeps the same success/error toast flow as web `RecipeCreatePage.jsx`.
 */
export async function mockSubmitRecipeCreate(_payload: unknown): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 400));
}
