import { apiClient } from '../services/api';
import {
  fetchThreads,
  fetchMessages,
  sendMessage,
  createThread,
  markThreadRead,
} from '../services/messageService';

jest.mock('../services/api', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

beforeEach(() => jest.clearAllMocks());

describe('fetchThreads', () => {
  it('GETs /api/threads/ and normalizes a paginated response', async () => {
    apiClient.get.mockResolvedValue({
      data: {
        results: [
          {
            id: 1,
            other_user_id: 5,
            other_username: 'bob',
            last_message_at: '2026-01-01T00:00:00Z',
            last_message_preview: 'hi',
            unread_count: 2,
          },
        ],
      },
    });
    const result = await fetchThreads();
    expect(apiClient.get).toHaveBeenCalledWith('/api/threads/');
    expect(result).toEqual([
      {
        id: 1,
        otherUser: { id: 5, username: 'bob' },
        lastMessage: { createdAt: '2026-01-01T00:00:00Z', body: 'hi', senderId: null },
        unreadCount: 2,
        recipe: null,
      },
    ]);
  });

  it('handles a plain array response with no last_message', async () => {
    apiClient.get.mockResolvedValue({
      data: [{ id: 2, other_user_id: 6, other_username: 'carol' }],
    });
    const result = await fetchThreads();
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 2,
        otherUser: { id: 6, username: 'carol' },
        lastMessage: null,
        unreadCount: 0,
      }),
    );
  });
});

describe('fetchMessages', () => {
  it('GETs /api/threads/:id/messages/ and normalizes messages', async () => {
    apiClient.get.mockResolvedValue({
      data: {
        results: [
          {
            id: 11,
            body: 'hey',
            created_at: '2026-01-01T00:00:00Z',
            sender: 5,
            sender_username: 'bob',
          },
        ],
      },
    });
    const result = await fetchMessages(1);
    expect(apiClient.get).toHaveBeenCalledWith('/api/threads/1/messages/');
    expect(result).toEqual([
      {
        id: 11,
        body: 'hey',
        createdAt: '2026-01-01T00:00:00Z',
        sender: { id: 5, username: 'bob' },
      },
    ]);
  });
});

describe('sendMessage', () => {
  it('POSTs body to /api/threads/:id/send/ and returns normalized data', async () => {
    apiClient.post.mockResolvedValue({
      data: {
        id: 50,
        body: 'hi back',
        created_at: '2026-01-01T01:00:00Z',
        sender: 1,
        sender_username: 'me',
      },
    });
    const result = await sendMessage(1, 'hi back');
    expect(apiClient.post).toHaveBeenCalledWith('/api/threads/1/send/', { body: 'hi back' });
    expect(result).toEqual({
      id: 50,
      body: 'hi back',
      createdAt: '2026-01-01T01:00:00Z',
      sender: { id: 1, username: 'me' },
    });
  });

  it('propagates API errors to the caller', async () => {
    apiClient.post.mockRejectedValue(new Error('boom'));
    await expect(sendMessage(1, 'x')).rejects.toThrow('boom');
  });
});

describe('createThread', () => {
  it('POSTs other_user_id to /api/threads/ and normalizes response', async () => {
    apiClient.post.mockResolvedValue({
      data: {
        id: 8,
        other_user_id: 5,
        other_username: 'bob',
        last_message_at: null,
        unread_count: 0,
      },
    });
    const result = await createThread({ toUserId: 5, toUsername: 'bob' });
    expect(apiClient.post).toHaveBeenCalledWith('/api/threads/', { other_user_id: 5 });
    expect(result).toEqual({
      id: 8,
      otherUser: { id: 5, username: 'bob' },
      lastMessage: null,
      unreadCount: 0,
      recipe: null,
    });
  });

  it('falls back to provided toUsername when response omits other_username', async () => {
    apiClient.post.mockResolvedValue({
      data: { id: 9, other_user_id: 5, last_message_at: null },
    });
    const result = await createThread({ toUserId: 5, toUsername: 'fallback' });
    expect(result.otherUser.username).toBe('fallback');
  });
});

describe('markThreadRead', () => {
  it('POSTs to /api/threads/:id/read/ with no body', async () => {
    apiClient.post.mockResolvedValue({ data: {} });
    await markThreadRead(42);
    expect(apiClient.post).toHaveBeenCalledWith('/api/threads/42/read/');
  });
});

describe('fetchMessages — cursor pagination (#851)', () => {
  it('follows the cursor `next` link and concatenates all pages', async () => {
    apiClient.get
      .mockResolvedValueOnce({
        data: {
          results: [{ id: 1, body: 'hi',    created_at: '2026-05-01T00:00:00Z', sender: 1, sender_username: 'a' }],
          next: 'https://api.example.com/api/threads/9/messages/?cursor=abc',
        },
      })
      .mockResolvedValueOnce({
        data: {
          results: [{ id: 2, body: 'there', created_at: '2026-05-01T00:00:01Z', sender: 2, sender_username: 'b' }],
          next: null,
        },
      });

    const result = await fetchMessages(9);
    expect(apiClient.get).toHaveBeenNthCalledWith(1, '/api/threads/9/messages/');
    expect(apiClient.get).toHaveBeenNthCalledWith(2, '/api/threads/9/messages/?cursor=abc');
    expect(result).toHaveLength(2);
    expect(result.map((m) => m.id)).toEqual([1, 2]);
  });

  it('falls back to a single-page array response', async () => {
    apiClient.get.mockResolvedValue({ data: [{ id: 5, body: 'hello', created_at: '2026-05-01T00:00:00Z', sender: 1, sender_username: 'a' }] });
    const result = await fetchMessages(9);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(5);
  });
});
