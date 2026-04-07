export const MOCK_SEARCH_RESULTS = [
  { type: 'recipe', id: 1, title: 'Mock Anatolian Stew', region: 'Anatolia', thumbnail: null },
  { type: 'story',  id: 1, title: 'Mock kitchen story',  region: 'Anatolia', thumbnail: null },
  { type: 'recipe', id: 2, title: 'Mock Aegean Salad',   region: 'Aegean',   thumbnail: null },
];

export const MOCK_REGIONS = [
  { regionId: 1, name: 'Anatolia' },
  { regionId: 2, name: 'Aegean' },
  { regionId: 3, name: 'Mediterranean' },
  { regionId: 4, name: 'Black Sea' },
  { regionId: 5, name: 'Marmara' },
];

export function filterMockResults(q, region) {
  return MOCK_SEARCH_RESULTS.filter((r) => {
    const matchesQ = !q || r.title.toLowerCase().includes(q.toLowerCase());
    const matchesRegion = !region || r.region === region;
    return matchesQ && matchesRegion;
  });
}
