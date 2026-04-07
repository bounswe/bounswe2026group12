import { getMockStoryById } from '../mocks/stories';
import type { StoryDetail } from '../types/story';
import { apiGetJson } from './httpClient';

/** Same endpoint as web `fetchStory` (`GET /api/stories/:id/`), with mock fallback. */
export async function fetchStoryById(id: string): Promise<StoryDetail> {
  try {
    const data = await apiGetJson<StoryDetail>(`/api/stories/${id}/`);
    return normalizeStoryDetail(data);
  } catch {
    const mock = getMockStoryById(id);
    if (!mock) throw new Error('Could not load story.');
    return mock;
  }
}

function normalizeStoryDetail(data: StoryDetail): StoryDetail {
  return {
    ...data,
    linked_recipe: data.linked_recipe ?? null,
    thumbnail: data.thumbnail ?? null,
  };
}

