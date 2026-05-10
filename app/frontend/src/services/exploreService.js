import { apiClient } from './api';
import { MOCK_EXPLORE_EVENTS, getMockEventById } from '../mocks/exploreEvents';

const USE_MOCK = process.env.REACT_APP_USE_MOCK === 'true';

export async function fetchExploreEvents() {
  if (USE_MOCK) return MOCK_EXPLORE_EVENTS;
  const response = await apiClient.get('/api/recommendations/', {
    params: { surface: 'explore', limit: 20 },
  });
  const results = response.data.results || [];
  const recipes = results.filter((r) => r.type === 'recipe');
  const stories = results.filter((r) => r.type === 'story');
  const events = [];
  if (recipes.length) events.push({ id: 'recipes', name: 'Recipes', emoji: '🍽️', featured: recipes });
  if (stories.length) events.push({ id: 'stories', name: 'Stories', emoji: '📖', featured: stories });
  if (!events.length) events.push({ id: 'explore', name: 'Discover', emoji: '✨', featured: results });
  return events;
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
  const results = response.data.results || [];
  const recipes = results.filter((r) => r.type === 'recipe');
  const stories = results.filter((r) => r.type === 'story');
  if (id === 'recipes') return { id: 'recipes', name: 'Recipes', emoji: '🍽️', featured: recipes };
  if (id === 'stories') return { id: 'stories', name: 'Stories', emoji: '📖', featured: stories };
  return { id: 'explore', name: 'Discover', emoji: '✨', featured: results };
}
