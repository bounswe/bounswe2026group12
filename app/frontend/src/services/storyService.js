import { apiClient } from './api';
import { getMockStoryById, mockCreateStory, MOCK_STORIES_LIST } from '../mocks/stories';

const USE_MOCK = process.env.REACT_APP_USE_MOCK === 'true';

export async function fetchStory(id) {
  if (USE_MOCK) return getMockStoryById(Number(id)) ?? Promise.reject(new Error('Not found'));
  const response = await apiClient.get(`/api/stories/${id}/`);
  return response.data;
}

export async function fetchStories() {
  if (USE_MOCK) return MOCK_STORIES_LIST;
  const response = await apiClient.get('/api/stories/');
  return response.data.results ?? response.data;
}

export async function fetchMyStories(userId) {
  if (USE_MOCK) return MOCK_STORIES_LIST;
  const response = await apiClient.get('/api/stories/', { params: { author: userId } });
  return response.data.results ?? response.data;
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

export async function deleteStory(id) {
  if (USE_MOCK) return { status: 204 };
  return apiClient.delete(`/api/stories/${id}/`);
}

export async function publishStory(id) {
  if (USE_MOCK) {
    const story = await fetchStory(id);
    return { ...story, is_published: true };
  }
  const response = await apiClient.post(`/api/stories/${id}/publish/`);
  return response.data;
}

export async function unpublishStory(id) {
  if (USE_MOCK) {
    const story = await fetchStory(id);
    return { ...story, is_published: false };
  }
  const response = await apiClient.post(`/api/stories/${id}/unpublish/`);
  return response.data;
}
