import { apiGetJson } from './httpClient';

/**
 * Active passport theme — the API currently returns either a bare string
 * (theme slug like `"classic_traveler"`) or an object `{ name, kind }`.
 * We normalize to an object so consumers don't have to type-check shapes.
 */
export type PassportTheme = {
  name?: string;
  kind?: string;
} | null;

/**
 * Shape of `GET /api/users/<username>/passport/`. Sibling PRs (#600–#605)
 * fill in the per-section UIs — for #598 we only need counts + bare values
 * for the scaffold (cover band, stats bar, tab pills).
 *
 * All collections default to empty arrays so the screen can mount safely
 * even when the backend omits a key.
 */
export type Passport = {
  level: number;
  total_points: number;
  stamps: any[];
  culture_summaries: any[];
  timeline: any[];
  stats: Record<string, number>;
  active_quests: any[];
  active_theme: PassportTheme;
};

function normalizeTheme(raw: unknown): PassportTheme {
  if (raw == null) return null;
  if (typeof raw === 'string') return { name: raw };
  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    const name = typeof obj.name === 'string' ? obj.name : undefined;
    const kind = typeof obj.kind === 'string' ? obj.kind : undefined;
    if (name == null && kind == null) return null;
    return { name, kind };
  }
  return null;
}

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function asNumberRecord(value: unknown): Record<string, number> {
  if (value == null || typeof value !== 'object') return {};
  const out: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      out[key] = raw;
    }
  }
  return out;
}

/**
 * Fetch the passport bundle for a username. Defensive against partial
 * payloads — missing keys collapse to empty arrays / null / 0 so the
 * scaffold renders without runtime crashes.
 */
export async function fetchPassport(username: string): Promise<Passport> {
  const raw = await apiGetJson<Record<string, unknown>>(
    `/api/users/${encodeURIComponent(username)}/passport/`,
  );
  return {
    level: asNumber(raw?.level),
    total_points: asNumber(raw?.total_points),
    stamps: asArray(raw?.stamps),
    culture_summaries: asArray(raw?.culture_summaries),
    timeline: asArray(raw?.timeline),
    stats: asNumberRecord(raw?.stats),
    active_quests: asArray(raw?.active_quests),
    active_theme: normalizeTheme(raw?.active_theme),
  };
}
