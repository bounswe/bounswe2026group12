import type { StoryDetail } from '../types/story';
import { parseAuthorId } from '../utils/parseAuthorId';
import { apiGetJson, apiPatchJson } from './httpClient';

/** Same endpoint as web `fetchStory` (`GET /api/stories/:id/`). */
export async function fetchStoryById(id: string): Promise<StoryDetail> {
  const data = await apiGetJson<StoryDetail & Record<string, unknown>>(`/api/stories/${id}/`);
  return normalizeStoryDetail(data);
}

function normalizeStoryDetail(data: StoryDetail & Record<string, unknown>): StoryDetail {
  const authorId = parseAuthorId(data.author);
  const author =
    authorId != null
      ? {
          id: authorId,
          username:
            typeof data.author_username === 'string'
              ? data.author_username
              : typeof data.author === 'object' &&
                  data.author &&
                  typeof (data.author as { username?: string }).username === 'string'
                ? (data.author as { username: string }).username
                : '',
        }
      : undefined;

  let linked_recipe: StoryDetail['linked_recipe'] = null;
  if (data.linked_recipe != null) {
    const raw = data.linked_recipe as unknown;
    const lid =
      typeof raw === 'object' && raw !== null && 'id' in (raw as object)
        ? String((raw as { id: unknown }).id)
        : String(raw);
    const title =
      typeof data.recipe_title === 'string'
        ? data.recipe_title
        : typeof raw === 'object' &&
            raw !== null &&
            typeof (raw as { title?: string }).title === 'string'
          ? (raw as { title: string }).title
          : '';
    linked_recipe = {
      id: lid,
      title,
      region:
        typeof raw === 'object' && raw !== null && typeof (raw as { region?: string }).region === 'string'
          ? (raw as { region: string }).region
          : undefined,
    };
  }

  return {
    ...data,
    author,
    linked_recipe,
    thumbnail: data.thumbnail ?? null,
    is_published: typeof data.is_published === 'boolean' ? data.is_published : undefined,
  };
}

export async function updateStoryById(
  id: string,
  body: {
    title: string;
    body: string;
    language: string;
    linked_recipe: number | null;
    is_published: boolean;
  },
): Promise<void> {
  await apiPatchJson(`/api/stories/${id}/`, body);
}

