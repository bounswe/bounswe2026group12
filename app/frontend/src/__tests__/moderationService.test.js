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
  it('GETs /api/moderation/cultural-tags/ and returns data', async () => {
    apiClient.get.mockResolvedValue({ data: [{ id: 1, status: 'pending' }] });
    const result = await fetchModerationQueue();
    expect(apiClient.get).toHaveBeenCalledWith('/api/moderation/cultural-tags/');
    expect(result).toEqual([{ id: 1, status: 'pending' }]);
  });

  it('propagates API errors to the caller', async () => {
    apiClient.get.mockRejectedValue(new Error('boom'));
    await expect(fetchModerationQueue()).rejects.toThrow('boom');
  });
});

describe('approveTag', () => {
  it('POSTs to /api/moderation/cultural-tags/:id/approve/', async () => {
    apiClient.post.mockResolvedValue({ status: 204 });
    await approveTag(5);
    expect(apiClient.post).toHaveBeenCalledWith('/api/moderation/cultural-tags/5/approve/');
  });
});

describe('rejectTag', () => {
  it('POSTs to /api/moderation/cultural-tags/:id/reject/', async () => {
    apiClient.post.mockResolvedValue({ status: 204 });
    await rejectTag(7);
    expect(apiClient.post).toHaveBeenCalledWith('/api/moderation/cultural-tags/7/reject/');
  });
});
