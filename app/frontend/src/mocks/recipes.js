const SAMPLE_VIDEO =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

export const MOCK_RECIPES = {
  1: {
    id: 1,
    title: 'Mock Anatolian Stew',
    region: 'Anatolia',
    description:
      'A hearty mock stew for development. When the API is available, this screen shows live data instead.',
    steps: [
      'Heat olive oil in a large pot over medium heat.',
      'Add diced onion and sauté until softened, about 5 minutes.',
      'Add chopped tomatoes and stir to combine.',
      'Season with salt, pepper, and red pepper flakes.',
      'Simmer over low heat for 25 minutes until thickened.',
      'Serve hot with crusty bread.',
    ],
    video: SAMPLE_VIDEO,
    qa_enabled: true,
    is_published: true,
    author: { id: 1, username: 'demo_chef' },
    ingredients: [
      { ingredient: 1, ingredient_name: 'Tomato', amount: '400', unit_name: 'g', converted_amount: '14.1', converted_unit_name: 'oz' },
      { ingredient: 2, ingredient_name: 'Onion', amount: '1', unit_name: 'cup', converted_amount: '240', converted_unit_name: 'ml' },
    ],
  },
  2: {
    id: 2,
    title: 'Mock Aegean Salad',
    region: 'Aegean',
    description: 'Fresh mock salad with olive oil and herbs.',
    steps: [
      'Rinse olives and pat dry.',
      'Combine olives with olive oil in a bowl.',
      'Add fresh herbs and toss gently.',
      'Let marinate for 10 minutes before serving.',
    ],
    video: null,
    qa_enabled: true,
    is_published: true,
    author: { id: 1, username: 'demo_chef' },
    ingredients: [
      { ingredient: 3, ingredient_name: 'Olives', amount: '100', unit_name: 'g', converted_amount: '3.5', converted_unit_name: 'oz' },
      { ingredient: 4, ingredient_name: 'Olive oil', amount: '2', unit_name: 'tbsp', converted_amount: '30', converted_unit_name: 'ml' },
    ],
  },
};

export const MOCK_RECIPES_LIST = Object.values(MOCK_RECIPES);

export function getMockRecipeById(id) {
  return MOCK_RECIPES[id] ?? null;
}
