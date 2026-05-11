import { apiGetJson } from './httpClient';
import { coordsForRegion, type LatLng } from '../utils/regionGeo';

export type RegionPin = {
  id: number;
  name: string;
  coords: LatLng;
  recipeCount: number;
};

export type RegionOption = { id: number; name: string };

type RawRegion = {
  id: number | string;
  name: string;
  latitude?: number | null;
  longitude?: number | null;
  content_count?: { recipes?: number; stories?: number; cultural_content?: number };
};

function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && Array.isArray((data as { results?: unknown }).results)) {
    return (data as { results: T[] }).results;
  }
  return [];
}

/** Lightweight region list for pickers (id + name only). */
export async function fetchRegions(): Promise<RegionOption[]> {
  const data = await apiGetJson<unknown>('/api/regions/');
  return unwrapList<RawRegion>(data).map((r) => ({ id: Number(r.id), name: r.name }));
}

/**
 * Returns regions to plot on the map. Uses the map index endpoint
 * (`/api/map/regions/?geo_only=false`) so we get the recipe count and any
 * seeded lat/lng in a single request, instead of fetching every region from
 * the lookup CRUD endpoint and firing one extra `?region=<name>` count call
 * per pin (the old N+1 waterfall in #620).
 *
 * Backend lat/lng are preferred when populated; otherwise we fall back to the
 * hardcoded `regionGeo.COORDS` table. Regions with neither are dropped — they
 * surface again once either side learns their coordinates.
 */
export async function fetchRegionPins(): Promise<RegionPin[]> {
  const data = await apiGetJson<unknown>('/api/map/regions/?geo_only=false');
  const regions = unwrapList<RawRegion>(data);

  const pins: RegionPin[] = [];
  for (const r of regions) {
    const lat = typeof r.latitude === 'number' ? r.latitude : null;
    const lng = typeof r.longitude === 'number' ? r.longitude : null;
    const coords: LatLng | null =
      lat != null && lng != null ? { latitude: lat, longitude: lng } : coordsForRegion(r.name);
    if (!coords) continue;
    pins.push({
      id: Number(r.id),
      name: r.name,
      coords,
      recipeCount: r.content_count?.recipes ?? 0,
    });
  }
  return pins;
}
