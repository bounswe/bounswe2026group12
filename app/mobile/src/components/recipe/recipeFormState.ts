import type { CatalogSelection } from '../../types/catalog';
import type { RecipeIngredientRow } from '../../types/recipe';

/** One ingredient line in create/edit forms (mirrors web `IngredientRow` shape). */
export type AuthoringIngredientRow = {
  key: string;
  amount: string;
  ingredient: CatalogSelection;
  unit: CatalogSelection;
};

export const emptyCatalogSelection: CatalogSelection = { id: null, name: '' };

export function makeEmptyIngredientRow(): AuthoringIngredientRow {
  return {
    key: `row-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    amount: '',
    ingredient: emptyCatalogSelection,
    unit: emptyCatalogSelection,
  };
}

export function authoringRowsFromRecipe(
  ingredients: RecipeIngredientRow[] | undefined
): AuthoringIngredientRow[] {
  if (!ingredients?.length) return [makeEmptyIngredientRow()];
  return ingredients.map((ri, i) => ({
    key: `row-loaded-${ri.lineId ?? ri.ingredient.id}-${i}`,
    amount: String(ri.amount),
    ingredient: { id: ri.ingredient.id, name: ri.ingredient.name },
    unit: { id: ri.unit.id ?? null, name: ri.unit.name },
  }));
}

export function isPositiveNumberString(s: string) {
  const n = Number(s);
  return Number.isFinite(n) && n > 0;
}
