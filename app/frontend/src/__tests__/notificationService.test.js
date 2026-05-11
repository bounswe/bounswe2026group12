import { fetchNotifications, markAllAsRead, markNotificationAsRead, registerDeviceToken } from '../services/notificationService';
import { apiClient } from '../services/api';

jest.mock('../services/api', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  },
}));

describe('notificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('fetchNotifications handles paginated response', async () => {
    apiClient.get.mockResolvedValueOnce({
      data: {
        results: [
          { id: 1, message: 'hello', is_read: false, created_at: '2026-01-01T10:00:00Z' },
        ],
      },
    });
    const result = await fetchNotifications();
    expect(apiClient.get).toHaveBeenCalledWith('/api/notifications/');
    expect(result[0]).toEqual(expect.objectContaining({ id: 1, isRead: false, message: 'hello' }));
  });

  test('markNotificationAsRead prefers PATCH', async () => {
    apiClient.patch.mockResolvedValueOnce({
      data: { id: 4, message: 'updated', is_read: true, created_at: '2026-01-01T10:00:00Z' },
    });
    const updated = await markNotificationAsRead(4);
    expect(apiClient.patch).toHaveBeenCalledWith('/api/notifications/4/read/');
    expect(apiClient.post).not.toHaveBeenCalled();
    expect(updated.isRead).toBe(true);
  });

  test('markNotificationAsRead falls back to POST if PATCH not allowed', async () => {
    apiClient.patch.mockRejectedValueOnce({ response: { status: 405 } });
    apiClient.post.mockResolvedValueOnce({
      data: { id: 7, message: 'updated', is_read: true, created_at: '2026-01-01T10:00:00Z' },
    });
    const updated = await markNotificationAsRead(7);
    expect(apiClient.post).toHaveBeenCalledWith('/api/notifications/7/read/');
    expect(updated.isRead).toBe(true);
  });

  test('markAllAsRead POSTs to /api/notifications/read-all/', async () => {
    apiClient.post.mockResolvedValueOnce({ data: {} });
    await markAllAsRead();
    expect(apiClient.post).toHaveBeenCalledWith('/api/notifications/read-all/');
  });

  test('registerDeviceToken posts token payload', async () => {
    apiClient.post.mockResolvedValueOnce({ data: { id: 9, token: 'web-token' } });
    await registerDeviceToken('web-token');
    expect(apiClient.post).toHaveBeenCalledWith('/api/notifications/tokens/', {
      token: 'web-token',
      platform: 'web',
    });
  });
});

