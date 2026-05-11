import { apiGetJson } from './httpClient';

/**
 * Single "Did You Know?" cultural fact. The backend serializer nests
 * heritage_group and region as `{id, name}` on read.
 */
export type CulturalFact = {
  id: number;
  text: string;
  source_url: string;
  heritage_group: { id: number; name: string } | number | null;
  region: { id: number; name: string } | number | null;
  created_at?: string;
};

function unwrap<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && Array.isArray((data as { results?: unknown }).results)) {
    return (data as { results: T[] }).results;
  }
  return [];
}

/**
 * Fetch cultural facts filtered by region pk (used on recipe detail).
 * Returns an empty array if nothing tagged to the region — caller should
 * hide the section rather than render an empty box.
 */
export async function fetchCulturalFactsByRegion(
  regionId: number,
): Promise<CulturalFact[]> {
  const data = await apiGetJson<unknown>(
    `/api/cultural-facts/?region=${encodeURIComponent(String(regionId))}`,
  );
  return unwrap<CulturalFact>(data);
}

/**
 * Fetch cultural facts under a heritage group (used on the future heritage
 * screen — see #501). Stub now so the hook is wired ahead of UI work.
 */
export async function fetchCulturalFactsByHeritageGroup(
  groupId: number,
): Promise<CulturalFact[]> {
  const data = await apiGetJson<unknown>(
    `/api/cultural-facts/?heritage_group=${encodeURIComponent(String(groupId))}`,
  );
  return unwrap<CulturalFact>(data);
}
