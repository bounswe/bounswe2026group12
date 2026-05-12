jest.mock('../../src/services/httpClient', () => ({
  apiGetJson: jest.fn(),
  nextPagePath: (next: string | null | undefined): string | null => {
    if (!next) return null;
    try {
      const u = new URL(next);
      return `${u.pathname}${u.search}`;
    } catch {
      return null;
    }
  },
}));

import { apiGetJson } from '../../src/services/httpClient';
import {
  __resetTimelineCacheForTests,
  fetchTimeline,
  normalizeEvent,
} from '../../src/services/passportTimelineService';

const mockedGet = apiGetJson as jest.MockedFunction<typeof apiGetJson>;

beforeEach(() => {
  mockedGet.mockReset();
  __resetTimelineCacheForTests();
});

describe('normalizeEvent', () => {
  it('maps backend description+timestamp into message+created_at', () => {
    const out = normalizeEvent({
      id: 7,
      event_type: 'recipe_tried',
      description: 'Tried Sarma',
      timestamp: '2026-05-10T12:00:00Z',
      related_recipe: 42,
    });
    expect(out).not.toBeNull();
    expect(out!.id).toBe(7);
    expect(out!.event_type).toBe('recipe_tried');
    expect(out!.message).toBe('Tried Sarma');
    expect(out!.created_at).toBe('2026-05-10T12:00:00Z');
    expect(out!.payload).toEqual({ related_recipe: 42 });
  });

  it('falls back to `type` when `event_type` is absent', () => {
    const out = normalizeEvent({ id: 1, type: 'level_up', message: 'Up!', created_at: 'x' });
    expect(out!.event_type).toBe('level_up');
    expect(out!.message).toBe('Up!');
  });

  it('returns null when id is missing', () => {
    expect(normalizeEvent({ event_type: 'recipe_tried' } as any)).toBeNull();
  });
});

describe('fetchTimeline — dedicated endpoint path', () => {
  it('returns events and walks the DRF `next` link as the cursor', async () => {
    mockedGet.mockResolvedValueOnce({
      next: 'https://api.example.com/api/users/ayse/passport/timeline/?cursor=abc',
      results: [
        { id: 1, event_type: 'stamp_earned', description: 'Got a stamp', timestamp: 't1' },
        { id: 2, event_type: 'recipe_tried', description: 'Tried Sarma', timestamp: 't2' },
      ],
    } as any);

    const page = await fetchTimeline('ayse');

    expect(mockedGet).toHaveBeenCalledWith('/api/users/ayse/passport/timeline/');
    expect(page.events).toHaveLength(2);
    expect(page.events[0].message).toBe('Got a stamp');
    expect(page.nextCursor).toBe('/api/users/ayse/passport/timeline/?cursor=abc');
  });

  it('returns nextCursor null when there is no more data', async () => {
    mockedGet.mockResolvedValueOnce({ next: null, results: [] } as any);
    const page = await fetchTimeline('ayse');
    expect(page.events).toEqual([]);
    expect(page.nextCursor).toBeNull();
  });
});

describe('fetchTimeline — fallback to full passport', () => {
  it('falls back to the passport endpoint on 404 and chunks 20 per page', async () => {
    // First call: dedicated endpoint 404s.
    mockedGet.mockRejectedValueOnce(new Error('HTTP 404 Not Found'));
    // Second call: full passport with 25 timeline events.
    const big = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      event_type: 'recipe_tried',
      description: `Recipe ${i + 1}`,
      timestamp: '2026-05-10T12:00:00Z',
    }));
    mockedGet.mockResolvedValueOnce({ timeline: big } as any);

    const page1 = await fetchTimeline('ayse');
    expect(mockedGet).toHaveBeenNthCalledWith(1, '/api/users/ayse/passport/timeline/');
    expect(mockedGet).toHaveBeenNthCalledWith(2, '/api/users/ayse/passport/');
    expect(page1.events).toHaveLength(20);
    expect(page1.nextCursor).toBe('passport:20');

    // Second page reuses the cache and slices the remainder.
    const page2 = await fetchTimeline('ayse', { cursor: page1.nextCursor! });
    expect(mockedGet).toHaveBeenCalledTimes(2); // no extra fetch
    expect(page2.events).toHaveLength(5);
    expect(page2.nextCursor).toBeNull();
  });

  it('returns an empty page when the passport has no timeline', async () => {
    mockedGet.mockRejectedValueOnce(new Error('HTTP 404'));
    mockedGet.mockResolvedValueOnce({} as any);
    const page = await fetchTimeline('ayse');
    expect(page.events).toEqual([]);
    expect(page.nextCursor).toBeNull();
  });

  it('propagates non-404 errors from the dedicated endpoint', async () => {
    mockedGet.mockRejectedValueOnce(new Error('HTTP 500 boom'));
    await expect(fetchTimeline('ayse')).rejects.toThrow('HTTP 500 boom');
  });
});
