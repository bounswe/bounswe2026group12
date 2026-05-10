import type { StoryDetail } from '../types/story';
import { parseAuthorId } from '../utils/parseAuthorId';
import { apiGetJson, apiPatchFormData, apiPatchJson } from './httpClient';

/** Same endpoint as web `fetchStory` (`GET /api/stories/:id/`). */
export async function fetchStoryById(id: string): Promise<StoryDetail> {
  const data = await apiGetJson<StoryDetail & Record<string, unknown>>(`/api/stories/${id}/`);
  return normalizeStoryDetail(data);
}

export type StoryListItem = {
  id: string;
  title: string;
  body: string;
  image: string | null;
  authorUsername: string | null;
  linkedRecipeId: string | null;
  rank_score?: number;
  rank_reason?: string | null;
};

function pickListItem(raw: any): StoryListItem {
  const linkedRaw = raw?.linked_recipe;
  const linkedRecipeId =
    linkedRaw == null
      ? null
      : typeof linkedRaw === 'object' && 'id' in linkedRaw
        ? String(linkedRaw.id)
        : String(linkedRaw);
  const authorUsername =
    typeof raw?.author_username === 'string'
      ? raw.author_username
      : typeof raw?.author === 'object' && raw?.author?.username
        ? String(raw.author.username)
        : null;
  return {
    id: String(raw?.id ?? ''),
    title: typeof raw?.title === 'string' ? raw.title : '',
    body: typeof raw?.body === 'string' ? raw.body : '',
    image: typeof raw?.image === 'string' ? raw.image : null,
    authorUsername,
    linkedRecipeId,
    rank_score: typeof raw?.rank_score === 'number' ? raw.rank_score : undefined,
    rank_reason: typeof raw?.rank_reason === 'string' ? raw.rank_reason : null,
  };
}

function unwrapStoriesPayload(data: unknown): any[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && Array.isArray((data as { results?: unknown }).results)) {
    return (data as { results: any[] }).results;
  }
  return [];
}

/**
 * Fetch the raw story list, transparently handling both raw arrays and the
 * DRF-paginated `{results}` envelope. Returns the API objects untouched so
 * callers can read `author`, `linked_recipe`, `image`, etc. directly.
 */
export async function fetchStoriesList(): Promise<any[]> {
  const data = await apiGetJson<unknown>(`/api/stories/`);
  return unwrapStoriesPayload(data);
}

/** Stories where `linked_recipe` matches the given recipe id. Filters client-side. */
export async function fetchStoriesForRecipe(recipeId: string | number): Promise<StoryListItem[]> {
  const data = await apiGetJson<unknown>(`/api/stories/`);
  const target = String(recipeId);
  return unwrapStoriesPayload(data).map(pickListItem).filter((s) => s.linkedRecipeId === target);
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

  // Backend exposes `region` as the FK pk and the friendly label in
  // `region_name`. Surface the name so the detail screen renders it directly.
  const reg = (data as { region?: unknown }).region;
  const regionLabel =
    typeof reg === 'string'
      ? reg
      : reg && typeof reg === 'object' && 'name' in reg && typeof (reg as { name: unknown }).name === 'string'
        ? (reg as { name: string }).name
        : typeof (data as { region_name?: unknown }).region_name === 'string'
          ? (data as unknown as { region_name: string }).region_name
          : undefined;

  return {
    ...data,
    author,
    linked_recipe,
    image: typeof data.image === 'string' ? data.image : null,
    is_published: typeof data.is_published === 'boolean' ? data.is_published : undefined,
    region: regionLabel,
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

export async function updateStoryImageById(
  id: string,
  input: { uri: string; name?: string; type?: string },
): Promise<void> {
  const fd = new FormData();
  fd.append('image', {
    uri: input.uri,
    name: input.name ?? 'story-image.jpg',
    type: input.type ?? 'image/jpeg',
  } as any);
  await apiPatchFormData(`/api/stories/${id}/`, fd);
}

