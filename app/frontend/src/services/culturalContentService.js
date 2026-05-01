import { apiClient } from './api';

const USE_MOCK = process.env.REACT_APP_USE_MOCK === 'true';

const MOCK_DAILY = [
  {
    id: 1,
    title: 'The Story of Wedding Pilaf',
    body: 'A short cultural note from Anatolian celebrations.',
    image_url: null,
    cultural_tags: ['Wedding', 'Anatolian'],
  },
  {
    id: 2,
    title: 'Ramadan Table Traditions',
    body: 'How iftar tables differ by region.',
    image_url: null,
    cultural_tags: ['Ramadan', 'Aegean'],
  },
];

function normalize(item) {
  return {
    id: item.id,
    title: item.title,
    body: item.body || '',
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

