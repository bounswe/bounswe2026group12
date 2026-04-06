/** Placeholder data until mobile calls DRF (see web `recipeService`). */

export type MockRecipe = {
  id: string;
  title: string;
  region: string;
};

const RECIPES: Record<string, MockRecipe> = {
  '1': { id: '1', title: 'Mock Anatolian stew', region: 'Anatolia' },
  '2': { id: '2', title: 'Mock Aegean salad', region: 'Aegean' },
};

export function getMockRecipeById(id: string): MockRecipe | null {
  return RECIPES[id] ?? null;
}
