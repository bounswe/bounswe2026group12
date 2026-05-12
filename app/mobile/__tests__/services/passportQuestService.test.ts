jest.mock('../../src/services/httpClient', () => ({
  apiGetJson: jest.fn(),
  nextPagePath: (next: string | null | undefined) => {
    if (!next) return null;
    try {
      const url = new URL(next);
      return `${url.pathname}${url.search}`;
    } catch {
      return null;
    }
  },
}));

import { fetchQuests, parseQuest } from '../../src/services/passportQuestService';
import { apiGetJson } from '../../src/services/httpClient';

const mockedGet = apiGetJson as jest.MockedFunction<typeof apiGetJson>;

describe('parseQuest', () => {
  it('flattens backend fields into the Quest shape', () => {
    const q = parseQuest({
      id: 7,
      name: 'Try Black Sea recipes',
      description: 'Cook three Black Sea dishes.',
      category: 'try_recipe',
      target_count: 3,
      reward_type: 'theme',
      reward_value: 'marmara_blue',
      is_event_quest: false,
      event_start: null,
      event_end: null,
      progress: 1,
      completed_at: null,
      reward_claimed: false,
    });
    expect(q).toEqual({
      id: 7,
      name: 'Try Black Sea recipes',
      description: 'Cook three Black Sea dishes.',
      progress_current: 1,
      progress_target: 3,
      reward: 'marmara_blue',
      is_completed: false,
      event_end: null,
    });
  });

  it('formats points rewards with a "points" suffix', () => {
    const q = parseQuest({
      id: 1,
      name: 'Quick win',
      description: '',
      target_count: 1,
      reward_type: 'points',
      reward_value: '50',
      progress: 0,
    });
    expect(q.reward).toBe('50 points');
  });

  it('marks completed when completed_at is set, and surfaces event_end for event quests', () => {
    const q = parseQuest({
      id: 'evt-1',
      name: 'Ramadan special',
      description: 'Cook iftar dish.',
      target_count: 1,
      progress: 1,
      completed_at: '2026-05-01T10:00:00Z',
      is_event_quest: true,
      event_end: '2026-05-10T00:00:00Z',
    });
    expect(q.is_completed).toBe(true);
    expect(q.event_end).toBe('2026-05-10T00:00:00Z');
  });

  it('defaults numeric and string fields when raw values are missing or unparseable', () => {
    const q = parseQuest({ id: 9 });
    expect(q.name).toBe('');
    expect(q.description).toBe('');
    expect(q.progress_current).toBe(0);
    expect(q.progress_target).toBe(0);
    expect(q.reward).toBeUndefined();
    expect(q.is_completed).toBe(false);
    expect(q.event_end).toBeNull();
  });

  it('coerces string numerics defensively', () => {
    const q = parseQuest({
      id: 2,
      name: 'x',
      description: 'y',
      target_count: '5' as unknown as number,
      progress: '2' as unknown as number,
    });
    expect(q.progress_current).toBe(2);
    expect(q.progress_target).toBe(5);
  });
});

describe('fetchQuests', () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  it('handles a bare array response (unpaginated)', async () => {
    mockedGet.mockResolvedValueOnce([
      {
        id: 1,
        name: 'A',
        description: 'd',
        target_count: 2,
        progress: 1,
        is_event_quest: false,
      },
    ]);
    const quests = await fetchQuests();
    expect(mockedGet).toHaveBeenCalledTimes(1);
    expect(mockedGet).toHaveBeenCalledWith('/api/passport/quests/');
    expect(quests).toHaveLength(1);
    expect(quests[0].name).toBe('A');
  });

  it('walks DRF pagination, combining results across pages', async () => {
    mockedGet
      .mockResolvedValueOnce({
        next: 'http://api.example.com/api/passport/quests/?page=2',
        results: [{ id: 1, name: 'A', description: '', target_count: 1, progress: 0 }],
      })
      .mockResolvedValueOnce({
        next: null,
        results: [{ id: 2, name: 'B', description: '', target_count: 1, progress: 1, completed_at: '2026-05-01T00:00:00Z' }],
      });

    const quests = await fetchQuests();
    expect(mockedGet).toHaveBeenCalledTimes(2);
    expect(mockedGet).toHaveBeenNthCalledWith(1, '/api/passport/quests/');
    expect(mockedGet).toHaveBeenNthCalledWith(2, '/api/passport/quests/?page=2');
    expect(quests.map((q) => q.id)).toEqual([1, 2]);
    expect(quests[1].is_completed).toBe(true);
  });

  it('returns an empty array when results is missing', async () => {
    mockedGet.mockResolvedValueOnce({ next: null });
    const quests = await fetchQuests();
    expect(quests).toEqual([]);
  });
});
