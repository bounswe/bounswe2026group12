import { apiClient } from '../services/api';
import { fetchExploreEvents, fetchEventDetail } from '../services/exploreService';

jest.mock('../services/api', () => ({
  apiClient: { get: jest.fn() },
}));

beforeEach(() => jest.clearAllMocks());

describe('fetchExploreEvents', () => {
  it('GETs /api/recommendations/ with surface=explore', async () => {
    apiClient.get.mockResolvedValue({ data: { results: [] } });
    await fetchExploreEvents();
    expect(apiClient.get).toHaveBeenCalledWith('/api/recommendations/', {
      params: { surface: 'explore', limit: 30 },
    });
  });

  it('groups results into a featured rail + region rails when multiple regions are present', async () => {
    apiClient.get.mockResolvedValue({
      data: {
        results: [
          { id: 1, result_type: 'recipe', title: 'A', region_tag: 'Aegean', rank_score: 9 },
          { id: 2, result_type: 'story',  title: 'B', region_tag: 'Marmara', rank_score: 5 },
          { id: 3, result_type: 'recipe', title: 'C', region_tag: 'Aegean', rank_score: 3 },
        ],
      },
    });
    const rails = await fetchExploreEvents();
    expect(rails.map((r) => r.id)).toEqual(['featured', 'region-aegean', 'region-marmara']);
    expect(rails[0].featuredRail).toBe(true);
    expect(rails[1].name).toBe('Aegean');
    expect(rails[1].featured).toHaveLength(2);
    expect(rails[1].featured[0].type).toBe('recipe');
    expect(rails[1].featured[0].region).toBe('Aegean');
  });

  it('caps duplicate authors within a rail at the configured limit', async () => {
    apiClient.get.mockResolvedValue({
      data: {
        results: [
          { id: 1, result_type: 'recipe', region_tag: 'Aegean', author_username: 'a' },
          { id: 2, result_type: 'recipe', region_tag: 'Aegean', author_username: 'a' },
          { id: 3, result_type: 'recipe', region_tag: 'Aegean', author_username: 'a' },
          { id: 4, result_type: 'recipe', region_tag: 'Marmara', author_username: 'b' },
        ],
      },
    });
    const rails = await fetchExploreEvents();
    const aegean = rails.find((r) => r.id === 'region-aegean');
    expect(aegean.featured).toHaveLength(2);
    expect(aegean.featured.every((i) => i.author_username === 'a')).toBe(true);
  });

  it('falls back to type-based rails when no regions are present', async () => {
    apiClient.get.mockResolvedValue({
      data: {
        results: [
          { id: 1, result_type: 'recipe', title: 'R' },
          { id: 2, result_type: 'story',  title: 'S' },
        ],
      },
    });
    const rails = await fetchExploreEvents();
    expect(rails.map((r) => r.id)).toEqual(['featured', 'recipes', 'stories']);
    expect(rails[1].showRegionBadge).toBe(true);
  });

  it('returns an empty list when results are empty', async () => {
    apiClient.get.mockResolvedValue({ data: { results: [] } });
    expect(await fetchExploreEvents()).toEqual([]);
  });
});

describe('fetchEventDetail', () => {
  it('returns the matching region rail by id', async () => {
    apiClient.get.mockResolvedValue({
      data: {
        results: [
          { id: 1, result_type: 'recipe', region_tag: 'Aegean' },
          { id: 2, result_type: 'story',  region_tag: 'Marmara' },
        ],
      },
    });
    const event = await fetchEventDetail('region-aegean');
    expect(apiClient.get).toHaveBeenCalledWith('/api/recommendations/', {
      params: { surface: 'explore', limit: 50 },
    });
    expect(event.id).toBe('region-aegean');
    expect(event.featured[0].region).toBe('Aegean');
  });

  it('returns the legacy recipes bucket for id=recipes', async () => {
    apiClient.get.mockResolvedValue({
      data: {
        results: [
          { id: 1, result_type: 'recipe' },
          { id: 2, result_type: 'story' },
        ],
      },
    });
    const result = await fetchEventDetail('recipes');
    expect(result.id).toBe('recipes');
    expect(result.featured).toEqual([expect.objectContaining({ id: 1, type: 'recipe' })]);
  });

  it('returns the Discover bucket for an unknown id', async () => {
    apiClient.get.mockResolvedValue({
      data: { results: [{ id: 4, result_type: 'other' }] },
    });
    const result = await fetchEventDetail('foobar');
    expect(result.id).toBe('explore');
    expect(result.featured).toEqual([expect.objectContaining({ id: 4 })]);
  });

  it('propagates API errors to the caller', async () => {
    apiClient.get.mockRejectedValue(new Error('boom'));
    await expect(fetchEventDetail('recipes')).rejects.toThrow('boom');
  });
});
