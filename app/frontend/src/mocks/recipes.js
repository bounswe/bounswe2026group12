const SAMPLE_VIDEO =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

export const MOCK_RECIPES = {
  1: {
    id: 1,
    title: 'Anatolian Manti Dumplings',
    region: 6,
    region_name: 'Anatolian',
    description:
      'Tiny hand-pinched dumplings filled with spiced ground beef, served under a blanket of garlicky yogurt and drizzled with red pepper butter. The smaller the manti, the greater the love.',
    steps: [
      'Make the dough: combine flour, a pinch of salt, 1 egg, and 100 ml of water. Knead for 10 minutes until smooth and elastic. Rest covered for 30 minutes.',
      'Mix ground beef, grated onion, salt, pepper, and dried mint for the filling.',
      'Roll the dough paper-thin on a floured surface. Cut into 2 cm squares. Place a tiny pinch of filling in the center of each square and pinch the opposite corners together tightly to seal.',
      'Boil the manti in a large pot of salted water for 10–12 minutes until they float and the dough is tender.',
      'Beat yogurt with crushed garlic and salt until smooth. Spread it generously in wide shallow bowls.',
      'Drain the manti and pile them over the yogurt.',
      'In a small pan, melt butter with red pepper flakes over medium heat until the butter turns deep amber. Pour immediately over the manti and finish with dried mint.',
    ],
    video: SAMPLE_VIDEO,
    qa_enabled: true,
    is_published: true,
    author: { id: 1, username: 'ayse' },
    author_username: 'ayse',
    ingredients: [
      { ingredient: 1, ingredient_name: 'Flour', amount: '400', unit_name: 'grams' },
      { ingredient: 2, ingredient_name: 'Ground Beef', amount: '300', unit_name: 'grams' },
      { ingredient: 3, ingredient_name: 'Yogurt', amount: '200', unit_name: 'grams' },
      { ingredient: 4, ingredient_name: 'Garlic', amount: '3', unit_name: 'cloves' },
      { ingredient: 5, ingredient_name: 'Butter', amount: '50', unit_name: 'grams' },
      { ingredient: 6, ingredient_name: 'Red Pepper Flakes', amount: '1', unit_name: 'teaspoons' },
    ],
    dietary_tags: [{ id: 1, name: 'Halal' }],
    event_tags: [],
    religions: [{ id: 1, name: 'Islam' }],
  },
  2: {
    id: 2,
    title: 'Aegean Olive Oil Stuffed Grape Leaves',
    region: 2,
    region_name: 'Aegean',
    description:
      'Delicate grape leaves filled with herbed rice, pine nuts, and currants, cooked slowly in olive oil. Served cold with a squeeze of lemon, this is a hallmark of Aegean vegetarian cuisine.',
    steps: [
      'If using jarred grape leaves, rinse under cold water to remove brine and blanch for 1 minute. Fresh leaves need 30 seconds only. Pat dry.',
      'Sauté finely diced onion in 3 tablespoons of olive oil over low heat for 10 minutes until soft. Add rice, pine nuts, currants, dried mint, cinnamon, salt, and pepper. Add 100 ml water, cover, and steam 8 minutes. Cool completely.',
      'Lay a leaf vein-side up. Place a teaspoon of filling near the stem end, fold the sides in, then roll firmly away from you.',
      'Line a wide, heavy pot with a layer of leaves. Pack rolls seam-side down in tight layers. Drizzle remaining olive oil and lemon juice over them.',
      'Pour in enough water to just reach the top layer. Place an inverted plate on top. Cook over very low heat for 40 minutes.',
      'Remove from heat and cool in the pot. Serve at room temperature or chilled, with lemon wedges.',
    ],
    video: null,
    qa_enabled: true,
    is_published: true,
    author: { id: 3, username: 'elif' },
    author_username: 'elif',
    ingredients: [
      { ingredient: 7, ingredient_name: 'Grape Leaves', amount: '40', unit_name: 'pieces' },
      { ingredient: 8, ingredient_name: 'Rice', amount: '200', unit_name: 'grams' },
      { ingredient: 9, ingredient_name: 'Olive Oil', amount: '100', unit_name: 'ml' },
      { ingredient: 10, ingredient_name: 'Pine Nuts', amount: '30', unit_name: 'grams' },
      { ingredient: 11, ingredient_name: 'Lemon', amount: '1', unit_name: 'pieces' },
    ],
    dietary_tags: [{ id: 2, name: 'Vegan' }, { id: 3, name: 'Vegetarian' }],
    event_tags: [],
    religions: [],
  },
};

export const MOCK_RECIPES_LIST = Object.values(MOCK_RECIPES);

export function getMockRecipeById(id) {
  return MOCK_RECIPES[id] ?? null;
}
