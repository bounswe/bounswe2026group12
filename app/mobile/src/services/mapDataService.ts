import { apiGetJson } from './httpClient';
import { coordsForRegion, type LatLng } from '../utils/regionGeo';

export type RegionPin = {
  id: number;
  name: string;
  coords: LatLng;
  recipeCount: number;
};

type RawRegion = { id: number | string; name: string };

function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && Array.isArray((data as { results?: unknown }).results)) {
    return (data as { results: T[] }).results;
  }
  return [];
}

async function countRecipesForRegion(name: string): Promise<number> {
  try {
    const params = new URLSearchParams({ region: name });
    const data = await apiGetJson<unknown>(`/api/recipes/?${params.toString()}`);
    const list = unwrapList<unknown>(data);
    return list.length;
  } catch {
    return 0;
  }
}

/**
 * Returns only regions we know how to plot. Unknown ones are dropped — they'll
 * surface again when `regionGeo.COORDS` learns their coordinates (or when the
 * backend exposes lat/lng directly).
 */
export async function fetchRegionPins(): Promise<RegionPin[]> {
  const data = await apiGetJson<unknown>('/api/regions/');
  const regions = unwrapList<RawRegion>(data);

  const plottable = regions
    .map((r) => {
      const coords = coordsForRegion(r.name);
      if (!coords) return null;
      return { id: Number(r.id), name: r.name, coords };
    })
    .filter((r): r is { id: number; name: string; coords: LatLng } => r !== null);

  const counts = await Promise.all(plottable.map((r) => countRecipesForRegion(r.name)));
  return plottable.map((r, idx) => ({ ...r, recipeCount: counts[idx] }));
}
