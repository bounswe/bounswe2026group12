/** Mock search rows — tap navigates to public detail screens (no API). */

export type MockSearchItem = {
  key: string;
  kind: 'recipe' | 'story';
  id: string;
  title: string;
  subtitle: string;
};

export const MOCK_SEARCH_RESULTS: MockSearchItem[] = [
  {
    key: 'recipe-1',
    kind: 'recipe',
    id: '1',
    title: 'Mock Anatolian stew',
    subtitle: 'Recipe · Anatolia',
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
  },
];
