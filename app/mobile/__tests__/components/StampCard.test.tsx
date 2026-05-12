import React from 'react';
import { render } from '@testing-library/react-native';
import StampCard from '../../src/components/passport/StampCard';
import type { Stamp } from '../../src/components/passport/StampCollection';

const RARITY_COLOURS: Record<string, string> = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  emerald: '#50C878',
  legendary: '#9B59B6',
};

const make = (over: Partial<Stamp> = {}): Stamp => ({
  id: 1,
  name: 'Anatolian',
  category: 'heritage',
  rarity: 'gold',
  earned_at: '2026-03-10T12:00:00Z',
  ...over,
});

describe('StampCard', () => {
  it('renders earned stamp with name, rarity label and MMM YYYY date', () => {
    const { getByText, queryByText } = render(
      <StampCard stamp={make({ rarity: 'gold' })} />,
    );
    expect(getByText('Anatolian')).toBeTruthy();
    expect(getByText('Gold')).toBeTruthy();
    expect(getByText('Mar 2026')).toBeTruthy();
    expect(queryByText('🔒')).toBeNull();
  });

  it('renders locked stamp with 🔒 instead of date', () => {
    const { getByText, queryByText } = render(
      <StampCard
        stamp={make({
          id: 9,
          name: 'Hidden',
          rarity: 'legendary',
          earned_at: null,
          is_locked: true,
        })}
      />,
    );
    expect(getByText('🔒')).toBeTruthy();
    expect(queryByText(/2026/)).toBeNull();
  });

  it('respects explicit locked prop over earned_at', () => {
    const { getByText } = render(
      <StampCard stamp={make()} locked />,
    );
    expect(getByText('🔒')).toBeTruthy();
  });

  it('exposes accessibilityLabel with name, rarity and earned status', () => {
    const { getByLabelText } = render(
      <StampCard
        stamp={make({
          name: 'Anatolian',
          rarity: 'gold',
          earned_at: '2026-01-05T00:00:00Z',
        })}
      />,
    );
    expect(getByLabelText('Anatolian, Gold, earned Jan 2026')).toBeTruthy();
  });

  it('exposes accessibilityLabel with locked status when locked', () => {
    const { getByLabelText } = render(
      <StampCard
        stamp={make({
          name: 'Hidden Heritage',
          rarity: 'legendary',
          earned_at: null,
          is_locked: true,
        })}
      />,
    );
    expect(
      getByLabelText('Hidden Heritage, Legendary, locked'),
    ).toBeTruthy();
  });

  describe('rarity colours', () => {
    (['bronze', 'silver', 'gold', 'emerald', 'legendary'] as const).forEach(
      (rarity) => {
        it(`applies the ${rarity} colour as the card border`, () => {
          const { getByTestId } = render(
            <StampCard stamp={make({ id: rarity, rarity })} />,
          );
          const card = getByTestId(`stamp-card-${rarity}`);
          const style = Array.isArray(card.props.style)
            ? Object.assign({}, ...card.props.style.filter(Boolean))
            : card.props.style;
          expect(style.borderColor).toBe(RARITY_COLOURS[rarity]);
        });
      },
    );

    it('falls back to a default border colour for unknown rarities', () => {
      const { getByTestId } = render(
        <StampCard stamp={make({ id: 'mystery', rarity: 'mythic' })} />,
      );
      const card = getByTestId('stamp-card-mystery');
      const style = Array.isArray(card.props.style)
        ? Object.assign({}, ...card.props.style.filter(Boolean))
        : card.props.style;
      expect(typeof style.borderColor).toBe('string');
      expect(style.borderColor.length).toBeGreaterThan(0);
    });
  });
});
