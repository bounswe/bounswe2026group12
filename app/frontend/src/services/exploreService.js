import { apiClient } from './api';
import { MOCK_EXPLORE_EVENTS, getMockEventById } from '../mocks/exploreEvents';

const USE_MOCK = process.env.REACT_APP_USE_MOCK === 'true';

const REGION_EMOJI = {
  Anatolia: '🌾',
  'Central Anatolia': '🌾',
  'Eastern Anatolia': '⛰️',
  'Southeast Anatolia': '🌶️',
  'Southeastern Anatolia': '🌶️',
  Marmara: '🌊',
  Aegean: '🫒',
  Mediterranean: '☀️',
  'Black Sea': '🌿',
  Arabian: '🌶️',
};

const MAX_PER_AUTHOR_PER_RAIL = 2;
const FEATURED_COUNT = 3;
const SPARSE_RAIL_THRESHOLD = 3;

function regionEmoji(name) {
  return REGION_EMOJI[name] || '📍';
}

function normalizeItem(raw) {
  // Backend `/api/recommendations/` returns `result_type`; mocks use `type`.
  const type = raw.type || raw.result_type;
  const description = raw.description || raw.body || '';
  return {
    ...raw,
    type,
    description,
    region: raw.region || raw.region_tag || null,
    rank_score: raw.rank_score ?? 0,
    rank_reason: raw.rank_reason || null,
    linked_recipe_id: raw.linked_recipe_id ?? null,
  };
}

function capPerAuthor(items, limit = MAX_PER_AUTHOR_PER_RAIL) {
  const counts = new Map();
  const kept = [];
  for (const item of items) {
    const key = item.author_username || '__anon__';
    const n = counts.get(key) || 0;
    if (n < limit) {
      counts.set(key, n + 1);
      kept.push(item);
    }
  }
  return kept;
}

function pickFeatured(items, n = FEATURED_COUNT) {
  return [...items].sort((a, b) => (b.rank_score || 0) - (a.rank_score || 0)).slice(0, n);
}

function buildRails(rawResults) {
  const items = rawResults.map(normalizeItem);
  if (!items.length) return [];

  const rails = [];

  const featured = pickFeatured(items);
  if (featured.length) {
    rails.push({
      id: 'featured',
      name: 'Today on Genipe',
      emoji: '⭐',
      featured,
      featuredRail: true,
    });
  }

  const buckets = new Map();
  for (const item of items) {
    const key = item.region || '__unknown__';
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(item);
  }
  const namedRegions = [...buckets.keys()].filter((k) => k !== '__unknown__').sort();

  if (namedRegions.length >= 2) {
    for (const region of namedRegions) {
      rails.push({
        id: `region-${region.toLowerCase().replace(/\s+/g, '-')}`,
        name: region,
        emoji: regionEmoji(region),
        region,
        featured: capPerAuthor(buckets.get(region)),
      });
    }
    const unknowns = buckets.get('__unknown__');
    if (unknowns && unknowns.length) {
      rails.push({
        id: 'explore',
        name: 'More to discover',
        emoji: '✨',
        featured: capPerAuthor(unknowns),
        showRegionBadge: true,
      });
    }
    return rails;
  }

  // Fallback: type-based rails when region data is sparse.
  const recipes = items.filter((r) => r.type === 'recipe');
  const stories = items.filter((r) => r.type === 'story');
  if (recipes.length) rails.push({ id: 'recipes', name: 'Recipes', emoji: '🍽️', featured: capPerAuthor(recipes), showRegionBadge: true });
  if (stories.length) rails.push({ id: 'stories', name: 'Stories', emoji: '📖', featured: capPerAuthor(stories), showRegionBadge: true });
  if (rails.length === 1 && rails[0].id === 'featured') {
    rails.push({ id: 'explore', name: 'Discover', emoji: '✨', featured: capPerAuthor(items), showRegionBadge: true });
  }
  return rails;
}

export async function fetchExploreEvents() {
  if (USE_MOCK) return MOCK_EXPLORE_EVENTS;
  const response = await apiClient.get('/api/recommendations/', {
    params: { surface: 'explore', limit: 30 },
  });
  return buildRails(response.data.results || []);
}

export async function fetchEventDetail(id) {
  if (USE_MOCK) {
    const event = getMockEventById(id);
    if (!event) return Promise.reject(new Error('Not found'));
    return event;
  }
  const response = await apiClient.get('/api/recommendations/', {
    params: { surface: 'explore', limit: 50 },
  });
  const rails = buildRails(response.data.results || []);
  const match = rails.find((r) => r.id === id);
  if (match) return match;
  const items = (response.data.results || []).map(normalizeItem);
  if (id === 'recipes') return { id: 'recipes', name: 'Recipes', emoji: '🍽️', featured: items.filter((r) => r.type === 'recipe') };
  if (id === 'stories') return { id: 'stories', name: 'Stories', emoji: '📖', featured: items.filter((r) => r.type === 'story') };
  return { id: 'explore', name: 'Discover', emoji: '✨', featured: items };
}

export const __testing__ = { SPARSE_RAIL_THRESHOLD, MAX_PER_AUTHOR_PER_RAIL };
