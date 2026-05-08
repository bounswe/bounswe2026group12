// Keyed by ingredient_name (lowercased) for mock lookup
export const MOCK_SUBSTITUTES = {
  tomato: [
    { id: 101, name: 'Canned tomatoes', match_type: 'Flavor Match' },
    { id: 102, name: 'Red bell pepper', match_type: 'Texture Match' },
    { id: 103, name: 'Sun-dried tomatoes', match_type: 'Flavor Match' },
  ],
  onion: [
    { id: 104, name: 'Shallot', match_type: 'Flavor Match' },
    { id: 105, name: 'Leek', match_type: 'Flavor Match' },
    { id: 106, name: 'Green onion', match_type: 'Flavor Match' },
  ],
  olives: [
    { id: 107, name: 'Capers', match_type: 'Flavor Match' },
    { id: 108, name: 'Sun-dried tomatoes', match_type: 'Texture Match' },
  ],
  'olive oil': [
    { id: 109, name: 'Sunflower oil', match_type: 'Texture Match' },
    { id: 110, name: 'Avocado oil', match_type: 'Flavor Match' },
  ],
};

export function getMockSubstitutes(ingredientName) {
  const key = (ingredientName ?? '').toLowerCase();
  return MOCK_SUBSTITUTES[key] ?? [
    { id: 999, name: 'Similar ingredient', match_type: 'Flavor Match' },
  ];
}
