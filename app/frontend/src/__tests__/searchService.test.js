import { search, fetchRegions } from '../services/searchService';
import { apiClient } from '../services/api';

jest.mock('../services/api', () => ({
  apiClient: { get: jest.fn() },
}));

beforeEach(() => jest.clearAllMocks());

describe('search', () => {
  it('calls GET /api/search/ with all params', async () => {
    apiClient.get.mockResolvedValue({ data: [] });
    await search('baklava', 'Aegean', 'en');
    expect(apiClient.get).toHaveBeenCalledWith('/api/search/', {
      params: { q: 'baklava', region: 'Aegean', language: 'en' },
    });
  });

  it('omits region and language from params when not provided', async () => {
    apiClient.get.mockResolvedValue({ data: [] });
    await search('soup', '', '');
    expect(apiClient.get).toHaveBeenCalledWith('/api/search/', {
      params: { q: 'soup' },
    });
  });

  it('returns the data array from the response', async () => {
    const results = [{ type: 'recipe', id: 1, title: 'Baklava' }];
    apiClient.get.mockResolvedValue({ data: results });
    const result = await search('baklava', '', '');
    expect(result).toEqual(results);
  });

  it('propagates API errors', async () => {
    apiClient.get.mockRejectedValue(new Error('Network Error'));
    await expect(search('x', '', '')).rejects.toThrow('Network Error');
  });
});

describe('fetchRegions', () => {
  it('calls GET /api/regions/ and returns data', async () => {
    apiClient.get.mockResolvedValue({ data: [{ regionId: 1, name: 'Aegean' }] });
    const result = await fetchRegions();
    expect(apiClient.get).toHaveBeenCalledWith('/api/regions/');
    expect(result).toEqual([{ regionId: 1, name: 'Aegean' }]);
  });

  it('propagates API errors', async () => {
    apiClient.get.mockRejectedValue(new Error('Server Error'));
    await expect(fetchRegions()).rejects.toThrow('Server Error');
  });
});
