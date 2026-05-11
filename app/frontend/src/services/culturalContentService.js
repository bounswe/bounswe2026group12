import { apiClient } from './api';
import { fetchMapRegionContent } from './mapService';

const USE_MOCK = process.env.REACT_APP_USE_MOCK === 'true';

const MOCK_DAILY = [
  {
    id: 1,
    kind: 'tradition',
    title: 'The Story of Wedding Pilaf',
    body: 'A short cultural note from Anatolian celebrations.',
    image_url: null,
    region: 'Anatolia',
    cultural_tags: ['Wedding', 'Anatolian'],
  },
  {
    id: 2,
    kind: 'dish',
    title: 'Ramadan Table Traditions',
    body: 'How iftar tables differ by region.',
    image_url: null,
    region: 'Aegean',
    cultural_tags: ['Ramadan', 'Aegean'],
  },
];

function normalize(item) {
  return {
    id: item.id,
    kind: item.kind || null,
    title: item.title,
    body: item.body || '',
    region: item.region || null,
    imageUrl: item.image_url || null,
    tags: Array.isArray(item.cultural_tags) ? item.cultural_tags : [],
  };
}

export async function fetchDailyCulturalContent() {
  if (USE_MOCK) return MOCK_DAILY.map(normalize);
  const response = await apiClient.get('/api/cultural-content/daily/');
  const list = Array.isArray(response.data) ? response.data : [];
  return list.map(normalize);
}

export async function fetchRegionStories(regionId) {
  const items = await fetchMapRegionContent(regionId);
  return items.filter((item) => item.content_type === 'story');
}

