import { apiClient } from '../services/api';
import { fetchHeritageGroups, fetchHeritageGroup } from '../services/heritageService';

jest.mock('../services/api', () => ({
  apiClient: { get: jest.fn() },
}));

beforeEach(() => jest.clearAllMocks());

describe('fetchHeritageGroups', () => {
  it('calls GET /api/heritage-groups/', async () => {
    apiClient.get.mockResolvedValue({ data: [{ id: 1, name: 'Sarma', member_count: 3 }] });
    const result = await fetchHeritageGroups();
    expect(apiClient.get).toHaveBeenCalledWith('/api/heritage-groups/');
    expect(result).toEqual([{ id: 1, name: 'Sarma', member_count: 3 }]);
  });

  it('unwraps a paginated DRF response', async () => {
    apiClient.get.mockResolvedValue({ data: { results: [{ id: 2 }] } });
    const result = await fetchHeritageGroups();
    expect(result).toEqual([{ id: 2 }]);
  });

  it('propagates API errors to the caller', async () => {
    apiClient.get.mockRejectedValue(new Error('Network Error'));
    await expect(fetchHeritageGroups()).rejects.toThrow('Network Error');
  });
});

describe('fetchHeritageGroup', () => {
  it('calls GET /api/heritage-groups/:id/', async () => {
    apiClient.get.mockResolvedValue({
      data: { id: 1, name: 'Sarma', description: '', members: [], journey_steps: [] },
    });
    const result = await fetchHeritageGroup(1);
    expect(apiClient.get).toHaveBeenCalledWith('/api/heritage-groups/1/');
    expect(result.name).toBe('Sarma');
  });

  it('propagates API errors to the caller', async () => {
    apiClient.get.mockRejectedValue(new Error('404'));
    await expect(fetchHeritageGroup(99)).rejects.toThrow('404');
  });
});
