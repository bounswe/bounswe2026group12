import { apiClient } from '../services/api';
import { fetchSubstitutes } from '../services/ingredientService';

jest.mock('../services/api', () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

beforeEach(() => jest.clearAllMocks());

describe('fetchSubstitutes', () => {
  it('flattens the grouped backend response and tags each item match_type with its group', async () => {
    apiClient.get.mockResolvedValue({
      data: {
        ingredient: [{ id: 1, name: 'Yufka' }],
        flavor: [{ id: 2, name: 'Filo' }],
        texture: [],
        chemical: [],
      },
    });
    const result = await fetchSubstitutes(7, 'Phyllo');
    expect(apiClient.get).toHaveBeenCalledWith('/api/ingredients/7/substitutes/');
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
    const yufka = result.find((r) => r.name === 'Yufka');
    const filo = result.find((r) => r.name === 'Filo');
    expect(yufka).toEqual({ id: 1, name: 'Yufka', match_type: 'ingredient' });
    expect(filo).toEqual({ id: 2, name: 'Filo', match_type: 'flavor' });
  });

  it('returns a legacy array response unchanged', async () => {
    const legacy = [{ id: 1, name: 'Honey', match_type: 'flavor' }];
    apiClient.get.mockResolvedValue({ data: legacy });
    const result = await fetchSubstitutes(7, 'Sugar');
    expect(result).toBe(legacy);
  });

  it('propagates API errors to the caller', async () => {
    apiClient.get.mockRejectedValue(new Error('Not Found'));
    await expect(fetchSubstitutes(99, 'Foo')).rejects.toThrow('Not Found');
  });
});
