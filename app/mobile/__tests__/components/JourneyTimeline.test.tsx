// Mock the service entirely — pulling in `requireActual` would transitively
// load httpClient which imports AsyncStorage and blows up in jest-expo.
jest.mock('../../src/services/passportTimelineService', () => ({
  fetchTimeline: jest.fn(),
  __resetTimelineCacheForTests: jest.fn(),
  normalizeEvent: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import {
  JourneyTimeline,
  composeTitle,
  extractRelatedIds,
  formatTimeAgo,
} from '../../src/components/passport/JourneyTimeline';
import {
  fetchTimeline,
  type TimelineEvent,
} from '../../src/services/passportTimelineService';

const mockedFetch = fetchTimeline as jest.MockedFunction<typeof fetchTimeline>;

const makeEvent = (over: Partial<TimelineEvent> = {}): TimelineEvent => ({
  id: 1,
  event_type: 'recipe_tried',
  message: 'Tried Sarma',
  created_at: '2026-05-10T12:00:00Z',
  ...over,
});

describe('formatTimeAgo', () => {
  const now = new Date('2026-05-12T12:00:00Z');

  it('returns `now` for sub-minute deltas', () => {
    expect(formatTimeAgo('2026-05-12T11:59:30Z', now)).toBe('now');
  });

  it('returns minutes for sub-hour deltas', () => {
    expect(formatTimeAgo('2026-05-12T11:45:00Z', now)).toBe('15m');
  });

  it('returns hours for sub-day deltas', () => {
    expect(formatTimeAgo('2026-05-12T08:00:00Z', now)).toBe('4h');
  });

  it('returns Yesterday for one-day-old events', () => {
    expect(formatTimeAgo('2026-05-11T10:00:00Z', now)).toBe('Yesterday');
  });

  it('returns Mon D once we cross a week', () => {
    expect(formatTimeAgo('2026-03-14T12:00:00Z', now)).toBe('Mar 14');
  });

  it('handles garbage input gracefully', () => {
    expect(formatTimeAgo('not-a-date', now)).toBe('');
    expect(formatTimeAgo('', now)).toBe('');
  });
});

describe('composeTitle', () => {
  it('uses the server message when present', () => {
    expect(composeTitle(makeEvent({ message: 'Server says hi' }))).toBe('Server says hi');
  });

  it('falls back to recipe payload', () => {
    expect(
      composeTitle(
        makeEvent({
          message: undefined,
          event_type: 'recipe_tried',
          payload: { recipe_title: 'Mantı' },
        }),
      ),
    ).toBe('Tried Mantı');
  });

  it('handles unknown event types with a generic title', () => {
    expect(composeTitle(makeEvent({ message: undefined, event_type: 'mystery' }))).toBe(
      'New journey event',
    );
  });
});

describe('extractRelatedIds', () => {
  it('finds related_recipe id', () => {
    expect(
      extractRelatedIds(makeEvent({ payload: { related_recipe: 42 } })),
    ).toEqual({ recipeId: 42, storyId: null });
  });

  it('finds story id under linked_story', () => {
    expect(
      extractRelatedIds(makeEvent({ payload: { linked_story: '7' } })),
    ).toEqual({ recipeId: null, storyId: 7 });
  });

  it('returns nulls when payload is empty', () => {
    expect(extractRelatedIds(makeEvent({ payload: {} }))).toEqual({
      recipeId: null,
      storyId: null,
    });
  });

  it('ignores non-positive or non-numeric values', () => {
    expect(
      extractRelatedIds(
        makeEvent({ payload: { related_recipe: 0, related_story: 'abc' } }),
      ),
    ).toEqual({ recipeId: null, storyId: null });
  });
});

describe('JourneyTimeline', () => {
  beforeEach(() => {
    mockedFetch.mockReset();
    mockNavigate.mockReset();
  });

  it('renders the empty state when there are no events', async () => {
    mockedFetch.mockResolvedValueOnce({ events: [], nextCursor: null });
    const { findByText } = render(<JourneyTimeline username="ayse" />);
    expect(await findByText('No journey events yet.')).toBeTruthy();
  });

  it('renders the correct icon for each event type', async () => {
    const events: TimelineEvent[] = [
      makeEvent({ id: 1, event_type: 'stamp_earned', message: 'Got stamp' }),
      makeEvent({ id: 2, event_type: 'recipe_tried', message: 'Tried Sarma' }),
      makeEvent({ id: 3, event_type: 'story_saved', message: 'Saved story' }),
      makeEvent({ id: 4, event_type: 'quest_completed', message: 'Quest done' }),
      makeEvent({ id: 5, event_type: 'mystery', message: 'Strange thing' }),
    ];
    const { getByText } = render(<JourneyTimeline username="ayse" initialEvents={events} />);
    expect(getByText('🏷')).toBeTruthy();
    expect(getByText('🍴')).toBeTruthy();
    expect(getByText('📖')).toBeTruthy();
    expect(getByText('🏆')).toBeTruthy();
    expect(getByText('✨')).toBeTruthy();
    expect(getByText('Tried Sarma')).toBeTruthy();
  });

  it('skips the initial fetch when initialEvents is supplied', async () => {
    render(
      <JourneyTimeline
        username="ayse"
        initialEvents={[makeEvent({ id: 1, message: 'cached' })]}
      />,
    );
    // Let any pending microtasks settle.
    await waitFor(() => {
      expect(mockedFetch).not.toHaveBeenCalled();
    });
  });

  it('fetches on mount when no initialEvents are supplied', async () => {
    mockedFetch.mockResolvedValueOnce({
      events: [makeEvent({ id: 11, message: 'fresh' })],
      nextCursor: null,
    });
    const { findByText } = render(<JourneyTimeline username="ayse" />);
    expect(await findByText('fresh')).toBeTruthy();
    expect(mockedFetch).toHaveBeenCalledWith('ayse');
  });

  it('renders a Recipe pill when payload has related_recipe and tapping navigates', async () => {
    const ev = makeEvent({
      id: 21,
      message: 'Tried Sarma',
      payload: { related_recipe: 99 },
    });
    const { getByText } = render(
      <JourneyTimeline username="ayse" initialEvents={[ev]} />,
    );
    const pill = getByText('Recipe #99 →');
    expect(pill).toBeTruthy();
    fireEvent.press(pill);
    expect(mockNavigate).toHaveBeenCalledWith('RecipeDetail', { id: '99' });
  });

  it('renders both Recipe and Story pills when both ids are present', async () => {
    const ev = makeEvent({
      id: 22,
      message: 'Linked event',
      payload: { related_recipe: 5, related_story: 8 },
    });
    const { getByText } = render(
      <JourneyTimeline username="ayse" initialEvents={[ev]} />,
    );
    expect(getByText('Recipe #5 →')).toBeTruthy();
    const storyPill = getByText('Story #8 →');
    expect(storyPill).toBeTruthy();
    fireEvent.press(storyPill);
    expect(mockNavigate).toHaveBeenCalledWith('StoryDetail', { id: '8' });
  });

  it('renders no pill when payload has no related ids', async () => {
    const ev = makeEvent({ id: 23, message: 'Plain event', payload: {} });
    const { queryByText } = render(
      <JourneyTimeline username="ayse" initialEvents={[ev]} />,
    );
    expect(queryByText(/Recipe #/)).toBeNull();
    expect(queryByText(/Story #/)).toBeNull();
  });

  it('skips the Recipe pill when the message already mentions Recipe #', async () => {
    const ev = makeEvent({
      id: 24,
      message: 'Linked to Recipe #99 yesterday',
      payload: { related_recipe: 99 },
    });
    const { queryByText } = render(
      <JourneyTimeline username="ayse" initialEvents={[ev]} />,
    );
    expect(queryByText('Recipe #99 →')).toBeNull();
  });

  it('renders a time-ago label for recent events', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-12T12:00:00Z'));
    try {
      const ev = makeEvent({ created_at: '2026-05-12T11:55:00Z', message: 'just now' });
      const { getByText } = render(
        <JourneyTimeline username="ayse" initialEvents={[ev]} />,
      );
      expect(getByText('5m')).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });
});
