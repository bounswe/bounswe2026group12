import { apiClient } from '../services/api';
import {
  fetchCulturalFacts,
  fetchRandomCulturalFact,
} from '../services/culturalFactService';

jest.mock('../services/api', () => ({
  apiClient: { get: jest.fn() },
}));

beforeEach(() => jest.clearAllMocks());

describe('fetchCulturalFacts', () => {
  it('calls GET /api/cultural-facts/ with no params when none given', async () => {
    apiClient.get.mockResolvedValue({ data: [] });
    await fetchCulturalFacts();
    expect(apiClient.get).toHaveBeenCalledWith('/api/cultural-facts/', { params: {} });
  });

  it('passes heritage_group and region filters as params', async () => {
    apiClient.get.mockResolvedValue({ data: [] });
    await fetchCulturalFacts({ heritageGroup: 5, region: 2 });
    expect(apiClient.get).toHaveBeenCalledWith('/api/cultural-facts/', {
      params: { heritage_group: 5, region: 2 },
    });
  });

  it('omits undefined / null filter values', async () => {
    apiClient.get.mockResolvedValue({ data: [] });
    await fetchCulturalFacts({ heritageGroup: 5, region: null });
    expect(apiClient.get).toHaveBeenCalledWith('/api/cultural-facts/', {
      params: { heritage_group: 5 },
    });
  });

  it('unwraps paginated DRF response', async () => {
    apiClient.get.mockResolvedValue({ data: { results: [{ id: 1 }] } });
    const result = await fetchCulturalFacts();
    expect(result).toEqual([{ id: 1 }]);
  });
});

describe('fetchRandomCulturalFact', () => {
  it('calls GET /api/cultural-facts/random/', async () => {
    apiClient.get.mockResolvedValue({ data: { id: 1, text: 'Hi' } });
    const result = await fetchRandomCulturalFact();
    expect(apiClient.get).toHaveBeenCalledWith('/api/cultural-facts/random/');
    expect(result.text).toBe('Hi');
  });

  it('returns null on 404 instead of throwing', async () => {
    apiClient.get.mockRejectedValue({ response: { status: 404 } });
    const result = await fetchRandomCulturalFact();
    expect(result).toBeNull();
  });

  it('propagates non-404 errors', async () => {
    apiClient.get.mockRejectedValue({ response: { status: 500 } });
    await expect(fetchRandomCulturalFact()).rejects.toEqual({ response: { status: 500 } });
  });
});
