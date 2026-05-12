import { apiClient } from '../services/api';
import {
  fetchRecipe,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  fetchIngredients,
  fetchUnits,
  submitIngredient,
  submitUnit,
  fetchRecipes,
  rateRecipe,
  unrateRecipe,
  toggleBookmark,
  fetchMyRecipes,
  fetchMyBookmarks,
} from '../services/recipeService';

jest.mock('../services/api', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
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

describe('deleteRecipe', () => {
  it('calls DELETE /api/recipes/:id/', async () => {
    apiClient.delete.mockResolvedValue({ status: 204 });
    await deleteRecipe(42);
    expect(apiClient.delete).toHaveBeenCalledWith('/api/recipes/42/');
  });

  it('propagates API errors to the caller', async () => {
    apiClient.delete.mockRejectedValue(new Error('Forbidden'));
    await expect(deleteRecipe(42)).rejects.toThrow('Forbidden');
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

describe('rateRecipe', () => {
  it('POSTs /api/recipes/:id/rate/ with { score } and returns the summary', async () => {
    apiClient.post.mockResolvedValue({ data: { average_rating: 4.5, rating_count: 2, user_rating: 5 } });
    const result = await rateRecipe(42, 5);
    expect(apiClient.post).toHaveBeenCalledWith('/api/recipes/42/rate/', { score: 5 });
    expect(result).toEqual({ average_rating: 4.5, rating_count: 2, user_rating: 5 });
  });

  it('propagates API errors', async () => {
    apiClient.post.mockRejectedValue(new Error('forbidden'));
    await expect(rateRecipe(1, 3)).rejects.toThrow('forbidden');
  });
});

describe('unrateRecipe', () => {
  it('DELETEs /api/recipes/:id/rate/ and returns the summary', async () => {
    apiClient.delete.mockResolvedValue({ data: { average_rating: null, rating_count: 0, user_rating: null } });
    const result = await unrateRecipe(42);
    expect(apiClient.delete).toHaveBeenCalledWith('/api/recipes/42/rate/');
    expect(result).toEqual({ average_rating: null, rating_count: 0, user_rating: null });
  });
});

describe('toggleBookmark', () => {
  it('POSTs /api/recipes/:id/bookmark/ and returns the toggle result', async () => {
    apiClient.post.mockResolvedValue({ data: { is_bookmarked: true, bookmark_count: 7 } });
    const result = await toggleBookmark(42);
    expect(apiClient.post).toHaveBeenCalledWith('/api/recipes/42/bookmark/');
    expect(result).toEqual({ is_bookmarked: true, bookmark_count: 7 });
  });

  it('propagates API errors', async () => {
    apiClient.post.mockRejectedValue(new Error('Server error'));
    await expect(toggleBookmark(1)).rejects.toThrow('Server error');
  });
});

describe('fetchMyRecipes', () => {
  it('GETs /api/recipes/?author=<id> and returns the list', async () => {
    apiClient.get.mockResolvedValue({ data: [{ id: 1, title: 'Mine' }] });
    const result = await fetchMyRecipes(42);
    expect(apiClient.get).toHaveBeenCalledWith('/api/recipes/', { params: { author: 42 } });
    expect(result).toEqual([{ id: 1, title: 'Mine' }]);
  });

  it('unwraps paginated DRF responses', async () => {
    apiClient.get.mockResolvedValue({ data: { results: [{ id: 7 }] } });
    expect(await fetchMyRecipes(42)).toEqual([{ id: 7 }]);
  });
});

describe('fetchMyBookmarks', () => {
  it('GETs /api/recipes/?bookmarked=true and returns the list', async () => {
    apiClient.get.mockResolvedValue({ data: [{ id: 9, title: 'Saved' }] });
    const result = await fetchMyBookmarks();
    expect(apiClient.get).toHaveBeenCalledWith('/api/recipes/', { params: { bookmarked: 'true' } });
    expect(result).toEqual([{ id: 9, title: 'Saved' }]);
  });

  it('unwraps paginated DRF responses', async () => {
    apiClient.get.mockResolvedValue({ data: { results: [{ id: 10 }] } });
    expect(await fetchMyBookmarks()).toEqual([{ id: 10 }]);
  });
});
