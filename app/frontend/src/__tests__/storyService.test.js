import * as storyService from '../services/storyService';
import { fetchMyStories } from '../services/storyService';
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

describe('publishStory / unpublishStory', () => {
  beforeEach(() => jest.clearAllMocks());

  it('publishStory POSTs to /api/stories/:id/publish/ and returns data', async () => {
    apiClient.post.mockResolvedValue({ data: { id: 5, is_published: true } });
    const result = await storyService.publishStory(5);
    expect(apiClient.post).toHaveBeenCalledWith('/api/stories/5/publish/');
    expect(result).toEqual({ id: 5, is_published: true });
  });

  it('unpublishStory POSTs to /api/stories/:id/unpublish/ and returns data', async () => {
    apiClient.post.mockResolvedValue({ data: { id: 5, is_published: false } });
    const result = await storyService.unpublishStory(5);
    expect(apiClient.post).toHaveBeenCalledWith('/api/stories/5/unpublish/');
    expect(result).toEqual({ id: 5, is_published: false });
  });

  it('publishStory propagates API errors', async () => {
    apiClient.post.mockRejectedValue(new Error('boom'));
    await expect(storyService.publishStory(5)).rejects.toThrow('boom');
  });

  it('unpublishStory propagates API errors', async () => {
    apiClient.post.mockRejectedValue(new Error('boom'));
    await expect(storyService.unpublishStory(5)).rejects.toThrow('boom');
  });
});

describe('updateStory — mock guard (#701)', () => {
  let updateStoryMock;
  let mockApi;
  const original = process.env.REACT_APP_USE_MOCK;
  beforeAll(() => {
    process.env.REACT_APP_USE_MOCK = 'true';
    jest.resetModules();
    jest.doMock('../services/api', () => ({
      apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
    }));
    ({ updateStory: updateStoryMock } = require('../services/storyService'));
    ({ apiClient: mockApi } = require('../services/api'));
  });
  afterAll(() => {
    process.env.REACT_APP_USE_MOCK = original;
    jest.dontMock('../services/api');
    jest.resetModules();
  });
  it('returns mock data without calling apiClient.patch when USE_MOCK=true', async () => {
    const result = await updateStoryMock(2, new FormData());
    expect(result).toEqual({ id: 2 });
    expect(mockApi.patch).not.toHaveBeenCalled();
  });
});

describe('fetchMyStories', () => {
  it('GETs /api/stories/?author=<id> and returns the list', async () => {
    apiClient.get.mockResolvedValue({ data: [{ id: 3, title: 'Mine' }] });
    const result = await fetchMyStories(42);
    expect(apiClient.get).toHaveBeenCalledWith('/api/stories/', { params: { author: 42 } });
    expect(result).toEqual([{ id: 3, title: 'Mine' }]);
  });

  it('unwraps paginated DRF responses', async () => {
    apiClient.get.mockResolvedValue({ data: { results: [{ id: 8 }] } });
    expect(await fetchMyStories(42)).toEqual([{ id: 8 }]);
  });
});
