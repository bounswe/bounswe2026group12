import apiClient from './api';
import {
  MOCK_THREADS,
  MOCK_MESSAGES,
  mockCreateThread,
  mockSendMessage,
} from '../mocks/messages';

const USE_MOCK = process.env.REACT_APP_USE_MOCK === 'true';

export async function fetchThreads() {
  if (USE_MOCK) return [...MOCK_THREADS];
  const res = await apiClient.get('/api/messages/threads/');
  return res.data;
}

export async function fetchMessages(threadId) {
  if (USE_MOCK) return [...(MOCK_MESSAGES[Number(threadId)] || [])];
  const res = await apiClient.get(`/api/messages/threads/${threadId}/`);
  return res.data;
}

export async function sendMessage(threadId, body) {
  if (USE_MOCK) return mockSendMessage(Number(threadId), body);
  const res = await apiClient.post('/api/messages/', { thread: threadId, body });
  return res.data;
}

export async function createThread({ toUserId, toUsername, recipeId, recipeTitle, body }) {
  if (USE_MOCK) return mockCreateThread({ toUserId, toUsername, recipeId, recipeTitle, body });
  const res = await apiClient.post('/api/messages/threads/', {
    recipient: toUserId,
    recipe: recipeId,
    body,
  });
  return res.data;
}
