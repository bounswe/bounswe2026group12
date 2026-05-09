import { apiGetJson } from './httpClient';
import { fetchEventTags, type Tag } from './tagsService';

export type ExploreItem = {
  id: string;
  title: string;
  region: string | null;
  image: string | null;
  authorUsername: string | null;
};

export type EventCategory = {
  id: number;
  name: string;
  recipes: ExploreItem[];
};

type RawRecipe = {
  id: number | string;
  title?: string;
  image?: string | null;
  region?: { name?: string } | string | null;
  region_name?: string;
  author_username?: string | null;
};

function toItem(r: RawRecipe): ExploreItem {
  const reg = r.region;
  const region =
    typeof reg === 'string'
      ? reg
      : reg && typeof reg === 'object' && typeof reg.name === 'string'
        ? reg.name
        : typeof r.region_name === 'string'
          ? r.region_name
          : null;
  return {
    id: String(r.id),
    title: typeof r.title === 'string' ? r.title : '',
    region,
    image: typeof r.image === 'string' ? r.image : null,
    authorUsername: typeof r.author_username === 'string' ? r.author_username : null,
  };
}

function unwrap(data: unknown): RawRecipe[] {
  if (Array.isArray(data)) return data as RawRecipe[];
  if (data && typeof data === 'object' && Array.isArray((data as { results?: unknown }).results)) {
    return (data as { results: RawRecipe[] }).results;
  }
  return [];
}

export async function fetchRecipesForEvent(
  eventName: string,
  limit = 20,
): Promise<ExploreItem[]> {
  const params = new URLSearchParams({ event: eventName });
  const data = await apiGetJson<unknown>(`/api/recipes/?${params.toString()}`);
  return unwrap(data).slice(0, limit).map(toItem);
}

/**
 * Aggregate event categories with their first few recipes for the Explore rail.
 * Categories with zero recipes are dropped so the UI doesn't show empty rails.
 */
export async function fetchExploreCategories(perRail = 8): Promise<EventCategory[]> {
  const tags: Tag[] = await fetchEventTags();
  if (tags.length === 0) return [];
  const grouped = await Promise.all(
    tags.map(async (tag) => {
      try {
        const recipes = await fetchRecipesForEvent(tag.name, perRail);
        return { id: tag.id, name: tag.name, recipes };
      } catch {
        return { id: tag.id, name: tag.name, recipes: [] };
      }
    }),
  );
  return grouped.filter((g) => g.recipes.length > 0);
}
