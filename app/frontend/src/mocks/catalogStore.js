let ingredients = [
  { id: 1, name: 'Salt' },
  { id: 2, name: 'Black pepper' },
  { id: 3, name: 'Olive oil' },
  { id: 4, name: 'Tomato' },
  { id: 5, name: 'Onion' },
  { id: 6, name: 'Garlic' },
  { id: 7, name: 'Flour' },
  { id: 8, name: 'Sugar' },
];

let units = [
  { id: 1, name: 'g' },
  { id: 2, name: 'kg' },
  { id: 3, name: 'ml' },
  { id: 4, name: 'l' },
  { id: 5, name: 'cup' },
  { id: 6, name: 'tbsp' },
  { id: 7, name: 'tsp' },
  { id: 8, name: 'piece' },
];

let nextIngredientId = 100;
let nextUnitId = 100;

export function getMockIngredients() {
  return [...ingredients];
}

export function getMockUnits() {
  return [...units];
}

export function mockCreateIngredient(name) {
  const item = { id: nextIngredientId++, name: name.trim(), is_approved: false };
  ingredients = [...ingredients, item];
  return item;
}

export function mockCreateUnit(name) {
  const item = { id: nextUnitId++, name: name.trim(), is_approved: false };
  units = [...units, item];
  return item;
}
