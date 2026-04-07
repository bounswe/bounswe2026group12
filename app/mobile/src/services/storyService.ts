import type { StoryDetail } from '../types/story';
import { apiGetJson } from './httpClient';

/** Same endpoint as web `fetchStory` (`GET /api/stories/:id/`). */
export async function fetchStoryById(id: string): Promise<StoryDetail> {
  const data = await apiGetJson<StoryDetail>(`/api/stories/${id}/`);
  return normalizeStoryDetail(data);
}

function normalizeStoryDetail(data: StoryDetail): StoryDetail {
  return {
    ...data,
    linked_recipe: data.linked_recipe ?? null,
    thumbnail: data.thumbnail ?? null,
  };
}

