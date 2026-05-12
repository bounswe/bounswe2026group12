import { apiGetJson, nextPagePath } from './httpClient';

/**
 * Discriminator for journey timeline entries. The first four are the known
 * backend choices (`recipe_tried`, `story_saved`, `stamp_earned`,
 * `quest_completed`) plus `heritage_shared` and `level_up`. Anything else is
 * tolerated as a string so a server-side rollout of a new event type does not
 * crash older mobile builds — the component just falls back to the generic
 * `✨` icon for unknown values.
 */
export type TimelineEventType =
  | 'stamp_earned'
  | 'recipe_tried'
  | 'story_saved'
  | 'quest_completed'
  | 'heritage_shared'
  | 'level_up'
  | string;

/**
 * Normalised timeline event shape consumed by the UI.
 *
 * The backend currently emits `description` + `timestamp`, but we accept any
 * of `message`/`description` and `created_at`/`timestamp` from the wire and
 * collapse them here so future renames don't break the screen.
 */
export type TimelineEvent = {
  id: number | string;
  event_type: TimelineEventType;
  message?: string;
  payload?: Record<string, unknown>;
  created_at: string;
};

type RawTimelineEvent = {
  id?: number | string;
  event_type?: string;
  type?: string;
  description?: string;
  message?: string;
  timestamp?: string;
  created_at?: string;
  payload?: Record<string, unknown>;
  // backend extras that we fold into payload for the title composer
  related_recipe?: number | string | null;
  related_story?: number | string | null;
  stamp_rarity?: string | null;
};

type RawTimelinePage = {
  results?: RawTimelineEvent[];
  next?: string | null;
};

type RawPassportResponse = {
  timeline?: RawTimelineEvent[];
};

const PAGE_SIZE = 20;

/**
 * Map a raw wire event into the canonical UI shape. Tolerates key drift
 * (`type` ↔ `event_type`, `description` ↔ `message`, `timestamp` ↔
 * `created_at`). Backend "side channel" fields like `related_recipe`,
 * `related_story` and `stamp_rarity` get folded into `payload` so the row
 * title composer can read them without caring about the wire layout.
 */
export function normalizeEvent(raw: RawTimelineEvent | null | undefined): TimelineEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const id = raw.id;
  if (id === undefined || id === null) return null;
  const eventType =
    (typeof raw.event_type === 'string' && raw.event_type) ||
    (typeof raw.type === 'string' && raw.type) ||
    'unknown';
  const message =
    typeof raw.message === 'string' && raw.message
      ? raw.message
      : typeof raw.description === 'string' && raw.description
        ? raw.description
        : undefined;
  const createdAt =
    (typeof raw.created_at === 'string' && raw.created_at) ||
    (typeof raw.timestamp === 'string' && raw.timestamp) ||
    '';
  const payload: Record<string, unknown> = { ...(raw.payload ?? {}) };
  if (raw.related_recipe !== undefined && raw.related_recipe !== null) {
    payload.related_recipe = raw.related_recipe;
  }
  if (raw.related_story !== undefined && raw.related_story !== null) {
    payload.related_story = raw.related_story;
  }
  if (raw.stamp_rarity !== undefined && raw.stamp_rarity !== null) {
    payload.stamp_rarity = raw.stamp_rarity;
  }
  return {
    id,
    event_type: eventType,
    message,
    payload: Object.keys(payload).length ? payload : undefined,
    created_at: createdAt,
  };
}

export type TimelineFetchResult = {
  events: TimelineEvent[];
  nextCursor: string | null;
};

type FetchOpts = {
  cursor?: string | null;
};

/**
 * Tracks the synthesized client-side cursor for the fallback path. When the
 * backend has no dedicated paginated timeline endpoint we ask for the full
 * passport once and slice it into 20-item pages, encoding the slice offset
 * inside the cursor as `passport:<offset>` so subsequent calls don't refetch
 * if we already cached the slice.
 */
const PASSPORT_CURSOR_PREFIX = 'passport:';

let cachedPassportEvents: { username: string; events: TimelineEvent[] } | null = null;

function isHttpStatus(err: unknown, status: number): boolean {
  if (!err || typeof err !== 'object') return false;
  const message = (err as { message?: unknown }).message;
  if (typeof message !== 'string') return false;
  return message.includes(`HTTP ${status}`) || message.includes(`status ${status}`);
}

async function fetchDedicatedEndpoint(
  username: string,
  cursor: string | null | undefined,
): Promise<TimelineFetchResult> {
  const path = cursor
    ? `/api/users/${encodeURIComponent(username)}/passport/timeline/?cursor=${encodeURIComponent(cursor)}`
    : `/api/users/${encodeURIComponent(username)}/passport/timeline/`;
  const raw = await apiGetJson<RawTimelinePage>(path);
  const results = Array.isArray(raw?.results) ? raw!.results : [];
  const events = results
    .map(normalizeEvent)
    .filter((e): e is TimelineEvent => Boolean(e));
  const nextCursor = nextPagePath(raw?.next ?? null);
  // The path-style cursor returned from nextPagePath may include the full
  // `?cursor=…` slug. We hand it back as-is so the next call can pass it
  // through `apiGetJson` directly.
  return { events, nextCursor };
}

async function fetchPassportFallback(
  username: string,
  cursor: string | null | undefined,
): Promise<TimelineFetchResult> {
  const offset = (() => {
    if (!cursor) return 0;
    if (!cursor.startsWith(PASSPORT_CURSOR_PREFIX)) return 0;
    const n = Number(cursor.slice(PASSPORT_CURSOR_PREFIX.length));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  })();

  let events: TimelineEvent[];
  if (cachedPassportEvents && cachedPassportEvents.username === username && offset > 0) {
    events = cachedPassportEvents.events;
  } else {
    const raw = await apiGetJson<RawPassportResponse>(
      `/api/users/${encodeURIComponent(username)}/passport/`,
    );
    const list = Array.isArray(raw?.timeline) ? raw!.timeline : [];
    events = list.map(normalizeEvent).filter((e): e is TimelineEvent => Boolean(e));
    cachedPassportEvents = { username, events };
  }

  const slice = events.slice(offset, offset + PAGE_SIZE);
  const nextOffset = offset + slice.length;
  const hasMore = nextOffset < events.length;
  return {
    events: slice,
    nextCursor: hasMore ? `${PASSPORT_CURSOR_PREFIX}${nextOffset}` : null,
  };
}

/**
 * Fetch a page of journey timeline events for a user.
 *
 * Strategy: prefer the dedicated `…/passport/timeline/` endpoint (so the
 * server can paginate properly), but earlier probes returned 404 there. On a
 * 404 we fall back to slicing the inline `timeline` array embedded in the
 * full passport response — currently the backend caps that list at 50 most
 * recent events.
 *
 * The two paths are kept inside this one function so the component never has
 * to care which one is live.
 */
export async function fetchTimeline(
  username: string,
  opts: FetchOpts = {},
): Promise<TimelineFetchResult> {
  const cursor = opts.cursor ?? null;
  // Once we've started a fallback paginated session the cursor itself carries
  // the `passport:` prefix — keep walking that path instead of re-probing.
  if (cursor && cursor.startsWith(PASSPORT_CURSOR_PREFIX)) {
    return fetchPassportFallback(username, cursor);
  }
  try {
    return await fetchDedicatedEndpoint(username, cursor);
  } catch (err) {
    if (isHttpStatus(err, 404)) {
      return fetchPassportFallback(username, cursor);
    }
    throw err;
  }
}

/**
 * Test-only hook to reset the fallback cache between cases. Exposed because
 * jest doesn't isolate module state across `describe` blocks by default.
 */
export function __resetTimelineCacheForTests(): void {
  cachedPassportEvents = null;
}
