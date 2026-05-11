import { apiClient } from '../services/api';
import { fetchMapRegions, fetchMapRegionContent } from '../services/mapService';

jest.mock('../services/api', () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

beforeEach(() => jest.clearAllMocks());

describe('fetchMapRegions', () => {
  it('GETs /api/map/regions/ and returns data', async () => {
    apiClient.get.mockResolvedValue({ data: [{ id: 'tr', name: 'Türkiye' }] });
    const result = await fetchMapRegions();
    expect(apiClient.get).toHaveBeenCalledWith('/api/map/regions/');
    expect(result).toEqual([{ id: 'tr', name: 'Türkiye' }]);
  });

  it('propagates API errors to the caller', async () => {
    apiClient.get.mockRejectedValue(new Error('boom'));
    await expect(fetchMapRegions()).rejects.toThrow('boom');
  });
});

describe('fetchMapRegionContent', () => {
  it('GETs /api/map/regions/:id/content/ and returns response.data.results when paginated', async () => {
    apiClient.get.mockResolvedValue({
      data: { results: [{ id: 1, title: 'Item' }], next: null },
    });
    const result = await fetchMapRegionContent('tr');
    expect(apiClient.get).toHaveBeenCalledWith('/api/map/regions/tr/content/');
    expect(result).toEqual([{ id: 1, title: 'Item' }]);
  });

  it('falls back to response.data when results is absent', async () => {
    apiClient.get.mockResolvedValue({ data: [{ id: 2 }] });
    const result = await fetchMapRegionContent('jp');
    expect(result).toEqual([{ id: 2 }]);
  });
});
