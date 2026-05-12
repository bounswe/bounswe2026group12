import { apiGetJson } from './httpClient';

/**
 * Single culture rollup as surfaced on the passport screen.
 *
 * The backend currently returns each item as
 * `{ culture, recipes_tried, stories_saved, interactions, rarity }`
 * (see `apps/passport/services.py#culture_summaries`). We normalize at the
 * service boundary so the UI works against the canonical issue contract:
 * `culture_name`, `stamp_rarity`, plus the extra counters the spec asks for
 * (`ingredients_discovered`, `heritage_recipes`) — defaulting to `0` when the
 * backend hasn't shipped them yet.
 */
export type CultureSummary = {
  culture_name: string;
  stamp_rarity: 'bronze' | 'silver' | 'gold' | 'emerald' | 'legendary' | string;
  recipes_tried: number;
  stories_saved: number;
  ingredients_discovered: number;
  heritage_recipes: number;
};

type PassportResponse = {
  culture_summaries?: unknown[];
};

/** Coerce anything to a finite number; falls back to `0`. Matches the issue spec. */
function toNum(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeCulture(raw: unknown): CultureSummary | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  // Backend ships `culture`; the issue contract uses `culture_name`. Accept both.
  const name =
    (typeof r.culture_name === 'string' && r.culture_name) ||
    (typeof r.culture === 'string' && r.culture) ||
    '';
  if (!name) return null;
  const rarity =
    (typeof r.stamp_rarity === 'string' && r.stamp_rarity) ||
    (typeof r.rarity === 'string' && r.rarity) ||
    'bronze';
  return {
    culture_name: name,
    stamp_rarity: rarity,
    recipes_tried: toNum(r.recipes_tried),
    stories_saved: toNum(r.stories_saved),
    ingredients_discovered: toNum(r.ingredients_discovered),
    heritage_recipes: toNum(r.heritage_recipes),
  };
}

/** Fetch + normalize every culture rollup for the user. */
export async function fetchCultures(username: string): Promise<CultureSummary[]> {
  const res = await apiGetJson<PassportResponse>(`/api/users/${username}/passport/`);
  const raw = Array.isArray(res?.culture_summaries) ? res.culture_summaries : [];
  return raw
    .map(normalizeCulture)
    .filter((c): c is CultureSummary => c !== null);
}

/**
 * Look up the single culture rollup matching `cultureName`. Returns `null`
 * when the user has no engagement with that culture — drives the "not found"
 * empty state on the detail screen.
 */
export async function fetchCultureDetail(
  username: string,
  cultureName: string,
): Promise<CultureSummary | null> {
  const cultures = await fetchCultures(username);
  const target = cultureName.trim().toLowerCase();
  return cultures.find((c) => c.culture_name.trim().toLowerCase() === target) ?? null;
}
