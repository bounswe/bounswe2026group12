/** Placeholder data until mobile calls DRF (see web `storyService`). */

export type MockStory = {
  id: string;
  title: string;
  body: string;
  language?: 'en' | 'tr';
  author?: { username: string };
  linked_recipe?: { id: string; title: string; region?: string };
  /** Remote url in the future. */
  image?: string | null;
};

const STORIES: Record<string, MockStory> = {
  '1': {
    id: '1',
    title: 'Mock kitchen story',
    body: 'This is placeholder story content for development.',
    language: 'en',
    author: { username: 'demo_user' },
    linked_recipe: { id: '1', title: 'Mock Anatolian stew', region: 'Anatolia' },
    image:
      'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?auto=format&fit=crop&w=1200&q=80',
  },
  '2': {
    id: '2',
    title: 'Another mock story',
    body: 'More placeholder text.',
    language: 'tr',
    author: { username: 'demo_user' },
  },
};

export function getMockStoryById(id: string): MockStory | null {
  return STORIES[id] ?? null;
}

export function listMockStories(): MockStory[] {
  return Object.values(STORIES);
}

/** In-memory create for StoryCreate UI when API is unavailable. */
export function mockCreateStory(input: {
  title: string;
  body: string;
  language: 'en' | 'tr';
  linked_recipe: MockStory['linked_recipe'] | null;
  image?: string | null;
  author?: MockStory['author'];
}): MockStory {
  const id = String(Date.now());
  const story: MockStory = {
    id,
    title: input.title,
    body: input.body,
    language: input.language,
    author: input.author,
    linked_recipe: input.linked_recipe ?? undefined,
    image: input.image ?? null,
  };
  // mutate is OK for a mock store
  STORIES[id] = story;
  return story;
}
