import { apiGetJson } from './httpClient';

export type RecommendationItem = {
  key: string;
  kind: 'recipe' | 'story';
  id: string;
  title: string;
  snippet: string;
  image: string | null;
  region: string | null;
  authorUsername: string | null;
  rankScore: number;
  rankReason: string | null;
};

type BackendRecommendationsResponse = {
  surface: string;
  results: Array<{
    result_type: 'recipe' | 'story';
    id: number | string;
    title?: string;
    description?: string;
    body?: string;
    image?: string | null;
    region_tag?: string | null;
    author_username?: string | null;
    rank_score?: number;
    rank_reason?: string | null;
  }>;
  total_count?: number;
};

export async function fetchRecommendations(
  surface: 'feed' | 'explore' | 'map' | 'recs' = 'feed',
  limit = 10,
): Promise<RecommendationItem[]> {
  const params = new URLSearchParams({ surface, limit: String(limit) });
  const data = await apiGetJson<BackendRecommendationsResponse>(`/api/recommendations/?${params.toString()}`);
  const results = Array.isArray(data?.results) ? data.results : [];
  return results.map((r) => ({
    key: `${r.result_type}-${r.id}`,
    kind: r.result_type,
    id: String(r.id),
    title: String(r.title ?? ''),
    snippet: String(r.description ?? r.body ?? ''),
    image: typeof r.image === 'string' ? r.image : null,
    region: typeof r.region_tag === 'string' ? r.region_tag : null,
    authorUsername: typeof r.author_username === 'string' ? r.author_username : null,
    rankScore: typeof r.rank_score === 'number' ? r.rank_score : 0,
    rankReason: typeof r.rank_reason === 'string' ? r.rank_reason : null,
  }));
}
