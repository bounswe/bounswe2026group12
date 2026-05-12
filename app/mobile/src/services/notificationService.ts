import { apiGetJson, apiPostJson, nextPagePath } from './httpClient';

/**
 * Notification shape used across the mobile app. Mirrors what the backend
 * `NotificationSerializer` returns (#737): id, actor, recipient, recipe,
 * message, notification_type, is_read, created_at.
 *
 * The mobile screen only needs a subset (no `recipient` — the caller is
 * always the recipient) so it's omitted here to keep the surface small.
 */
export type Notification = {
  id: number;
  actor: { id: number; username: string } | null;
  recipe: number | null;
  message: string;
  notification_type: 'question' | 'reply' | 'rating' | string;
  is_read: boolean;
  created_at: string;
};

type RawActor = {
  id?: number | string | null;
  username?: string | null;
} | number | string | null | undefined;

type RawNotification = {
  id: number | string;
  actor?: RawActor;
  recipe?: number | string | null;
  message?: string | null;
  notification_type?: string | null;
  is_read?: boolean | null;
  created_at?: string | null;
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

function normalizeActor(raw: RawActor): Notification['actor'] {
  if (raw == null) return null;
  if (typeof raw === 'object') {
    const id = toNum(raw.id);
    const username = typeof raw.username === 'string' ? raw.username : null;
    if (id == null || !username) return null;
    return { id, username };
  }
  return null;
}

function normalize(raw: RawNotification): Notification {
  return {
    id: Number(raw.id),
    actor: normalizeActor(raw.actor),
    recipe: toNum(raw.recipe),
    message: typeof raw.message === 'string' ? raw.message : '',
    notification_type:
      typeof raw.notification_type === 'string' ? raw.notification_type : 'unknown',
    is_read: raw.is_read === true,
    created_at: typeof raw.created_at === 'string' ? raw.created_at : '',
  };
}

/** Walk DRF pagination and collect every notification for the current user. */
export async function fetchNotifications(): Promise<Notification[]> {
  const all: Notification[] = [];
  let path: string | null = '/api/notifications/';
  while (path) {
    const page: Paginated<RawNotification> | RawNotification[] = await apiGetJson<
      Paginated<RawNotification> | RawNotification[]
    >(path);
    const results: RawNotification[] = Array.isArray(page) ? page : page.results ?? [];
    for (const r of results) all.push(normalize(r));
    path = Array.isArray(page) ? null : nextPagePath(page.next);
  }
  return all;
}

/**
 * Mark one notification as read. Backend route (#737) is
 * `POST /api/notifications/<id>/read/` (DRF `@action(url_path='read')`).
 */
export async function markAsRead(id: number): Promise<void> {
  await apiPostJson(`/api/notifications/${id}/read/`, {});
}

/**
 * Mark every notification as read in one shot.
 * `POST /api/notifications/read-all/` returns `{ marked_read: <n> }`.
 */
export async function markAllRead(): Promise<number> {
  const res = await apiPostJson<{ marked_read?: number } | null>(
    '/api/notifications/read-all/',
    {},
  );
  return res && typeof res.marked_read === 'number' ? res.marked_read : 0;
}

/**
 * Unread count. The backend has no dedicated endpoint yet, so we walk the
 * list and count unread items. Cheap enough — pages are 20 by default and
 * most users will have one page.
 */
export async function fetchUnreadCount(): Promise<number> {
  const items = await fetchNotifications();
  let n = 0;
  for (const item of items) if (!item.is_read) n += 1;
  return n;
}
