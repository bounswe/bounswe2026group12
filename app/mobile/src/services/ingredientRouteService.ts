import { apiGetJson, nextPagePath } from './httpClient';

export type IngredientWaypoint = {
  lat: number;
  lng: number;
  era: string;
  label: string;
};

export type IngredientRoute = {
  id: number;
  ingredient: number;
  ingredient_name: string;
  waypoints: IngredientWaypoint[];
};

type RawWaypoint = {
  lat?: number | string | null;
  lng?: number | string | null;
  era?: string | null;
  label?: string | null;
};

type RawRoute = {
  id: number | string;
  ingredient: number | string;
  ingredient_name?: string | null;
  waypoints?: RawWaypoint[] | null;
};

type Paginated<T> = { count?: number; next?: string | null; results: T[] };

function toNum(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function normalizeWaypoints(raw: RawWaypoint[] | null | undefined): IngredientWaypoint[] {
  if (!raw) return [];
  const out: IngredientWaypoint[] = [];
  for (const w of raw) {
    const lat = toNum(w.lat);
    const lng = toNum(w.lng);
    if (lat == null || lng == null) continue;
    out.push({
      lat,
      lng,
      era: typeof w.era === 'string' ? w.era : '',
      label: typeof w.label === 'string' ? w.label : '',
    });
  }
  return out;
}

function normalizeRoute(raw: RawRoute): IngredientRoute {
  return {
    id: Number(raw.id),
    ingredient: Number(raw.ingredient),
    ingredient_name: raw.ingredient_name ?? '',
    waypoints: normalizeWaypoints(raw.waypoints),
  };
}

/** Fetch every ingredient migration route, walking DRF pagination. */
export async function fetchIngredientRoutes(): Promise<IngredientRoute[]> {
  const all: IngredientRoute[] = [];
  let path: string | null = '/api/ingredient-routes/';
  while (path) {
    const page: Paginated<RawRoute> | RawRoute[] = await apiGetJson<Paginated<RawRoute> | RawRoute[]>(path);
    const results: RawRoute[] = Array.isArray(page) ? page : page.results ?? [];
    for (const r of results) all.push(normalizeRoute(r));
    path = Array.isArray(page) ? null : nextPagePath(page.next);
  }
  return all;
}
