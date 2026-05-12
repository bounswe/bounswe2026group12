import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import {
  StampCollection,
  normalizeStamp,
  type Stamp,
} from '../../src/components/passport/StampCollection';

const stamp = (over: Partial<Stamp> = {}): Stamp => ({
  id: 1,
  name: 'Anatolian',
  category: 'heritage',
  rarity: 'emerald',
  earned_at: '2026-03-10T12:00:00Z',
  ...over,
});

describe('StampCollection', () => {
  it('renders the empty state when there are no stamps', () => {
    const { getByText, getByLabelText } = render(<StampCollection stamps={[]} />);
    expect(getByLabelText('Stamp collection empty')).toBeTruthy();
    expect(
      getByText(
        'No stamps earned yet. Try recipes from a new region to earn your first.',
      ),
    ).toBeTruthy();
  });

  it('renders a loading state when loading', () => {
    const { getByLabelText } = render(
      <StampCollection stamps={[]} loading />,
    );
    expect(getByLabelText('Stamp collection loading')).toBeTruthy();
  });

  it('groups stamps by category and shows count badges', () => {
    const stamps: Stamp[] = [
      stamp({ id: 1, name: 'Anatolian', category: 'heritage' }),
      stamp({ id: 2, name: 'Black Sea', category: 'heritage' }),
      stamp({
        id: 3,
        name: 'First Story',
        category: 'story',
        rarity: 'bronze',
      }),
    ];
    const { getByText } = render(<StampCollection stamps={stamps} />);
    expect(getByText('Heritage')).toBeTruthy();
    expect(getByText('Story')).toBeTruthy();
    expect(getByText('2')).toBeTruthy();
    expect(getByText('1')).toBeTruthy();
    expect(getByText('Anatolian')).toBeTruthy();
    expect(getByText('First Story')).toBeTruthy();
  });

  it('formats earned date as "MMM YYYY"', () => {
    const { getByText } = render(
      <StampCollection
        stamps={[stamp({ earned_at: '2026-03-10T12:00:00Z' })]}
      />,
    );
    expect(getByText('Mar 2026')).toBeTruthy();
  });

  it('renders locked stamps with a lock glyph and no date', () => {
    const stamps: Stamp[] = [
      stamp({
        id: 9,
        name: 'Hidden Heritage',
        category: 'heritage',
        rarity: 'legendary',
        earned_at: null,
        is_locked: true,
      }),
    ];
    const { getByText, getByLabelText, queryByText } = render(
      <StampCollection stamps={stamps} />,
    );
    expect(getByText('🔒')).toBeTruthy();
    expect(queryByText(/2026/)).toBeNull();
    // a11y label includes "locked"
    expect(
      getByLabelText('Hidden Heritage, Legendary, locked'),
    ).toBeTruthy();
  });

  it('toggles a category open/closed when its header is pressed', () => {
    const stamps: Stamp[] = [
      stamp({ id: 1, name: 'Anatolian', category: 'heritage' }),
    ];
    const { getByLabelText, queryByText } = render(
      <StampCollection stamps={stamps} />,
    );
    expect(queryByText('Anatolian')).toBeTruthy();
    fireEvent.press(getByLabelText('Heritage stamps, 1 expanded'));
    expect(queryByText('Anatolian')).toBeNull();
    fireEvent.press(getByLabelText('Heritage stamps, 1 collapsed'));
    expect(queryByText('Anatolian')).toBeTruthy();
  });

  it('exposes accessibility labels with name, rarity and status', () => {
    const stamps: Stamp[] = [
      stamp({
        id: 1,
        name: 'Anatolian',
        rarity: 'gold',
        earned_at: '2026-01-05T00:00:00Z',
      }),
    ];
    const { getByLabelText } = render(<StampCollection stamps={stamps} />);
    expect(getByLabelText('Anatolian, Gold, earned Jan 2026')).toBeTruthy();
  });
});

describe('normalizeStamp', () => {
  it('aliases backend culture/kind/unlocked_at keys', () => {
    const s = normalizeStamp({
      id: 7,
      culture: 'Black Sea',
      kind: 'heritage',
      tier: 'emerald',
      unlocked_at: '2026-02-01T00:00:00Z',
    });
    expect(s.name).toBe('Black Sea');
    expect(s.category).toBe('heritage');
    expect(s.rarity).toBe('emerald');
    expect(s.earned_at).toBe('2026-02-01T00:00:00Z');
  });

  it('prefers explicit name/category/rarity/earned_at when present', () => {
    const s = normalizeStamp({
      id: 1,
      name: 'Explicit',
      culture: 'Ignored',
      category: 'story',
      kind: 'recipe',
      rarity: 'silver',
      earned_at: '2026-04-04T00:00:00Z',
    });
    expect(s.name).toBe('Explicit');
    expect(s.category).toBe('story');
    expect(s.rarity).toBe('silver');
    expect(s.earned_at).toBe('2026-04-04T00:00:00Z');
  });

  it('falls back to safe defaults for missing fields', () => {
    const s = normalizeStamp({});
    expect(s.name).toBe('Stamp');
    expect(s.category).toBe('other');
    expect(s.rarity).toBe('bronze');
    expect(s.earned_at).toBeNull();
  });
});
