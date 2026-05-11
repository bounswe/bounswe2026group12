import { apiGetJson } from './httpClient';

export type RegionContentItem = {
  key: string;
  id: string;
  title: string;
  image: string | null;
  authorUsername: string | null;
};

export type RegionContent = {
  recipes: RegionContentItem[];
  stories: RegionContentItem[];
};

type RawRegionContent = {
  content_type: 'recipe' | 'story' | 'cultural' | string;
  id: number | string;
  title?: string;
  image?: string | null;
  author_username?: string | null;
};

function unwrap<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && Array.isArray((data as { results?: unknown }).results)) {
    return (data as { results: T[] }).results;
  }
  return [];
}

function toItem(kind: 'recipe' | 'story', raw: RawRegionContent): RegionContentItem {
  return {
    key: `${kind}-${raw.id}`,
    id: String(raw.id),
    title: typeof raw.title === 'string' ? raw.title : '',
    image: typeof raw.image === 'string' ? raw.image : null,
    authorUsername: typeof raw.author_username === 'string' ? raw.author_username : null,
  };
}

/**
 * Fetch region-tagged content from the dedicated map endpoint
 * `GET /api/map/regions/<id>/content/?type={recipe|story}` instead of pulling
 * every story in the system and filtering client-side (the old behaviour was
 * the slow/incomplete path called out in #620). Two parallel requests, one
 * for recipes and one for stories.
 */
export async function fetchRegionContent(regionId: number | string): Promise<RegionContent> {
  const base = `/api/map/regions/${regionId}/content/`;
  const [recipesRaw, storiesRaw] = await Promise.all([
    apiGetJson<unknown>(`${base}?type=recipe`).catch(() => null),
    apiGetJson<unknown>(`${base}?type=story`).catch(() => null),
  ]);

  const recipes = unwrap<RawRegionContent>(recipesRaw)
    .filter((r) => r.content_type === 'recipe')
    .map((r) => toItem('recipe', r));
  const stories = unwrap<RawRegionContent>(storiesRaw)
    .filter((s) => s.content_type === 'story')
    .map((s) => toItem('story', s));

  return { recipes, stories };
}
