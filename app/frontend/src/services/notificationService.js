import { apiClient } from './api';

const USE_MOCK = process.env.REACT_APP_USE_MOCK === 'true';

const mockNotifications = [
  {
    id: 1,
    type: 'recipe_question',
    message: 'alice asked a question on your recipe.',
    payload: { recipeId: 2, recipeTitle: 'Mercimek Corbasi' },
    is_read: false,
    created_at: new Date().toISOString(),
  },
];

function normalize(notification) {
  if (!notification) return null;
  return {
    id: notification.id,
    type: notification.type || 'generic',
    message: notification.message || '',
    payload: notification.payload || null,
    isRead: Boolean(notification.is_read ?? notification.isRead),
    createdAt: notification.created_at || notification.createdAt || new Date().toISOString(),
    actorUsername: notification.actor_username,
    recipeId: notification.recipe,
    recipeTitle: notification.recipe_title,
  };
}

export async function fetchNotifications() {
  if (USE_MOCK) return mockNotifications.map(normalize);
  const response = await apiClient.get('/api/notifications/');
  const list = Array.isArray(response.data?.results) ? response.data.results : response.data;
  return Array.isArray(list) ? list.map(normalize) : [];
}

export async function markNotificationAsRead(notificationId) {
  if (USE_MOCK) {
    const item = mockNotifications.find((n) => n.id === notificationId);
    return normalize({ ...item, is_read: true });
  }
  const response = await apiClient.post(`/api/notifications/${notificationId}/read/`);
  return normalize(response.data);
}

export async function markAllAsRead() {
  if (USE_MOCK) return;
  await apiClient.post('/api/notifications/read-all/');
}

export async function registerDeviceToken(token, platform = 'web') {
  if (!token) return null;
  if (USE_MOCK) return { id: 1, token, platform };
  const response = await apiClient.post('/api/notifications/tokens/', { token, platform });
  return response.data;
}

