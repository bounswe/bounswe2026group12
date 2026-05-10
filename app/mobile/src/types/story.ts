export type StoryDetail = {
  id: number | string;
  title: string;
  body: string;
  language?: 'en' | 'tr' | string;
  /** Normalized to `{ id, username }`; raw API may send `author` as user pk only. */
  author?: number | { id?: number; username: string };
  linked_recipe?: { id: string; title: string; region?: string } | null;
  is_published?: boolean;
  /** Optional image URL/uri (mock uses remote url). */
  image?: string | null;
  /** Friendly region name surfaced by `normalizeStoryDetail` (backend exposes `region_name`). */
  region?: string;
  rank_score?: number;
  rank_reason?: string | null;
};

