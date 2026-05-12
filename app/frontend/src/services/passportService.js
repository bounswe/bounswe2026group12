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

const MOCK_PASSPORT = {
  level: 3,
  total_points: 240,
  active_theme: 'street_food_explorer',
  stats: {
    cultures_count: 7,
    recipes_tried: 24,
    stories_saved: 11,
    heritage_shared: 3,
    level_name: 'Street Food Explorer',
  },
  stamps: [
    { id: 1, culture: 'Ottoman Explorer', category: 'Heritage',    rarity: 'gold',      earned_at: '2025-03-15T00:00:00Z' },
    { id: 2, culture: 'First Recipe',     category: 'Recipe',      rarity: 'bronze',    earned_at: '2025-02-01T00:00:00Z' },
    { id: 3, culture: 'Story Keeper',     category: 'Story',       rarity: 'silver',    earned_at: '2025-04-10T00:00:00Z' },
    { id: 4, culture: 'Community Pillar', category: 'Community',   rarity: 'legendary', earned_at: null },
    { id: 5, culture: 'Map Maker',        category: 'Exploration', rarity: 'emerald',   earned_at: null },
  ],
  culture_summaries: [
    { culture: 'Ottoman',       recipes_tried: 8, stories_saved: 3, interactions: 12, rarity: 'gold'   },
    { culture: 'Aegean',        recipes_tried: 5, stories_saved: 2, interactions: 7,  rarity: 'silver' },
    { culture: 'Mediterranean', recipes_tried: 3, stories_saved: 1, interactions: 4,  rarity: 'bronze' },
  ],
  timeline: [
    { id: 1, event_type: 'recipe_tried',    timestamp: '2025-04-20T12:00:00Z', related_recipe: 1, related_story: null },
    { id: 2, event_type: 'story_saved',     timestamp: '2025-04-18T09:00:00Z', related_recipe: null, related_story: 3 },
    { id: 3, event_type: 'stamp_earned',    timestamp: '2025-03-15T14:00:00Z', related_recipe: null, related_story: null },
    { id: 4, event_type: 'heritage_shared', timestamp: '2025-03-01T10:00:00Z', related_recipe: 2,    related_story: null },
    { id: 5, event_type: 'quest_completed', timestamp: '2025-02-10T08:00:00Z', related_recipe: null, related_story: null },
  ],
  active_quests: [
    { id: 1, name: 'Spice Trader',  description: 'Try 5 recipes with saffron',    progress: 3, target_count: 5,  reward_type: 'badge', reward_value: 'Spice Merchant', deadline: null,                    completed_at: null },
    { id: 2, name: 'Story Circle',  description: 'Save 10 cultural food stories', progress: 7, target_count: 10, reward_type: 'badge', reward_value: 'Storyteller',    deadline: null,                    completed_at: null },
    { id: 3, name: 'Ramadan Table', description: 'Try 3 Ramadan recipes',         progress: 3, target_count: 3,  reward_type: 'stamp', reward_value: 'Gold Crescent',  deadline: '2025-04-10T00:00:00Z', completed_at: '2025-04-09T00:00:00Z' },
  ],
};

export async function getPublicProfile(username) {
  if (USE_MOCK) return { ...MOCK_PROFILE, username };
  const res = await apiClient.get(`/api/users/${username}/`);
  return res.data;
}

export async function getPassport(username) {
  if (USE_MOCK) return MOCK_PASSPORT;
  const res = await apiClient.get(`/api/users/${username}/passport/`);
  return res.data;
}

export async function tryRecipe(recipeId) {
  if (USE_MOCK) return { status: 'ok' };
  const res = await apiClient.post(`/api/passport/recipes/${recipeId}/try/`);
  return res.data;
}

export async function saveStoryToPassport(storyId) {
  if (USE_MOCK) return { status: 'ok' };
  const res = await apiClient.post(`/api/passport/stories/${storyId}/save/`);
  return res.data;
}
