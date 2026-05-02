import { apiClient } from './api';
import { MOCK_EXPLORE_EVENTS, getMockEventById } from '../mocks/exploreEvents';

const USE_MOCK = process.env.REACT_APP_USE_MOCK === 'true';

export async function fetchExploreEvents() {
  if (USE_MOCK) return MOCK_EXPLORE_EVENTS;
  const response = await apiClient.get('/api/explore/events/');
  return response.data;
}

export async function fetchEventDetail(id) {
  if (USE_MOCK) {
    const event = getMockEventById(id);
    if (!event) return Promise.reject(new Error('Not found'));
    return event;
  }
  const response = await apiClient.get(`/api/explore/events/${id}/`);
  return response.data;
}
