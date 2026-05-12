import React from 'react';
import { render } from '@testing-library/react-native';
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

  it('groups stamps by category and renders a section title per category', () => {
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
    expect(getByText('Anatolian')).toBeTruthy();
    expect(getByText('Black Sea')).toBeTruthy();
    expect(getByText('First Story')).toBeTruthy();
  });

  it('renders all category sections always open (no accordion)', () => {
    const stamps: Stamp[] = [
      stamp({ id: 1, name: 'Anatolian', category: 'heritage' }),
      stamp({ id: 2, name: 'Tale One', category: 'story', rarity: 'silver' }),
    ];
    const { getByText, getByTestId } = render(
      <StampCollection stamps={stamps} />,
    );
    // every group renders a grid container — items inside are visible without interaction
    expect(getByTestId('stamp-grid-heritage')).toBeTruthy();
    expect(getByTestId('stamp-grid-story')).toBeTruthy();
    expect(getByText('Anatolian')).toBeTruthy();
    expect(getByText('Tale One')).toBeTruthy();
  });

  it('puts each stamp inside its category grid as a StampCard', () => {
    const stamps: Stamp[] = [
      stamp({ id: 1, name: 'Anatolian', category: 'heritage' }),
      stamp({ id: 2, name: 'Black Sea', category: 'heritage' }),
    ];
    const { getByTestId } = render(<StampCollection stamps={stamps} />);
    const grid = getByTestId('stamp-grid-heritage');
    // both cards should be descendants of the heritage grid
    expect(getByTestId('stamp-card-1')).toBeTruthy();
    expect(getByTestId('stamp-card-2')).toBeTruthy();
    // grid uses row + wrap layout for the 2-column shape
    const style = Array.isArray(grid.props.style)
      ? Object.assign({}, ...grid.props.style.filter(Boolean))
      : grid.props.style;
    expect(style.flexDirection).toBe('row');
    expect(style.flexWrap).toBe('wrap');
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
    expect(
      getByLabelText('Hidden Heritage, Legendary, locked'),
    ).toBeTruthy();
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

  it('preserves source_recipe and source_story from API-shaped rows', () => {
    const s = normalizeStamp({
      id: 3,
      culture: 'Marmara',
      category: 'recipe',
      rarity: 'gold',
      earned_at: '2026-03-01T00:00:00Z',
      source_recipe: 12,
      source_story: 88,
    });
    expect(s.source_recipe).toBe(12);
    expect(s.source_story).toBe(88);
  });

  it('falls back to safe defaults for missing fields', () => {
    const s = normalizeStamp({});
    expect(s.name).toBe('Stamp');
    expect(s.category).toBe('other');
    expect(s.rarity).toBe('bronze');
    expect(s.earned_at).toBeNull();
    expect(s.source_recipe).toBeNull();
    expect(s.source_story).toBeNull();
  });
});
