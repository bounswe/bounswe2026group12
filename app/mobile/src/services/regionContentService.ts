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

type RawRecipe = {
  id: number | string;
  title?: string;
  image?: string | null;
  author_username?: string | null;
};

type RawStory = {
  id: number | string;
  title?: string;
  image?: string | null;
  author_username?: string | null;
  linked_recipe?: { region?: { name?: string } | string | null } | null;
  recipe_region?: string;
};

function unwrap<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && Array.isArray((data as { results?: unknown }).results)) {
    return (data as { results: T[] }).results;
  }
  return [];
}

function toItem(kind: 'recipe' | 'story', raw: RawRecipe | RawStory): RegionContentItem {
  return {
    key: `${kind}-${raw.id}`,
    id: String(raw.id),
    title: typeof raw.title === 'string' ? raw.title : '',
    image: typeof raw.image === 'string' ? raw.image : null,
    authorUsername: typeof raw.author_username === 'string' ? raw.author_username : null,
  };
}

function storyMatchesRegion(story: RawStory, regionName: string): boolean {
  const r = story.linked_recipe?.region;
  if (typeof r === 'string') return r === regionName;
  if (r && typeof r === 'object' && typeof r.name === 'string') return r.name === regionName;
  if (typeof story.recipe_region === 'string') return story.recipe_region === regionName;
  return false;
}

export async function fetchRegionContent(regionName: string): Promise<RegionContent> {
  const recipesParams = new URLSearchParams({ region: regionName });
  const [recipesRaw, storiesRaw] = await Promise.all([
    apiGetJson<unknown>(`/api/recipes/?${recipesParams.toString()}`).catch(() => null),
    apiGetJson<unknown>(`/api/stories/`).catch(() => null),
  ]);

  const recipes = unwrap<RawRecipe>(recipesRaw).map((r) => toItem('recipe', r));
  const stories = unwrap<RawStory>(storiesRaw)
    .filter((s) => storyMatchesRegion(s, regionName))
    .map((s) => toItem('story', s));

  return { recipes, stories };
}
