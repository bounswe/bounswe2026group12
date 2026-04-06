import { fetchStory, createStory } from '../services/storyService';
import { apiClient } from '../services/api';

jest.mock('../services/api', () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
}));

beforeEach(() => jest.clearAllMocks());

describe('fetchStory', () => {
  it('calls GET /api/stories/:id/ and returns data', async () => {
    apiClient.get.mockResolvedValue({ data: { id: 1, title: 'My Story' } });
    const result = await fetchStory(1);
    expect(apiClient.get).toHaveBeenCalledWith('/api/stories/1/');
    expect(result).toEqual({ id: 1, title: 'My Story' });
  });

  it('propagates API errors', async () => {
    apiClient.get.mockRejectedValue(new Error('Not found'));
    await expect(fetchStory(99)).rejects.toThrow('Not found');
  });
});

describe('createStory', () => {
  it('calls POST /api/stories/ with story data', async () => {
    apiClient.post.mockResolvedValue({ data: { id: 2, title: 'New Story' } });
    const payload = { title: 'New Story', body: 'text', language: 'en', linked_recipe: null };
    const result = await createStory(payload);
    expect(apiClient.post).toHaveBeenCalledWith('/api/stories/', payload);
    expect(result).toEqual({ id: 2, title: 'New Story' });
  });

  it('includes linked_recipe id when provided', async () => {
    apiClient.post.mockResolvedValue({ data: { id: 3 } });
    await createStory({ title: 'T', body: 'B', language: 'en', linked_recipe: 5 });
    expect(apiClient.post).toHaveBeenCalledWith('/api/stories/', {
      title: 'T', body: 'B', language: 'en', linked_recipe: 5,
    });
  });
});
