import { apiClient } from './api';

export async function fetchStory(id) {
  const response = await apiClient.get(`/api/stories/${id}/`);
  return response.data;
}

export async function fetchStories() {
  const response = await apiClient.get('/api/stories/');
  return response.data;
}

export async function createStory(data) {
  const response = await apiClient.post('/api/stories/', data);
  return response.data;
}

export async function updateStory(id, data) {
  const response = await apiClient.patch(`/api/stories/${id}/`, data);
  return response.data;
}
