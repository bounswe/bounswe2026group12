import { apiGetJson, nextPagePath } from './httpClient';
import { coordsForRegion, type LatLng } from '../utils/regionGeo';

export type RegionPin = {
  id: number;
  name: string;
  coords: LatLng;
  recipeCount: number;
};

export type RegionOption = { id: number; name: string };

export type RegionBBox = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export type RegionRecipePin = {
  id: string;
  title: string;
  authorUsername: string | null;
  image: string | null;
  coords: LatLng;
};

export type UnlocatedRecipe = {
  id: string;
  title: string;
  authorUsername: string | null;
  image: string | null;
};

export type RegionRecipesPayload = {
  located: RegionRecipePin[];
  unlocated: UnlocatedRecipe[];
  bbox: RegionBBox | null;
  centroid: LatLng | null;
};

type RawRegion = {
  id: number | string;
  name: string;
  latitude?: number | null;
  longitude?: number | null;
  bbox_north?: number | null;
  bbox_south?: number | null;
  bbox_east?: number | null;
  bbox_west?: number | null;
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

/**
 * Fetch a region's full payload for the zoom-into-region map (#464):
 * - bbox (when seeded) or centroid (fallback) so the camera can fit the area
 * - per-recipe pins for every recipe in the region with lat/lng set
 * - the "unlocated" list — same region, no coords yet
 *
 * Backend returns Recipe rows with `latitude` and `longitude` fields (nullable).
 * The split happens client-side.
 */
export async function fetchRegionRecipes(
  regionName: string,
): Promise<RegionRecipesPayload> {
  // Region geo + bbox via the map index detail endpoint
  const toNumLocal = (v: unknown): number | null => {
    if (v == null) return null;
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    if (typeof v === 'string') {
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  };

  let bbox: RegionBBox | null = null;
  let centroid: LatLng | null = null;
  try {
    const all = await apiGetJson<unknown>('/api/map/regions/?geo_only=false');
    const match = unwrapList<RawRegion>(all).find((r) => r.name === regionName);
    if (match) {
      const n = toNumLocal(match.bbox_north);
      const s = toNumLocal(match.bbox_south);
      const e = toNumLocal(match.bbox_east);
      const w = toNumLocal(match.bbox_west);
      if (n != null && s != null && e != null && w != null) {
        bbox = { north: n, south: s, east: e, west: w };
      }
      const cLat = toNumLocal(match.latitude);
      const cLng = toNumLocal(match.longitude);
      if (cLat != null && cLng != null) {
        centroid = { latitude: cLat, longitude: cLng };
      }
    }
  } catch {
    // Non-fatal: we still have the regionGeo fallback below.
  }
  if (!centroid) {
    centroid = coordsForRegion(regionName);
  }

  // Walk the paginated recipes-by-region endpoint
  const params = new URLSearchParams({ region: regionName });
  const collected: any[] = [];
  let path: string | null = `/api/recipes/?${params.toString()}`;
  while (path) {
    const data: any = await apiGetJson<any>(path);
    if (Array.isArray(data)) {
      collected.push(...data);
      break;
    }
    if (data && Array.isArray(data.results)) {
      collected.push(...data.results);
      path = nextPagePath(data.next);
    } else {
      break;
    }
  }

  // DRF serializes Recipe.latitude/longitude as DecimalField → JSON strings
  // ("38.500000"). Region bbox fields come through as numbers. Parse defensively
  // so a string payload still plots.
  const toNum = (v: unknown): number | null => {
    if (v == null) return null;
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    if (typeof v === 'string') {
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  };

  const located: RegionRecipePin[] = [];
  const unlocated: UnlocatedRecipe[] = [];
  for (const r of collected) {
    const lat = toNum(r.latitude);
    const lng = toNum(r.longitude);
    const id = String(r.id ?? '');
    const title = typeof r.title === 'string' ? r.title : '';
    const authorUsername = typeof r.author_username === 'string' ? r.author_username : null;
    const image = typeof r.image === 'string' ? r.image : null;
    if (lat != null && lng != null) {
      located.push({
        id,
        title,
        authorUsername,
        image,
        coords: { latitude: lat, longitude: lng },
      });
    } else {
      unlocated.push({ id, title, authorUsername, image });
    }
  }

  return { located, unlocated, bbox, centroid };
}
