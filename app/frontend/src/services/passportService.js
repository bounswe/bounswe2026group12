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

const MOCK_STATS = {
  level: 3,
  level_name: 'Street Food Explorer',
  cultures_count: 7,
  recipes_tried: 24,
  stories_saved: 11,
  heritage_shared: 3,
  cultures: [
    { id: 1, name: 'Ottoman', emblem: '🕌', stamp_rarity: 'gold',   recipe_count: 8, story_count: 3, heritage_count: 1, ingredients_count: 14, favorite_dish: 'Baklava',    upgrade_progress: 70, upgrade_max: 100 },
    { id: 2, name: 'Aegean',  emblem: '🫒', stamp_rarity: 'silver', recipe_count: 5, story_count: 2, heritage_count: 0, ingredients_count: 9,  favorite_dish: 'Zeytinyağlı', upgrade_progress: 45, upgrade_max: 100 },
    { id: 3, name: 'Mediterranean', emblem: '🌊', stamp_rarity: 'bronze', recipe_count: 3, story_count: 1, heritage_count: 0, ingredients_count: 6, favorite_dish: 'Hummus', upgrade_progress: 20, upgrade_max: 100 },
  ],
};

const MOCK_STAMPS = [
  { id: 1, name: 'First Recipe',     category: 'Recipe',      rarity: 'bronze',    earned_at: '2025-02-01T00:00:00Z', locked: false, progress: 1,  max_progress: 1  },
  { id: 2, name: 'Ottoman Explorer', category: 'Heritage',    rarity: 'gold',      earned_at: '2025-03-15T00:00:00Z', locked: false, progress: 10, max_progress: 10 },
  { id: 3, name: 'Story Keeper',     category: 'Story',       rarity: 'silver',    earned_at: '2025-04-10T00:00:00Z', locked: false, progress: 5,  max_progress: 5  },
  { id: 4, name: 'Community Pillar', category: 'Community',   rarity: 'legendary', earned_at: null,                    locked: true,  progress: 2,  max_progress: 20 },
  { id: 5, name: 'Map Maker',        category: 'Exploration', rarity: 'emerald',   earned_at: null,                    locked: true,  progress: 3,  max_progress: 15 },
];

const MOCK_TIMELINE = [
  { id: 1, type: 'recipe_tried',   date: '2025-04-20T12:00:00Z', description: 'Tried Baklava',         recipe_id: 1, recipe_title: 'Baklava',         story_id: null },
  { id: 2, type: 'story_saved',    date: '2025-04-18T09:00:00Z', description: 'Saved Grandmother\'s Kitchen', recipe_id: null, story_id: 3, story_title: "Grandmother's Kitchen" },
  { id: 3, type: 'stamp_earned',   date: '2025-03-15T14:00:00Z', description: 'Earned Ottoman Explorer stamp', recipe_id: null, story_id: null },
  { id: 4, type: 'heritage_shared',date: '2025-03-01T10:00:00Z', description: 'Shared heritage recipe', recipe_id: 2, recipe_title: 'Pilaf', story_id: null },
  { id: 5, type: 'quest_completed',date: '2025-02-10T08:00:00Z', description: 'Completed First Steps quest', recipe_id: null, story_id: null },
];

const MOCK_QUESTS = [
  { id: 1, name: 'Spice Trader',     description: 'Try 5 recipes with saffron',     progress: 3, max_progress: 5,  reward: 'Spice Merchant badge', deadline: null,                    completed: false },
  { id: 2, name: 'Story Circle',     description: 'Save 10 cultural food stories',  progress: 7, max_progress: 10, reward: 'Storyteller badge',    deadline: null,                    completed: false },
  { id: 3, name: 'Ramadan Table',    description: 'Try 3 Ramadan recipes',           progress: 3, max_progress: 3,  reward: 'Gold Crescent stamp',  deadline: '2025-04-10T00:00:00Z', completed: true  },
  { id: 4, name: 'First Steps',      description: 'Complete your first passport action', progress: 1, max_progress: 1, reward: 'Traveler badge',   deadline: null,                    completed: true  },
];

export async function getPublicProfile(username) {
  if (USE_MOCK) return { ...MOCK_PROFILE, username };
  const res = await apiClient.get(`/api/users/${username}/`);
  return res.data;
}

export async function getPassportStats(username) {
  if (USE_MOCK) return MOCK_STATS;
  const res = await apiClient.get(`/api/passport/users/${username}/stats/`);
  return res.data;
}

export async function getPassportStamps(username) {
  if (USE_MOCK) return MOCK_STAMPS;
  const res = await apiClient.get(`/api/passport/users/${username}/stamps/`);
  return res.data;
}

export async function getPassportTimeline(username) {
  if (USE_MOCK) return MOCK_TIMELINE;
  const res = await apiClient.get(`/api/passport/users/${username}/timeline/`);
  return res.data;
}

export async function getPassportQuests(username) {
  if (USE_MOCK) return MOCK_QUESTS;
  const res = await apiClient.get(`/api/passport/users/${username}/quests/`);
  return res.data;
}

export async function tryRecipe(recipeId) {
  if (USE_MOCK) return { status: 'ok' };
  const res = await apiClient.post(`/api/passport/recipes/${recipeId}/try/`);
  return res.data;
}

export async function addRecipeToPassport(recipeId) {
  if (USE_MOCK) return { status: 'ok' };
  const res = await apiClient.post(`/api/passport/recipes/${recipeId}/save/`);
  return res.data;
}

export async function saveStoryToPassport(storyId) {
  if (USE_MOCK) return { status: 'ok' };
  const res = await apiClient.post(`/api/passport/stories/${storyId}/save/`);
  return res.data;
}
