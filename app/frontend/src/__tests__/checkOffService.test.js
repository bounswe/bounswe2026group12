import { apiClient } from '../services/api';

jest.mock('../services/api', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

describe('checkOffService', () => {
  beforeEach(() => {
    apiClient.get.mockReset();
    apiClient.post.mockReset();
  });

  it('fetchCheckedIngredients GETs the canonical list', async () => {
    apiClient.get.mockResolvedValue({ data: [1, 4, 7] });
    const { fetchCheckedIngredients } = require('../services/checkOffService');
    const result = await fetchCheckedIngredients(42);
    expect(apiClient.get).toHaveBeenCalledWith('/api/recipes/42/checked-ingredients/');
    expect(result).toEqual([1, 4, 7]);
  });

  it('toggleCheckedIngredient POSTs {ingredient_id, checked} and returns the canonical list', async () => {
    apiClient.post.mockResolvedValue({ data: [1, 7] });
    const { toggleCheckedIngredient } = require('../services/checkOffService');
    const result = await toggleCheckedIngredient(42, 4, false);
    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/recipes/42/checked-ingredients/',
      { ingredient_id: 4, checked: false },
    );
    expect(result).toEqual([1, 7]);
  });

  it('propagates errors from the underlying request', async () => {
    apiClient.get.mockRejectedValue(new Error('boom'));
    const { fetchCheckedIngredients } = require('../services/checkOffService');
    await expect(fetchCheckedIngredients(1)).rejects.toThrow('boom');
  });
});
