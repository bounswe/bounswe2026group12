import { apiClient } from '../services/api';
import { fetchSubstitutes } from '../services/ingredientService';

jest.mock('../services/api', () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

beforeEach(() => jest.clearAllMocks());

describe('fetchSubstitutes', () => {
  it('GETs /api/ingredients/:id/substitutes/ and returns data', async () => {
    apiClient.get.mockResolvedValue({ data: [{ id: 1, name: 'Honey' }] });
    const result = await fetchSubstitutes(7, 'Sugar');
    expect(apiClient.get).toHaveBeenCalledWith('/api/ingredients/7/substitutes/');
    expect(result).toEqual([{ id: 1, name: 'Honey' }]);
  });

  it('propagates API errors to the caller', async () => {
    apiClient.get.mockRejectedValue(new Error('Not Found'));
    await expect(fetchSubstitutes(99, 'Foo')).rejects.toThrow('Not Found');
  });
});
