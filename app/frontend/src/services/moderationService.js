import { apiClient } from './api';
import { MOCK_MODERATION_QUEUE } from '../mocks/moderationQueue';

const USE_MOCK = process.env.REACT_APP_USE_MOCK === 'true';

let mockQueue = [...MOCK_MODERATION_QUEUE];

export async function fetchModerationQueue() {
  if (USE_MOCK) return [...mockQueue];
  const response = await apiClient.get('/api/moderation/cultural-tags/');
  return response.data;
}

export async function approveTag(id) {
  if (USE_MOCK) {
    mockQueue = mockQueue.map((t) => t.id === id ? { ...t, status: 'approved' } : t);
    return;
  }
  await apiClient.post(`/api/moderation/cultural-tags/${id}/approve/`);
}

export async function rejectTag(id) {
  if (USE_MOCK) {
    mockQueue = mockQueue.map((t) => t.id === id ? { ...t, status: 'rejected' } : t);
    return;
  }
  await apiClient.post(`/api/moderation/cultural-tags/${id}/reject/`);
}
