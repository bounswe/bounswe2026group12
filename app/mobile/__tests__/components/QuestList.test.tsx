import React from 'react';
import { render } from '@testing-library/react-native';
import { QuestList, groupQuests } from '../../src/components/passport/QuestList';
import type { Quest } from '../../src/services/passportQuestService';

const makeQuest = (over: Partial<Quest> = {}): Quest => ({
  id: 1,
  name: 'Try three Black Sea recipes',
  description: 'Cook three dishes tagged Black Sea.',
  progress_current: 1,
  progress_target: 3,
  reward: 'marmara_blue',
  is_completed: false,
  event_end: null,
  ...over,
});

describe('groupQuests', () => {
  it('routes completed quests into the completed bucket', () => {
    const a = makeQuest({ id: 'a', is_completed: false });
    const b = makeQuest({ id: 'b', is_completed: true });
    const { active, completed } = groupQuests([a, b]);
    expect(active.map((q) => q.id)).toEqual(['a']);
    expect(completed.map((q) => q.id)).toEqual(['b']);
  });

  it('moves a quest between sections when is_completed flips', () => {
    const q = makeQuest({ id: 'q', is_completed: false });
    let groups = groupQuests([q]);
    expect(groups.active).toHaveLength(1);
    expect(groups.completed).toHaveLength(0);

    const flipped: Quest = { ...q, is_completed: true };
    groups = groupQuests([flipped]);
    expect(groups.active).toHaveLength(0);
    expect(groups.completed).toHaveLength(1);
  });
});

describe('<QuestList />', () => {
  it('shows the empty state when there are no active quests', () => {
    const { getByText, queryByText } = render(<QuestList quests={[]} />);
    expect(getByText(/no quests yet/i)).toBeTruthy();
    expect(queryByText('Completed quests')).toBeNull();
  });

  it('renders an active and a completed section with count badges', () => {
    const quests = [
      makeQuest({ id: 1, name: 'Active one', is_completed: false }),
      makeQuest({ id: 2, name: 'Done one', is_completed: true, progress_current: 3 }),
      makeQuest({ id: 3, name: 'Done two', is_completed: true, progress_current: 5, progress_target: 5 }),
    ];
    const { getByText, getAllByText } = render(<QuestList quests={quests} />);
    expect(getByText('Active quests')).toBeTruthy();
    expect(getByText('Completed quests')).toBeTruthy();
    expect(getByText('Active one')).toBeTruthy();
    expect(getByText('Done one')).toBeTruthy();
    // Count badges: 1 active + 2 completed
    expect(getAllByText('1').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText('2').length).toBeGreaterThanOrEqual(1);
  });

  it('renders the progress text "<current> / <target>" on each card', () => {
    const quests = [makeQuest({ progress_current: 2, progress_target: 4 })];
    const { getByText } = render(<QuestList quests={quests} />);
    expect(getByText('2 / 4')).toBeTruthy();
  });

  it('shows the reward chip when the quest has a reward', () => {
    const quests = [makeQuest({ reward: 'Black Sea Badge' })];
    const { getByText } = render(<QuestList quests={quests} />);
    expect(getByText(/🏆 Black Sea Badge/)).toBeTruthy();
  });

  it('renders the countdown for active event quests with a future end date', () => {
    const future = new Date(Date.now() + (2 * 24 * 60 + 3 * 60) * 60_000).toISOString();
    const quests = [makeQuest({ event_end: future })];
    const { getByText } = render(<QuestList quests={quests} />);
    // Format may have ticked a minute by render — match the "Ends in" prefix.
    expect(getByText(/^Ends in /)).toBeTruthy();
  });

  it('exposes accessibilityRole=progressbar on the progress track', () => {
    const quests = [makeQuest({ progress_current: 1, progress_target: 3 })];
    const { UNSAFE_getAllByProps } = render(<QuestList quests={quests} />);
    const bars = UNSAFE_getAllByProps({ accessibilityRole: 'progressbar' });
    expect(bars.length).toBeGreaterThan(0);
    expect(bars[0].props.accessibilityValue).toEqual({ min: 0, max: 3, now: 1 });
  });
});
