import { apiGetJson } from './httpClient';

export type CulturalEventRecipe = {
  id: number;
  title: string;
  region?: string | null;
};

export type CulturalEvent = {
  id: number;
  name: string;
  /** "fixed:MM-DD" (Gregorian) or "lunar:<name>" (resolved client-side). */
  date_rule: string;
  region: { id: number; name: string } | null;
  description: string;
  recipes: CulturalEventRecipe[];
  created_at?: string;
};

function unwrap<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && Array.isArray((data as { results?: unknown }).results)) {
    return (data as { results: T[] }).results;
  }
  return [];
}

export async function fetchCulturalEvents(filter?: {
  month?: string; // "01".."12"
  region?: string; // region name or pk; backend accepts either via query
}): Promise<CulturalEvent[]> {
  const params = new URLSearchParams();
  if (filter?.month) params.set('month', filter.month);
  if (filter?.region) params.set('region', filter.region);
  const qs = params.toString();
  const data = await apiGetJson<unknown>(`/api/cultural-events/${qs ? `?${qs}` : ''}`);
  return unwrap<CulturalEvent>(data);
}

const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Year-by-year lookup of common lunar-anchored festivals resolved to their
 * Gregorian dates. Backend stores rules like `lunar:ramadan` and asks the
 * frontend to resolve; this table is the resolver. Add entries each new year.
 * Values are { monthIndex (0-11), day }.
 */
const LUNAR_YEARLY: Record<number, Record<string, { monthIndex: number; day: number }>> = {
  2026: {
    ramadan: { monthIndex: 1, day: 18 },        // Feb 18 — first day of Ramadan 1447
    'eid-fitr': { monthIndex: 2, day: 20 },     // Mar 20 — Eid al-Fitr 1447
    'eid-adha': { monthIndex: 4, day: 27 },     // May 27 — Eid al-Adha 1447
    'kurban-bayrami': { monthIndex: 4, day: 27 },
    mevlid: { monthIndex: 7, day: 25 },          // Aug 25 — Mawlid an-Nabi 1448
    ashura: { monthIndex: 6, day: 6 },           // Jul 6 — 10 Muharram 1448
  },
  2027: {
    ramadan: { monthIndex: 1, day: 8 },
    'eid-fitr': { monthIndex: 2, day: 9 },
    'eid-adha': { monthIndex: 4, day: 16 },
    'kurban-bayrami': { monthIndex: 4, day: 16 },
    mevlid: { monthIndex: 7, day: 14 },
    ashura: { monthIndex: 5, day: 25 },
  },
};

function resolveLunarThisYear(key: string): { monthIndex: number; day: number } | null {
  const normalised = key.trim().toLowerCase();
  const year = new Date().getFullYear();
  const table = LUNAR_YEARLY[year];
  if (!table) return null;
  return table[normalised] ?? null;
}

export type ParsedEventDate = {
  /** Month index 0-11; null only when neither fixed nor a known lunar rule. */
  monthIndex: number | null;
  /** Day-of-month (1-31); null when unresolved. */
  day: number | null;
  /** Primary Gregorian label ("March 21"). Empty when unresolved. */
  label: string;
  /** True when the rule is lunar-anchored. */
  isLunar: boolean;
  /** Friendly lunar-rule name when isLunar is true (e.g. "Ramadan"). */
  lunarName?: string;
  /** True when the lunar rule had no entry in the resolver and we have no Gregorian fallback. */
  lunarUnresolved?: boolean;
};

function prettyLunarName(raw: string): string {
  return raw
    .split(/[-_\s]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function parseEventDate(rule: string): ParsedEventDate {
  if (typeof rule !== 'string') {
    return { monthIndex: null, day: null, label: 'Unscheduled', isLunar: false };
  }
  const trimmed = rule.trim();
  if (trimmed.startsWith('fixed:')) {
    const [mm, dd] = trimmed.slice('fixed:'.length).split('-');
    const m = Number(mm);
    const d = Number(dd);
    if (!Number.isFinite(m) || !Number.isFinite(d)) {
      return { monthIndex: null, day: null, label: trimmed, isLunar: false };
    }
    const idx = Math.max(0, Math.min(11, m - 1));
    return {
      monthIndex: idx,
      day: d,
      label: `${MONTH_LABELS[idx]} ${d}`,
      isLunar: false,
    };
  }
  if (trimmed.startsWith('lunar:')) {
    const rawName = trimmed.slice('lunar:'.length);
    const pretty = prettyLunarName(rawName) || rawName;
    const resolved = resolveLunarThisYear(rawName);
    if (resolved) {
      return {
        monthIndex: resolved.monthIndex,
        day: resolved.day,
        label: `${MONTH_LABELS[resolved.monthIndex]} ${resolved.day}`,
        isLunar: true,
        lunarName: pretty,
      };
    }
    return {
      monthIndex: null,
      day: null,
      label: `Lunar · ${pretty}`,
      isLunar: true,
      lunarName: pretty,
      lunarUnresolved: true,
    };
  }
  return { monthIndex: null, day: null, label: trimmed, isLunar: false };
}

export { MONTH_LABELS };
