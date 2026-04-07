export type StoryDetail = {
  id: number | string;
  title: string;
  body: string;
  language?: 'en' | 'tr' | string;
  author?: { id?: number; username: string };
  linked_recipe?: { id: string; title: string; region?: string } | null;
  /** Optional thumbnail URL/uri (mock uses local file uri). */
  thumbnail?: string | null;
};

