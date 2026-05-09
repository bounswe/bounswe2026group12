import { apiClient } from '../services/api';
import {
  fetchRecipe,
  createRecipe,
  updateRecipe,
  fetchIngredients,
  fetchUnits,
  submitIngredient,
  submitUnit,
  fetchRecipes,
} from '../services/recipeService';

jest.mock('../services/api', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
  },
}));

beforeEach(() => jest.clearAllMocks());

describe('fetchRecipe', () => {
  it('calls GET /api/recipes/:id/', async () => {
    apiClient.get.mockResolvedValue({ data: { id: 1, title: 'Test' } });
    const result = await fetchRecipe(1);
    expect(apiClient.get).toHaveBeenCalledWith('/api/recipes/1/');
    expect(result.title).toBe('Test');
  });

  it('propagates API errors to the caller', async () => {
    apiClient.get.mockRejectedValue(new Error('Network Error'));
    await expect(fetchRecipe(1)).rejects.toThrow('Network Error');
  });
});

describe('createRecipe', () => {
  it('calls POST /api/recipes/ with FormData', async () => {
    const formData = new FormData();
    apiClient.post.mockResolvedValue({ data: { id: 2 } });
    const result = await createRecipe(formData);
    expect(apiClient.post).toHaveBeenCalledWith('/api/recipes/', formData);
    expect(result.id).toBe(2);
  });

  it('propagates API errors to the caller', async () => {
    apiClient.post.mockRejectedValue(new Error('Server Error'));
    await expect(createRecipe(new FormData())).rejects.toThrow('Server Error');
  });
});

describe('updateRecipe', () => {
  it('calls PATCH /api/recipes/:id/ with FormData', async () => {
    const formData = new FormData();
    apiClient.patch.mockResolvedValue({ data: { id: 1 } });
    const result = await updateRecipe(1, formData);
    expect(apiClient.patch).toHaveBeenCalledWith('/api/recipes/1/', formData);
    expect(result.id).toBe(1);
  });
});

describe('fetchIngredients', () => {
  it('calls GET /api/ingredients/', async () => {
    apiClient.get.mockResolvedValue({ data: [{ id: 1, name: 'Salt' }] });
    const result = await fetchIngredients();
    expect(apiClient.get).toHaveBeenCalledWith('/api/ingredients/');
    expect(result[0].name).toBe('Salt');
  });
});

describe('fetchUnits', () => {
  it('calls GET /api/units/', async () => {
    apiClient.get.mockResolvedValue({ data: [{ id: 1, name: 'cup' }] });
    const result = await fetchUnits();
    expect(apiClient.get).toHaveBeenCalledWith('/api/units/');
    expect(result[0].name).toBe('cup');
  });
});

describe('submitIngredient', () => {
  it('calls POST /api/ingredients/ with name', async () => {
    apiClient.post.mockResolvedValue({ data: { id: 5, name: 'Turmeric' } });
    const result = await submitIngredient('Turmeric');
    expect(apiClient.post).toHaveBeenCalledWith('/api/ingredients/', { name: 'Turmeric' });
    expect(result.name).toBe('Turmeric');
  });

  it('propagates API errors to the caller', async () => {
    apiClient.post.mockRejectedValue(new Error('Bad Request'));
    await expect(submitIngredient('test')).rejects.toThrow('Bad Request');
  });
});

describe('submitUnit', () => {
  it('calls POST /api/units/ with name', async () => {
    apiClient.post.mockResolvedValue({ data: { id: 3, name: 'pinch' } });
    const result = await submitUnit('pinch');
    expect(apiClient.post).toHaveBeenCalledWith('/api/units/', { name: 'pinch' });
    expect(result.name).toBe('pinch');
  });
});

describe('fetchRecipes', () => {
  it('calls GET /api/recipes/ and returns data', async () => {
    apiClient.get.mockResolvedValue({ data: [{ id: 1, title: 'Baklava' }] });
    const result = await fetchRecipes();
    expect(apiClient.get).toHaveBeenCalledWith('/api/recipes/');
    expect(result).toEqual([{ id: 1, title: 'Baklava' }]);
  });
});

describe('fetchIngredients — promise cache', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('calls GET /api/ingredients/ only once on repeated calls', async () => {
    jest.doMock('../services/api', () => ({
      apiClient: { get: jest.fn().mockResolvedValue({ data: [{ id: 1, name: 'Salt' }] }) },
    }));
    const { fetchIngredients } = require('../services/recipeService');
    await fetchIngredients();
    await fetchIngredients();
    const { apiClient } = require('../services/api');
    expect(apiClient.get).toHaveBeenCalledTimes(1);
  });

  it('returns the same data on repeated calls', async () => {
    jest.doMock('../services/api', () => ({
      apiClient: { get: jest.fn().mockResolvedValue({ data: [{ id: 2, name: 'Pepper' }] }) },
    }));
    const { fetchIngredients } = require('../services/recipeService');
    const first = await fetchIngredients();
    const second = await fetchIngredients();
    expect(first).toEqual(second);
  });

  it('fires only one request when called concurrently', async () => {
    jest.doMock('../services/api', () => ({
      apiClient: { get: jest.fn().mockResolvedValue({ data: [{ id: 1, name: 'Salt' }] }) },
    }));
    const { fetchIngredients } = require('../services/recipeService');
    const [a, b] = await Promise.all([fetchIngredients(), fetchIngredients()]);
    const { apiClient } = require('../services/api');
    expect(apiClient.get).toHaveBeenCalledTimes(1);
    expect(a).toEqual(b);
  });

  it('retries after a fetch error', async () => {
    let calls = 0;
    jest.doMock('../services/api', () => ({
      apiClient: {
        get: jest.fn().mockImplementation(() => {
          calls += 1;
          if (calls === 1) return Promise.reject(new Error('Network Error'));
          return Promise.resolve({ data: [{ id: 1, name: 'Salt' }] });
        }),
      },
    }));
    const { fetchIngredients } = require('../services/recipeService');
    await expect(fetchIngredients()).rejects.toThrow('Network Error');
    const result = await fetchIngredients();
    expect(result[0].name).toBe('Salt');
    expect(calls).toBe(2);
  });
});

describe('fetchUnits — promise cache', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('calls GET /api/units/ only once on repeated calls', async () => {
    jest.doMock('../services/api', () => ({
      apiClient: { get: jest.fn().mockResolvedValue({ data: [{ id: 1, name: 'cup' }] }) },
    }));
    const { fetchUnits } = require('../services/recipeService');
    await fetchUnits();
    await fetchUnits();
    const { apiClient } = require('../services/api');
    expect(apiClient.get).toHaveBeenCalledTimes(1);
  });

  it('returns the same data on repeated calls', async () => {
    jest.doMock('../services/api', () => ({
      apiClient: { get: jest.fn().mockResolvedValue({ data: [{ id: 3, name: 'tbsp' }] }) },
    }));
    const { fetchUnits } = require('../services/recipeService');
    const first = await fetchUnits();
    const second = await fetchUnits();
    expect(first).toEqual(second);
  });

  it('fires only one request when called concurrently', async () => {
    jest.doMock('../services/api', () => ({
      apiClient: { get: jest.fn().mockResolvedValue({ data: [{ id: 1, name: 'cup' }] }) },
    }));
    const { fetchUnits } = require('../services/recipeService');
    const [a, b] = await Promise.all([fetchUnits(), fetchUnits()]);
    const { apiClient } = require('../services/api');
    expect(apiClient.get).toHaveBeenCalledTimes(1);
    expect(a).toEqual(b);
  });

  it('retries after a fetch error', async () => {
    let calls = 0;
    jest.doMock('../services/api', () => ({
      apiClient: {
        get: jest.fn().mockImplementation(() => {
          calls += 1;
          if (calls === 1) return Promise.reject(new Error('Network Error'));
          return Promise.resolve({ data: [{ id: 1, name: 'g' }] });
        }),
      },
    }));
    const { fetchUnits } = require('../services/recipeService');
    await expect(fetchUnits()).rejects.toThrow('Network Error');
    const result = await fetchUnits();
    expect(result[0].name).toBe('g');
    expect(calls).toBe(2);
  });
});
