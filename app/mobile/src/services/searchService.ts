import { apiGetJson } from './httpClient';

export type SearchResultItem = {
  key: string;
  kind: 'recipe' | 'story';
  id: string;
  title: string;
  subtitle: string;
  region?: string;
  thumbnail?: string | null;
  rankScore: number;
  rankReason: string | null;
  /** Aggregate star rating, only populated for recipes when backend supplies it. */
  averageRating?: number | null;
  ratingCount?: number;
  /** Surfaced only when the producer knows the state (e.g. Saved tab); leave
   * undefined for search responses that don't include the field. */
  isBookmarked?: boolean;
};

type BackendSearchResponse = {
  recipes?: Array<{
    result_type: 'recipe';
    id: number | string;
    title: string;
    image?: string | null;
    region_tag?: string | null;
    rank_score?: number;
    rank_reason?: string | null;
    average_rating?: number | string | null;
    rating_count?: number | string | null;
  }>;
  stories?: Array<{
    result_type: 'story';
    id: number | string;
    title: string;
    linked_recipe_id?: number | string | null;
    region_tag?: string | null;
    rank_score?: number;
    rank_reason?: string | null;
  }>;
  total_count?: number;
};

export type SearchFilters = {
  diet?: string[];
  diet_exclude?: string[];
  event?: string[];
  event_exclude?: string[];
};

export async function search(
  q: string,
  region?: string,
  filters?: SearchFilters,
): Promise<SearchResultItem[]> {
  const params = new URLSearchParams();
  params.set('q', q);
  if (region) params.set('region', region);
  if (filters) {
    for (const [key, values] of Object.entries(filters) as [keyof SearchFilters, string[] | undefined][]) {
      if (values && values.length > 0) params.set(key, values.join(','));
    }
  }
  const data = await apiGetJson<BackendSearchResponse>(`/api/search/?${params.toString()}`);

  const recipes = (data.recipes ?? []).map<SearchResultItem>((r) => {
    const avgRaw = r.average_rating;
    const avg =
      typeof avgRaw === 'number'
        ? Number.isFinite(avgRaw)
          ? avgRaw
          : null
        : typeof avgRaw === 'string'
          ? Number.isFinite(parseFloat(avgRaw))
            ? parseFloat(avgRaw)
            : null
          : null;
    const countRaw = r.rating_count;
    const count =
      typeof countRaw === 'number'
        ? countRaw
        : typeof countRaw === 'string'
          ? Number.isFinite(parseInt(countRaw, 10))
            ? parseInt(countRaw, 10)
            : 0
          : 0;
    return {
      key: `recipe-${r.id}`,
      kind: 'recipe' as const,
      id: String(r.id),
      title: String(r.title ?? ''),
      subtitle: r.region_tag ? `Recipe · ${r.region_tag}` : 'Recipe',
      region: r.region_tag ?? undefined,
      thumbnail: r.image ?? null,
      rankScore: typeof r.rank_score === 'number' ? r.rank_score : 0,
      rankReason: typeof r.rank_reason === 'string' ? r.rank_reason : null,
      averageRating: avg,
      ratingCount: count,
    };
  });

  const stories = (data.stories ?? []).map<SearchResultItem>((s) => ({
    key: `story-${s.id}`,
    kind: 'story' as const,
    id: String(s.id),
    title: String(s.title ?? ''),
    subtitle: 'Story',
    region: s.region_tag ?? undefined,
    thumbnail: null,
    rankScore: typeof s.rank_score === 'number' ? s.rank_score : 0,
    rankReason: typeof s.rank_reason === 'string' ? s.rank_reason : null,
  }));

  return [...recipes, ...stories];
}

