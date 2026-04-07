export const MOCK_STORIES = {
  1: {
    id: 1,
    title: 'Mock kitchen story',
    body: 'This is placeholder story content for development. When the API is available, this screen shows live data instead.',
    author: { id: 1, username: 'demo_user' },
    linked_recipe: { id: 1, title: 'Mock Anatolian Stew', region: 'Anatolia' },
    language: 'en',
    is_published: true,
  },
  2: {
    id: 2,
    title: 'Another mock story',
    body: 'More placeholder text for development.',
    author: { id: 1, username: 'demo_user' },
    linked_recipe: null,
    language: 'en',
    is_published: true,
  },
};

export function getMockStoryById(id) {
  return MOCK_STORIES[id] ?? null;
}

export function mockCreateStory(payload) {
  return {
    id: Date.now(),
    ...payload,
    is_published: true,
    author: payload.author ?? { id: 1, username: 'demo_user' },
    linked_recipe: payload.linked_recipe ?? null,
  };
}
