import { normalizeStamp, type Stamp } from '../components/passport/StampCollection';
import { apiGetJson } from './httpClient';
import { normalizeCulture, type CultureSummary } from './passportCultureService';
import { normalizeEvent, type TimelineEvent } from './passportTimelineService';
import { parseQuest, type Quest } from './passportQuestService';

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
 * Shape of `GET /api/users/<username>/passport/`. Collections are normalized
 * at the boundary so screens consume stable types (#860).
 */
export type Passport = {
  level: number;
  total_points: number;
  stamps: Stamp[];
  culture_summaries: CultureSummary[];
  timeline: TimelineEvent[];
  stats: Record<string, number>;
  /** When the API sends `stats.level_name` (string), surfaced for level badge copy. */
  stats_level_name?: string;
  active_quests: Quest[];
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

function asArray(value: unknown): unknown[] {
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

function asOptionalLevelName(statsRaw: unknown): string | undefined {
  if (statsRaw == null || typeof statsRaw !== 'object') return undefined;
  const v = (statsRaw as Record<string, unknown>).level_name;
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
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
  const stampsRaw = asArray(raw?.stamps);
  const culturesRaw = asArray(raw?.culture_summaries);
  const timelineRaw = asArray(raw?.timeline);
  const questsRaw = asArray(raw?.active_quests);

  return {
    level: asNumber(raw?.level),
    total_points: asNumber(raw?.total_points),
    stamps: stampsRaw.map((s) => normalizeStamp(s)),
    culture_summaries: culturesRaw
      .map((c) => normalizeCulture(c))
      .filter((c): c is CultureSummary => c !== null),
    timeline: timelineRaw
      .map((e) => normalizeEvent(e as Record<string, unknown>))
      .filter((e): e is TimelineEvent => Boolean(e)),
    stats: asNumberRecord(raw?.stats),
    stats_level_name: asOptionalLevelName(raw?.stats),
    active_quests: questsRaw.map((q) =>
      parseQuest((q ?? {}) as Parameters<typeof parseQuest>[0]),
    ),
    active_theme: normalizeTheme(raw?.active_theme),
  };
}
