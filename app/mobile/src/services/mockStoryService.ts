import type { MockStory } from '../mocks/stories';
import { mockCreateStory } from '../mocks/stories';

export type StoryLanguage = 'en' | 'tr';

export type StoryCreatePayload = {
  title: string;
  body: string;
  language: StoryLanguage;
  /** Store id only; detail view uses mock story shape for now. */
  linked_recipe: { id: string; title: string; region?: string } | null;
  image?: string | null;
  is_published: boolean;
  author?: { username: string };
};

/** Stand-in for web `createStory` until backend is wired. */
export async function mockSubmitStoryCreate(payload: StoryCreatePayload): Promise<MockStory> {
  await new Promise<void>((resolve) => setTimeout(resolve, 450));
  return mockCreateStory({
    title: payload.title.trim(),
    body: payload.body.trim(),
    language: payload.language,
    linked_recipe: payload.linked_recipe,
    image: payload.image ?? null,
    author: payload.author,
  });
}

