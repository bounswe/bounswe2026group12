import type { CatalogItem } from '../types/catalog';

/**
 * In-memory catalog for when the API is unreachable (development / no backend).
 * Matches web combobox behaviour: new submits append with synthetic ids.
 */
let ingredients: CatalogItem[] = [
  { id: 1, name: 'Salt' },
  { id: 2, name: 'Black pepper' },
  { id: 3, name: 'Olive oil' },
  { id: 4, name: 'Tomato' },
  { id: 5, name: 'Onion' },
];

let units: CatalogItem[] = [
  { id: 1, name: 'g' },
  { id: 2, name: 'kg' },
  { id: 3, name: 'ml' },
  { id: 4, name: 'l' },
  { id: 5, name: 'cup' },
  { id: 6, name: 'tbsp' },
  { id: 7, name: 'tsp' },
];

let nextIngredientId = 100;
let nextUnitId = 100;

export function getMockIngredients(): CatalogItem[] {
  return [...ingredients];
}

export function getMockUnits(): CatalogItem[] {
  return [...units];
}

export function mockCreateIngredient(name: string): CatalogItem {
  const trimmed = name.trim();
  const item: CatalogItem = { id: nextIngredientId++, name: trimmed };
  ingredients = [...ingredients, item];
  return item;
}

export function mockCreateUnit(name: string): CatalogItem {
  const trimmed = name.trim();
  const item: CatalogItem = { id: nextUnitId++, name: trimmed };
  units = [...units, item];
  return item;
}
