import { apiClient } from './api';

const USE_MOCK = process.env.REACT_APP_USE_MOCK === 'true';

const MOCK_PROFILE = {
  username: 'demo_chef',
  bio: 'Passionate about Anatolian food traditions.',
  region: 'Aegean',
  cultural_interests: ['Ottoman', 'Mediterranean'],
  religious_preferences: ['Halal'],
  event_interests: ['Family Gatherings', 'Ramadan'],
  created_at: '2025-01-01T00:00:00Z',
  recipe_count: 5,
  story_count: 2,
};

export async function getPublicProfile(username) {
  if (USE_MOCK) return { ...MOCK_PROFILE, username };
  const res = await apiClient.get(`/api/users/${username}/`);
  return res.data;
}

// Stubs — will be implemented when passport backend ships
export async function getPassportStamps(username) { return []; }       // #584
export async function getPassportStats(username) { return null; }      // #587
export async function getPassportTimeline(username) { return []; }     // #588
export async function getPassportQuests(username) { return []; }       // #586
