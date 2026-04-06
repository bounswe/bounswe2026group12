/** Placeholder data until mobile calls DRF (see web `storyService`). */

export type MockStory = {
  id: string;
  title: string;
  body: string;
  author?: { username: string };
  linked_recipe?: { id: string; title: string; region?: string };
};

const STORIES: Record<string, MockStory> = {
  '1': {
    id: '1',
    title: 'Mock kitchen story',
    body: 'This is placeholder story content for development.',
    author: { username: 'demo_user' },
    linked_recipe: { id: '1', title: 'Mock Anatolian stew', region: 'Anatolia' },
  },
  '2': {
    id: '2',
    title: 'Another mock story',
    body: 'More placeholder text.',
    author: { username: 'demo_user' },
  },
};

export function getMockStoryById(id: string): MockStory | null {
  return STORIES[id] ?? null;
}
