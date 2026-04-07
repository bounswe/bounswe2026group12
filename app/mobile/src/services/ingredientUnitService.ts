import type { CatalogItem } from '../types/catalog';
import { apiGetJson, apiPostJson } from './httpClient';

/**
 * Same endpoints as web `recipeService.js` (`/api/ingredients/`, `/api/units/`).
 */

export async function fetchIngredients(): Promise<CatalogItem[]> {
  return apiGetJson<CatalogItem[]>('/api/ingredients/');
}

export async function fetchUnits(): Promise<CatalogItem[]> {
  return apiGetJson<CatalogItem[]>('/api/units/');
}

export async function submitIngredient(name: string): Promise<CatalogItem> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Name is required');
  return apiPostJson<CatalogItem>('/api/ingredients/', { name: trimmed });
}

export async function submitUnit(name: string): Promise<CatalogItem> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Name is required');
  return apiPostJson<CatalogItem>('/api/units/', { name: trimmed });
}
