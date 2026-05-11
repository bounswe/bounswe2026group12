import { renderHook, act, waitFor } from '@testing-library/react';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { NotificationContext, NotificationProvider } from '../context/NotificationContext';
import * as notificationService from '../services/notificationService';

jest.mock('../services/notificationService');

function makeWrapper(token) {
  const authValue = { token, user: token ? { id: 1, username: 'a' } : null };
  return function Wrapper({ children }) {
    return (
      <AuthContext.Provider value={authValue}>
        <NotificationProvider>{children}</NotificationProvider>
      </AuthContext.Provider>
    );
  };
}

function useNotifications() {
  return useContext(NotificationContext);
}

describe('NotificationContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('without a token, does not fetch and starts with empty notifications', async () => {
    const { result } = renderHook(() => useNotifications(), {
      wrapper: makeWrapper(null),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(notificationService.fetchNotifications).not.toHaveBeenCalled();
    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
  });

  it('with a token, fetches notifications and populates unreadCount', async () => {
    notificationService.fetchNotifications.mockResolvedValue([
      { id: 1, message: 'a', isRead: false, createdAt: '2026-01-01T00:00:00Z' },
      { id: 2, message: 'b', isRead: true, createdAt: '2026-01-01T00:00:00Z' },
      { id: 3, message: 'c', isRead: false, createdAt: '2026-01-01T00:00:00Z' },
    ]);
    const { result } = renderHook(() => useNotifications(), {
      wrapper: makeWrapper('tok'),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(notificationService.fetchNotifications).toHaveBeenCalledTimes(1);
    expect(result.current.notifications).toHaveLength(3);
    expect(result.current.unreadCount).toBe(2);
  });

  it('markRead(id) marks the notification as read and decrements unreadCount', async () => {
    notificationService.fetchNotifications.mockResolvedValue([
      { id: 1, message: 'a', isRead: false, createdAt: '2026-01-01T00:00:00Z' },
      { id: 2, message: 'b', isRead: false, createdAt: '2026-01-01T00:00:00Z' },
    ]);
    notificationService.markNotificationAsRead.mockResolvedValue({
      id: 1,
      message: 'a',
      isRead: true,
      createdAt: '2026-01-01T00:00:00Z',
    });
    const { result } = renderHook(() => useNotifications(), {
      wrapper: makeWrapper('tok'),
    });
    await waitFor(() => expect(result.current.notifications).toHaveLength(2));
    expect(result.current.unreadCount).toBe(2);
    await act(async () => {
      await result.current.markRead(1);
    });
    expect(notificationService.markNotificationAsRead).toHaveBeenCalledWith(1);
    expect(result.current.unreadCount).toBe(1);
    expect(result.current.notifications.find((n) => n.id === 1).isRead).toBe(true);
  });

  it('markRead is a no-op when the notification is already read', async () => {
    notificationService.fetchNotifications.mockResolvedValue([
      { id: 1, message: 'a', isRead: true, createdAt: '2026-01-01T00:00:00Z' },
    ]);
    const { result } = renderHook(() => useNotifications(), {
      wrapper: makeWrapper('tok'),
    });
    await waitFor(() => expect(result.current.notifications).toHaveLength(1));
    await act(async () => {
      await result.current.markRead(1);
    });
    expect(notificationService.markNotificationAsRead).not.toHaveBeenCalled();
  });

  it('sets error and clears loading when fetch rejects', async () => {
    notificationService.fetchNotifications.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useNotifications(), {
      wrapper: makeWrapper('tok'),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Could not load notifications.');
    expect(result.current.notifications).toEqual([]);
  });
});
