import { apiClient } from './api';
import { getMockStoryById, mockCreateStory } from '../mocks/stories';

const USE_MOCK = process.env.REACT_APP_USE_MOCK === 'true';

export async function fetchStory(id) {
  if (USE_MOCK) return getMockStoryById(Number(id)) ?? Promise.reject(new Error('Not found'));
  const response = await apiClient.get(`/api/stories/${id}/`);
  return response.data;
}

export async function fetchStories() {
  const response = await apiClient.get('/api/stories/');
  return response.data;
}

export async function createStory(data) {
  if (USE_MOCK) return mockCreateStory(data);
  const response = await apiClient.post('/api/stories/', data);
  return response.data;
}

export async function updateStory(id, data) {
  const response = await apiClient.patch(`/api/stories/${id}/`, data);
  return response.data;
}
