import type { RecipeDetail } from '../types/recipe';

/** Public sample MP4 for mock / offline recipe video playback. */
const SAMPLE_VIDEO =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

export type MockRecipeListItem = {
  id: string;
  title: string;
  region?: string;
  author?: RecipeDetail['author'];
};

const DETAILS: Record<string, RecipeDetail> = {
  '1': {
    id: 1,
    title: 'Mock Anatolian stew',
    region: 'Anatolia',
    description:
      'A hearty mock stew for development. When the API is available, this screen shows live data instead.',
    video: SAMPLE_VIDEO,
    qa_enabled: true,
    author: { id: 101, username: 'demo_chef' },
    ingredients: [
      { ingredient: { id: 1, name: 'Tomato' }, amount: '400', unit: { id: 1, name: 'g' } },
      { ingredient: { id: 2, name: 'Onion' }, amount: '1', unit: { id: 2, name: 'cup' } },
    ],
  },
  '2': {
    id: 2,
    title: 'Mock Aegean salad',
    region: 'Aegean',
    description: 'Fresh mock salad with olive oil and herbs.',
    video: SAMPLE_VIDEO,
    qa_enabled: true,
    ingredients: [
      { ingredient: { id: 3, name: 'Olives' }, amount: '100', unit: { id: 1, name: 'g' } },
    ],
  },
};

export function getMockRecipeDetailById(id: string): RecipeDetail | null {
  return DETAILS[id] ?? null;
}

/** Lightweight list for pickers/search when no API exists. */
export function listMockRecipes(): MockRecipeListItem[] {
  return Object.entries(DETAILS).map(([id, r]) => ({
    id,
    title: r.title,
    region: r.region,
    author: r.author,
  }));
}
