import * as storyService from '../services/storyService';
import { apiClient } from '../services/api';

jest.mock('../services/api', () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

beforeEach(() => jest.clearAllMocks());

describe('fetchStory', () => {
  it('calls GET /api/stories/:id/ and returns data', async () => {
    apiClient.get.mockResolvedValue({ data: { id: 1, title: 'My Story' } });
    const result = await storyService.fetchStory(1);
    expect(apiClient.get).toHaveBeenCalledWith('/api/stories/1/');
    expect(result).toEqual({ id: 1, title: 'My Story' });
  });

  it('propagates API errors', async () => {
    apiClient.get.mockRejectedValue(new Error('Not found'));
    await expect(storyService.fetchStory(99)).rejects.toThrow('Not found');
  });
});

describe('createStory', () => {
  it('calls POST /api/stories/ with story data', async () => {
    apiClient.post.mockResolvedValue({ data: { id: 2, title: 'New Story' } });
    const payload = { title: 'New Story', body: 'text', language: 'en', linked_recipe: null };
    const result = await storyService.createStory(payload);
    expect(apiClient.post).toHaveBeenCalledWith('/api/stories/', payload);
    expect(result).toEqual({ id: 2, title: 'New Story' });
  });

  it('includes linked_recipe id when provided', async () => {
    apiClient.post.mockResolvedValue({ data: { id: 3 } });
    await storyService.createStory({ title: 'T', body: 'B', language: 'en', linked_recipe: 5 });
    expect(apiClient.post).toHaveBeenCalledWith('/api/stories/', {
      title: 'T', body: 'B', language: 'en', linked_recipe: 5,
    });
  });
});

describe('storyService — new functions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetchStories calls GET /api/stories/ and returns data', async () => {
    apiClient.get.mockResolvedValue({ data: [{ id: 1, title: 'Test' }] });
    const result = await storyService.fetchStories();
    expect(apiClient.get).toHaveBeenCalledWith('/api/stories/');
    expect(result).toEqual([{ id: 1, title: 'Test' }]);
  });

  it('updateStory calls PATCH /api/stories/:id/ and returns data', async () => {
    apiClient.patch.mockResolvedValue({ data: { id: 2, title: 'Updated' } });
    const payload = new FormData();
    const result = await storyService.updateStory(2, payload);
    expect(apiClient.patch).toHaveBeenCalledWith('/api/stories/2/', payload);
    expect(result).toEqual({ id: 2, title: 'Updated' });
  });

  it('deleteStory DELETEs /api/stories/:id/', async () => {
    apiClient.delete.mockResolvedValue({ status: 204 });
    await storyService.deleteStory(7);
    expect(apiClient.delete).toHaveBeenCalledWith('/api/stories/7/');
  });
});
