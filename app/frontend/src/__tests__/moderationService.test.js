import { apiClient } from '../services/api';
import {
  fetchModerationQueue,
  approveTag,
  rejectTag,
} from '../services/moderationService';

jest.mock('../services/api', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

beforeEach(() => jest.clearAllMocks());

describe('fetchModerationQueue', () => {
  it('normalizes pending backend item to frontend shape', async () => {
    apiClient.get.mockResolvedValue({
      data: [
        {
          id: 1,
          name: 'Istanbul',
          type: 'region',
          is_approved: false,
          reviewed_at: null,
          submitted_by: { id: 42, username: 'alice' },
          submitted_at: '2025-12-01T12:00:00Z',
        },
      ],
    });
    const result = await fetchModerationQueue();
    expect(apiClient.get).toHaveBeenCalledWith('/api/moderation/cultural-tags/');
    expect(result).toEqual([
      {
        id: 1,
        tag: 'Istanbul',
        tag_type: 'region',
        status: 'pending',
        submitted_by: 'alice',
        submitted_at: '2025-12-01T12:00:00Z',
        reviewed_at: null,
        reason: '',
      },
    ]);
  });

  it('derives status approved when is_approved is true and reviewed_at is set', async () => {
    apiClient.get.mockResolvedValue({
      data: [
        {
          id: 2,
          name: 'Ramazan',
          type: 'religion',
          is_approved: true,
          reviewed_at: '2025-12-02T10:00:00Z',
          submitted_by: { id: 1, username: 'bob' },
          submitted_at: '2025-12-01T10:00:00Z',
        },
      ],
    });
    const result = await fetchModerationQueue();
    expect(result[0].status).toBe('approved');
    expect(result[0].reviewed_at).toBe('2025-12-02T10:00:00Z');
  });

  it('derives status rejected when is_approved is false and reviewed_at is set', async () => {
    apiClient.get.mockResolvedValue({
      data: [
        {
          id: 3,
          name: 'Spam',
          type: 'event',
          is_approved: false,
          reviewed_at: '2025-12-03T10:00:00Z',
          submitted_by: { id: 1, username: 'mod' },
          submitted_at: '2025-12-01T10:00:00Z',
          reason: 'looks fake',
        },
      ],
    });
    const result = await fetchModerationQueue();
    expect(result[0].status).toBe('rejected');
    expect(result[0].reason).toBe('looks fake');
  });

  it('accepts a paginated { results: [...] } response shape', async () => {
    apiClient.get.mockResolvedValue({
      data: {
        results: [
          {
            id: 9,
            name: 'Diwali',
            type: 'tradition',
            is_approved: false,
            reviewed_at: null,
            submitted_by: { id: 1, username: 'carol' },
            submitted_at: '2025-12-01T10:00:00Z',
          },
        ],
      },
    });
    const result = await fetchModerationQueue();
    expect(result).toHaveLength(1);
    expect(result[0].tag).toBe('Diwali');
    expect(result[0].submitted_by).toBe('carol');
  });

  it('propagates API errors to the caller', async () => {
    apiClient.get.mockRejectedValue(new Error('boom'));
    await expect(fetchModerationQueue()).rejects.toThrow('boom');
  });
});

describe('approveTag', () => {
  it('POSTs to /api/moderation/cultural-tags/<typeKey>/<id>/approve/', async () => {
    apiClient.post.mockResolvedValue({ status: 204 });
    await approveTag('region', 5);
    expect(apiClient.post).toHaveBeenCalledWith('/api/moderation/cultural-tags/region/5/approve/');
  });
});

describe('rejectTag', () => {
  it('POSTs to /api/moderation/cultural-tags/<typeKey>/<id>/reject/ with a reason body', async () => {
    apiClient.post.mockResolvedValue({ status: 204 });
    await rejectTag('event', 7, 'spam');
    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/moderation/cultural-tags/event/7/reject/',
      { reason: 'spam' },
    );
  });

  it('defaults the reason to an empty string when not provided', async () => {
    apiClient.post.mockResolvedValue({ status: 204 });
    await rejectTag('tradition', 11);
    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/moderation/cultural-tags/tradition/11/reject/',
      { reason: '' },
    );
  });
});
