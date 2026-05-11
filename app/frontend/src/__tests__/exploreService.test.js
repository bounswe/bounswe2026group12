import { apiClient } from '../services/api';
import { fetchExploreEvents, fetchEventDetail } from '../services/exploreService';

jest.mock('../services/api', () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

beforeEach(() => jest.clearAllMocks());

describe('fetchExploreEvents', () => {
  it('GETs /api/recommendations/ with surface=explore and groups by type', async () => {
    apiClient.get.mockResolvedValue({
      data: {
        results: [
          { id: 1, type: 'recipe', title: 'R' },
          { id: 2, type: 'story', title: 'S' },
        ],
      },
    });
    const result = await fetchExploreEvents();
    expect(apiClient.get).toHaveBeenCalledWith('/api/recommendations/', {
      params: { surface: 'explore', limit: 20 },
    });
    expect(result).toEqual([
      { id: 'recipes', name: 'Recipes', emoji: '🍽️', featured: [{ id: 1, type: 'recipe', title: 'R' }] },
      { id: 'stories', name: 'Stories', emoji: '📖', featured: [{ id: 2, type: 'story', title: 'S' }] },
    ]);
  });

  it('returns a Discover fallback when no recipes or stories are present', async () => {
    apiClient.get.mockResolvedValue({
      data: { results: [{ id: 3, type: 'other' }] },
    });
    const result = await fetchExploreEvents();
    expect(result).toEqual([
      { id: 'explore', name: 'Discover', emoji: '✨', featured: [{ id: 3, type: 'other' }] },
    ]);
  });
});

describe('fetchEventDetail', () => {
  it('returns the recipes bucket for id=recipes', async () => {
    apiClient.get.mockResolvedValue({
      data: {
        results: [
          { id: 1, type: 'recipe' },
          { id: 2, type: 'story' },
        ],
      },
    });
    const result = await fetchEventDetail('recipes');
    expect(apiClient.get).toHaveBeenCalledWith('/api/recommendations/', {
      params: { surface: 'explore', limit: 50 },
    });
    expect(result).toEqual({
      id: 'recipes',
      name: 'Recipes',
      emoji: '🍽️',
      featured: [{ id: 1, type: 'recipe' }],
    });
  });

  it('returns the stories bucket for id=stories', async () => {
    apiClient.get.mockResolvedValue({
      data: { results: [{ id: 2, type: 'story' }] },
    });
    const result = await fetchEventDetail('stories');
    expect(result.id).toBe('stories');
    expect(result.featured).toEqual([{ id: 2, type: 'story' }]);
  });

  it('returns the Discover bucket for an unknown id', async () => {
    apiClient.get.mockResolvedValue({
      data: { results: [{ id: 4, type: 'other' }] },
    });
    const result = await fetchEventDetail('foobar');
    expect(result).toEqual({
      id: 'explore',
      name: 'Discover',
      emoji: '✨',
      featured: [{ id: 4, type: 'other' }],
    });
  });

  it('propagates API errors to the caller', async () => {
    apiClient.get.mockRejectedValue(new Error('boom'));
    await expect(fetchEventDetail('recipes')).rejects.toThrow('boom');
  });
});
