/** Mock search rows — tap navigates to public detail screens (no API). */

export type MockSearchItem = {
  key: string;
  kind: 'recipe' | 'story';
  id: string;
  title: string;
  /** Subtitle line (kept for backwards compatibility / mock display). */
  subtitle: string;
  /** Optional region tag (for recipes). */
  region?: string;
  /** Optional thumbnail URL (not used yet on mobile). */
  thumbnail?: string | null;
};

export const MOCK_SEARCH_RESULTS: MockSearchItem[] = [
  {
    key: 'recipe-1',
    kind: 'recipe',
    id: '1',
    title: 'Mock Anatolian stew',
    subtitle: 'Recipe · Anatolia',
    region: 'Anatolia',
  },
  {
    key: 'story-1',
    kind: 'story',
    id: '1',
    title: 'Mock kitchen story',
    subtitle: 'Story',
  },
  {
    key: 'recipe-2',
    kind: 'recipe',
    id: '2',
    title: 'Mock Aegean salad',
    subtitle: 'Recipe · Aegean',
    region: 'Aegean',
  },
];
