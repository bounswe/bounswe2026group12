import { search, fetchRegions } from '../services/searchService';
import { apiClient } from '../services/api';

jest.mock('../services/api', () => ({
  apiClient: { get: jest.fn() },
}));

beforeEach(() => jest.clearAllMocks());

describe('search', () => {
  it('calls GET /api/search/ with all params', async () => {
    apiClient.get.mockResolvedValue({ data: [] });
    await search('baklava', 'Aegean', 'en', {
      diet: 'Vegan',
      diet_exclude: 'Halal',
      event: 'Wedding',
      event_exclude: 'Ramadan',
      ingredient: 'Tomato',
      ingredient_exclude: 'Onion',
    });
    expect(apiClient.get).toHaveBeenCalledWith('/api/search/', {
      params: {
        q: 'baklava',
        region: 'Aegean',
        language: 'en',
        diet: 'Vegan',
        diet_exclude: 'Halal',
        event: 'Wedding',
        event_exclude: 'Ramadan',
        ingredient: 'Tomato',
        ingredient_exclude: 'Onion',
      },
    });
  });

  it('omits region and language from params when not provided', async () => {
    apiClient.get.mockResolvedValue({ data: [] });
    await search('soup', '', '');
    expect(apiClient.get).toHaveBeenCalledWith('/api/search/', {
      params: { q: 'soup' },
    });
  });

  it('normalizes and merges recipes and stories from the response', async () => {
    const apiResponse = {
      recipes: [{ result_type: 'recipe', id: 1, title: 'Baklava', region_tag: 'Aegean', image: '/img.jpg' }],
      stories: [{ result_type: 'story', id: 2, title: 'Kitchen tales', region_tag: null }],
      total_count: 2,
    };
    apiClient.get.mockResolvedValue({ data: apiResponse });
    const result = await search('baklava', '', '');
    expect(result).toEqual([
      { type: 'recipe', id: 1, title: 'Baklava', region: 'Aegean', thumbnail: '/img.jpg', rankScore: 0, rankReason: null },
      { type: 'story', id: 2, title: 'Kitchen tales', region: null, thumbnail: null, rankScore: 0, rankReason: null },
    ]);
  });

  it('uses ranked unified results when backend returns results[]', async () => {
    apiClient.get.mockResolvedValue({
      data: {
        results: [
          { type: 'recipe', id: 7, title: 'Ranked Recipe', region_tag: 'Aegean', rank_score: 3, rank_reason: 'regional_match' },
        ],
      },
    });
    const result = await search('recipe', '', '');
    expect(result).toEqual([
      { type: 'recipe', id: 7, title: 'Ranked Recipe', region: 'Aegean', thumbnail: null, rankScore: 3, rankReason: 'regional_match' },
    ]);
  });

  it('propagates API errors', async () => {
    apiClient.get.mockRejectedValue(new Error('Network Error'));
    await expect(search('x', '', '')).rejects.toThrow('Network Error');
  });
});

describe('fetchRegions', () => {
  it('calls GET /api/regions/ and returns data', async () => {
    apiClient.get.mockResolvedValue({ data: [{ id: 1, name: 'Aegean' }] });
    const result = await fetchRegions();
    expect(apiClient.get).toHaveBeenCalledWith('/api/regions/');
    expect(result).toEqual([{ id: 1, name: 'Aegean' }]);
  });

  it('propagates API errors', async () => {
    apiClient.get.mockRejectedValue(new Error('Server Error'));
    await expect(fetchRegions()).rejects.toThrow('Server Error');
  });
});
