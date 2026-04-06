import type { CatalogItem } from '../types/catalog';
import {
  getMockIngredients,
  getMockUnits,
  mockCreateIngredient,
  mockCreateUnit,
} from '../mocks/catalogStore';
import { apiGetJson, apiPostJson } from './httpClient';

/**
 * Same endpoints as web `recipeService.js` (`/api/ingredients/`, `/api/units/`).
 * Falls back to in-memory mocks when the server is unavailable.
 */

export async function fetchIngredients(): Promise<CatalogItem[]> {
  try {
    return await apiGetJson<CatalogItem[]>('/api/ingredients/');
  } catch {
    return getMockIngredients();
  }
}

export async function fetchUnits(): Promise<CatalogItem[]> {
  try {
    return await apiGetJson<CatalogItem[]>('/api/units/');
  } catch {
    return getMockUnits();
  }
}

export async function submitIngredient(name: string): Promise<CatalogItem> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Name is required');
  try {
    return await apiPostJson<CatalogItem>('/api/ingredients/', { name: trimmed });
  } catch {
    return mockCreateIngredient(trimmed);
  }
}

export async function submitUnit(name: string): Promise<CatalogItem> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Name is required');
  try {
    return await apiPostJson<CatalogItem>('/api/units/', { name: trimmed });
  } catch {
    return mockCreateUnit(trimmed);
  }
}
