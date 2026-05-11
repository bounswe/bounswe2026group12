import { apiClient } from './api';

const USE_MOCK = process.env.REACT_APP_USE_MOCK === 'true';

const MOCK_GROUP = {
  id: 1,
  name: 'Sarma / Dolma',
  description: 'Stuffed grape leaves and vegetables — a shared tradition across Anatolia, the Balkans, and the Middle East.',
  members: [
    { content_type: 'recipe', id: 1, title: 'Yaprak Sarma', author: 'chef_ali', region: 'Aegean', latitude: 38.4, longitude: 27.1 },
    { content_type: 'story', id: 2, title: 'My Grandmother\'s Dolma', author: 'ayse_k', region: 'Marmara', latitude: 41.0, longitude: 29.0 },
  ],
  journey_steps: [
    { id: 1, order: 1, location: 'Central Asia', story: 'Nomadic Turkic communities wrapped meat in leaves for portability.', era: 'Pre-Ottoman' },
    { id: 2, order: 2, location: 'Ottoman Istanbul', story: 'Palace kitchens refined the technique with rice and spices.', era: '15th century' },
    { id: 3, order: 3, location: 'Balkans', story: 'Spread through Ottoman rule, adapted with local herbs.', era: '17th century' },
  ],
};

const MOCK_FACTS = [
  { id: 1, heritage_group: { id: 1, name: 'Sarma / Dolma' }, region: null, text: '"Dolma" comes from the Turkish verb "doldurmak" (to stuff). It was standardized in Ottoman palace cuisine in the 15th century.', source_url: null },
];

export async function fetchHeritageGroup(id) {
  if (USE_MOCK) return MOCK_GROUP;
  const res = await apiClient.get(`/api/heritage-groups/${id}/`);
  return res.data;
}

export async function fetchHeritageGroups() {
  if (USE_MOCK) return [{ id: 1, name: 'Sarma / Dolma', member_count: 2 }];
  const res = await apiClient.get('/api/heritage-groups/');
  return res.data;
}

export async function fetchCulturalFacts({ heritageGroupId } = {}) {
  if (USE_MOCK) return MOCK_FACTS;
  const params = heritageGroupId ? `?heritage_group=${heritageGroupId}` : '';
  const res = await apiClient.get(`/api/cultural-facts/${params}`);
  return Array.isArray(res.data) ? res.data : (res.data.results ?? []);
}
