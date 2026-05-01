import { apiClient } from './api';
import {
  MOCK_THREADS,
  MOCK_MESSAGES,
  mockCreateThread,
  mockSendMessage,
} from '../mocks/messages';

const USE_MOCK = process.env.REACT_APP_USE_MOCK === 'true';

export async function fetchThreads() {
  if (USE_MOCK) return [...MOCK_THREADS];
  const res = await apiClient.get('/api/threads/');
  const items = Array.isArray(res.data?.results) ? res.data.results : res.data;
  const list = Array.isArray(items) ? items : [];
  return list.map((thread) => ({
    id: thread.id,
    otherUser: {
      id: thread.other_user_id,
      username: thread.other_username,
    },
    lastMessage: thread.last_message_at
      ? {
        createdAt: thread.last_message_at,
        body: thread.last_message_preview || '',
        senderId: null,
      }
      : null,
    unreadCount: Number(thread.unread_count || 0),
    recipe: null,
  }));
}

export async function fetchMessages(threadId) {
  if (USE_MOCK) return [...(MOCK_MESSAGES[Number(threadId)] || [])];
  const res = await apiClient.get(`/api/threads/${threadId}/messages/`);
  const items = Array.isArray(res.data?.results) ? res.data.results : res.data;
  const list = Array.isArray(items) ? items : [];
  return list.map((message) => ({
    id: message.id,
    body: message.body,
    createdAt: message.created_at,
    sender: {
      id: message.sender,
      username: message.sender_username,
    },
  }));
}

export async function sendMessage(threadId, body) {
  if (USE_MOCK) return mockSendMessage(Number(threadId), body);
  const res = await apiClient.post(`/api/threads/${threadId}/send/`, { body });
  return {
    id: res.data.id,
    body: res.data.body,
    createdAt: res.data.created_at,
    sender: {
      id: res.data.sender,
      username: res.data.sender_username,
    },
  };
}

export async function createThread({ toUserId, toUsername, recipeId, recipeTitle, body }) {
  if (USE_MOCK) return mockCreateThread({ toUserId, toUsername, recipeId, recipeTitle, body });
  const res = await apiClient.post('/api/threads/', {
    other_user_id: toUserId,
  });
  return {
    id: res.data.id,
    otherUser: {
      id: res.data.other_user_id,
      username: res.data.other_username || toUsername,
    },
    lastMessage: res.data.last_message_at
      ? { createdAt: res.data.last_message_at, body: res.data.last_message_preview || '', senderId: null }
      : null,
    unreadCount: Number(res.data.unread_count || 0),
    recipe: null,
  };
}
