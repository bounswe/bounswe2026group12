import { apiClient } from '../services/api';
import { fetchCulturalEvents } from '../services/culturalEventService';

jest.mock('../services/api', () => ({
  apiClient: { get: jest.fn() },
}));

beforeEach(() => jest.clearAllMocks());

describe('fetchCulturalEvents', () => {
  it('calls GET /api/cultural-events/ with no params when none given', async () => {
    apiClient.get.mockResolvedValue({ data: [] });
    await fetchCulturalEvents();
    expect(apiClient.get).toHaveBeenCalledWith('/api/cultural-events/', { params: {} });
  });

  it('formats numeric month as a zero-padded two-digit string', async () => {
    apiClient.get.mockResolvedValue({ data: [] });
    await fetchCulturalEvents({ month: 3 });
    expect(apiClient.get).toHaveBeenCalledWith('/api/cultural-events/', { params: { month: '03' } });
  });

  it('passes month and region together', async () => {
    apiClient.get.mockResolvedValue({ data: [] });
    await fetchCulturalEvents({ month: 11, region: 4 });
    expect(apiClient.get).toHaveBeenCalledWith('/api/cultural-events/', {
      params: { month: '11', region: 4 },
    });
  });

  it('omits undefined month and region', async () => {
    apiClient.get.mockResolvedValue({ data: [] });
    await fetchCulturalEvents({ month: undefined, region: undefined });
    expect(apiClient.get).toHaveBeenCalledWith('/api/cultural-events/', { params: {} });
  });

  it('unwraps paginated DRF response', async () => {
    apiClient.get.mockResolvedValue({ data: { results: [{ id: 1 }] } });
    const result = await fetchCulturalEvents();
    expect(result).toEqual([{ id: 1 }]);
  });

  it('propagates errors', async () => {
    apiClient.get.mockRejectedValue(new Error('fail'));
    await expect(fetchCulturalEvents()).rejects.toThrow('fail');
  });
});
