/**
 * Approximate centroids for the regions present in our seed data. These are
 * rough geographic centers used only for placing pins on the discovery map.
 *
 * TODO(#383-followup): move to backend (`Region.lat`, `Region.lng`) so the
 * mobile client doesn't need to know geography.
 */
export type LatLng = { latitude: number; longitude: number };

const COORDS: Record<string, LatLng> = {
  Aegean: { latitude: 38.5, longitude: 27.0 },
  Anatolian: { latitude: 39.0, longitude: 35.0 },
  'Black Sea': { latitude: 41.0, longitude: 36.5 },
  Marmara: { latitude: 40.7, longitude: 28.5 },
  Mediterranean: { latitude: 36.8, longitude: 31.5 },
  'Southeastern Anatolia': { latitude: 37.5, longitude: 39.0 },
  Levantine: { latitude: 33.5, longitude: 35.5 },
  Persian: { latitude: 32.5, longitude: 53.5 },
  Arabian: { latitude: 24.0, longitude: 45.0 },
  Balkan: { latitude: 42.0, longitude: 22.0 },
  Caucasian: { latitude: 41.7, longitude: 44.8 },
};

export function coordsForRegion(name: string | null | undefined): LatLng | null {
  if (!name) return null;
  return COORDS[name] ?? null;
}

export type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export const INITIAL_MAP_REGION: MapRegion = {
  latitude: 38.0,
  longitude: 35.0,
  latitudeDelta: 18,
  longitudeDelta: 22,
};

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * Builds a map region that frames the given pin coordinates with padding so
 * several nearby pins stay visible (passport map first paint).
 */
export function regionFromPinCoordinates(coords: LatLng[]): MapRegion {
  if (coords.length === 0) return INITIAL_MAP_REGION;
  if (coords.length === 1) {
    const c = coords[0];
    return {
      latitude: c.latitude,
      longitude: c.longitude,
      latitudeDelta: 10,
      longitudeDelta: 12,
    };
  }
  const lats = coords.map((c) => c.latitude);
  const lngs = coords.map((c) => c.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const midLat = (minLat + maxLat) / 2;
  const midLng = (minLng + maxLng) / 2;
  const pad = 1.5;
  const latSpan = Math.max(maxLat - minLat, 0.4) * pad;
  const lngSpan = Math.max(maxLng - minLng, 0.5) * pad;
  return {
    latitude: midLat,
    longitude: midLng,
    latitudeDelta: clamp(latSpan, 3.5, 45),
    longitudeDelta: clamp(lngSpan, 4.5, 55),
  };
}
