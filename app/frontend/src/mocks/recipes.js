const SAMPLE_VIDEO =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

export const MOCK_RECIPES = {
  1: {
    id: 1,
    title: 'Mock Anatolian Stew',
    region_name: 'Anatolia',
    description:
      'A hearty mock stew for development. When the API is available, this screen shows live data instead.',
    image: null,
    video: SAMPLE_VIDEO,
    qa_enabled: true,
    is_published: true,
    author: { id: 1, username: 'demo_chef' },
    author_username: 'demo_chef',
    ingredients: [
      { ingredient: { id: 1, name: 'Tomato' }, amount: '400', unit: { id: 1, name: 'g' } },
      { ingredient: { id: 2, name: 'Onion' }, amount: '1', unit: { id: 2, name: 'cup' } },
    ],
  },
  2: {
    id: 2,
    title: 'Mock Aegean Salad',
    region_name: 'Aegean',
    description: 'Fresh mock salad with olive oil and herbs.',
    image: null,
    video: null,
    qa_enabled: true,
    is_published: true,
    author: { id: 1, username: 'demo_chef' },
    author_username: 'demo_chef',
    ingredients: [
      { ingredient: { id: 3, name: 'Olives' }, amount: '100', unit: { id: 1, name: 'g' } },
      { ingredient: { id: 4, name: 'Olive oil' }, amount: '2', unit: { id: 6, name: 'tbsp' } },
    ],
  },
};

export const MOCK_RECIPES_LIST = Object.values(MOCK_RECIPES);

export function getMockRecipeById(id) {
  return MOCK_RECIPES[id] ?? null;
}
