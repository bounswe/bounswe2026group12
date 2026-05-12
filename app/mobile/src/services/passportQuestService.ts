import { apiGetJson, nextPagePath } from './httpClient';

/**
 * Normalised quest shape consumed by `QuestList` (#605).
 *
 * The backend (`GET /api/passport/quests/`) actually returns a richer dict per
 * quest (category, target_count, reward_type, reward_value, is_event_quest,
 * event_start, event_end, progress, completed_at, reward_claimed). The mobile
 * component only needs progress + reward + completion status + the event end
 * window, so we collapse those backend fields into a flatter type the UI can
 * render without further conditionals.
 */
export type Quest = {
  id: number | string;
  name: string;
  description: string;
  progress_current: number;
  progress_target: number;
  reward?: string;
  is_completed: boolean;
  /** ISO timestamp present only for active event quests. */
  event_end?: string | null;
};

type RawQuest = {
  id?: number | string;
  name?: string | null;
  description?: string | null;
  category?: string | null;
  target_count?: number | string | null;
  reward_type?: string | null;
  reward_value?: string | null;
  is_event_quest?: boolean | null;
  event_start?: string | null;
  event_end?: string | null;
  progress?: number | string | null;
  completed_at?: string | null;
  reward_claimed?: boolean | null;
};

type Paginated<T> = { count?: number; next?: string | null; results: T[] };

/**
 * Coerce a backend numeric field that may arrive as a string or null. Anything
 * unparseable becomes `0` so the progress bar stays renderable (we never want
 * a `NaN` ratio leaking into a width style).
 */
function toNum(v: unknown): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'string') {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function toStr(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

/**
 * Format a "🏆 <reward>" label from the backend's split reward_type/reward_value
 * fields. The web frontend has its own (richer) presentation; here we just
 * surface whatever is human-readable so a quest like `theme: marmara_blue`
 * still reads correctly in the chip.
 */
function buildRewardLabel(raw: RawQuest): string | undefined {
  const value = toStr(raw.reward_value).trim();
  if (!value) return undefined;
  const type = toStr(raw.reward_type).trim();
  // Points are the only reward type where the value is a number; the rest
  // (theme, badge, sticker) read fine as the raw value on its own.
  if (type === 'points') return `${value} points`;
  return value;
}

/**
 * Normalise a single raw quest dict. Exported so the unit tests can poke each
 * branch (string ids, missing description, completed quest, event quest)
 * without going through `apiGetJson`.
 */
export function parseQuest(raw: RawQuest): Quest {
  const progress = toNum(raw.progress);
  const target = toNum(raw.target_count);
  const isCompleted = !!raw.completed_at;
  const isEvent = !!raw.is_event_quest;
  return {
    id: raw.id ?? 0,
    name: toStr(raw.name),
    description: toStr(raw.description),
    progress_current: progress,
    progress_target: target,
    reward: buildRewardLabel(raw),
    is_completed: isCompleted,
    event_end: isEvent ? (raw.event_end ?? null) : null,
  };
}

/**
 * Fetch all active passport quests for the current user. The endpoint is not
 * currently paginated server-side (it returns a plain list), but `httpClient`
 * conventions say to walk DRF pagination if a `next` link appears — so we
 * handle both shapes defensively.
 */
export async function fetchQuests(): Promise<Quest[]> {
  const all: Quest[] = [];
  let path: string | null = '/api/passport/quests/';
  while (path) {
    const page: Paginated<RawQuest> | RawQuest[] = await apiGetJson<
      Paginated<RawQuest> | RawQuest[]
    >(path);
    const results: RawQuest[] = Array.isArray(page) ? page : page.results ?? [];
    for (const r of results) all.push(parseQuest(r));
    path = Array.isArray(page) ? null : nextPagePath(page.next);
  }
  return all;
}
