import { apiClient } from '../services/api';
import {
  fetchRecipe,
  createRecipe,
  updateRecipe,
  fetchIngredients,
  fetchUnits,
  submitIngredient,
  submitUnit,
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
});

describe('createRecipe', () => {
  it('calls POST /api/recipes/ with FormData', async () => {
    const formData = new FormData();
    apiClient.post.mockResolvedValue({ data: { id: 2 } });
    const result = await createRecipe(formData);
    expect(apiClient.post).toHaveBeenCalledWith('/api/recipes/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    expect(result.id).toBe(2);
  });
});

describe('updateRecipe', () => {
  it('calls PATCH /api/recipes/:id/ with FormData', async () => {
    const formData = new FormData();
    apiClient.patch.mockResolvedValue({ data: { id: 1 } });
    const result = await updateRecipe(1, formData);
    expect(apiClient.patch).toHaveBeenCalledWith('/api/recipes/1/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
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
});

describe('submitUnit', () => {
  it('calls POST /api/units/ with name', async () => {
    apiClient.post.mockResolvedValue({ data: { id: 3, name: 'pinch' } });
    const result = await submitUnit('pinch');
    expect(apiClient.post).toHaveBeenCalledWith('/api/units/', { name: 'pinch' });
    expect(result.name).toBe('pinch');
  });
});
