import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

import { CultureGrid } from '../../src/components/passport/CultureGrid';
import type { CultureSummary } from '../../src/services/passportCultureService';

const makeCulture = (over: Partial<CultureSummary> = {}): CultureSummary => ({
  culture_name: 'Ottoman',
  stamp_rarity: 'gold',
  recipes_tried: 8,
  stories_saved: 3,
  ingredients_discovered: 0,
  heritage_recipes: 0,
  ...over,
});

describe('CultureGrid', () => {
  beforeEach(() => mockNavigate.mockReset());

  it('renders the empty-state copy when no cultures are provided', () => {
    const { getByText, queryByText } = render(<CultureGrid cultures={[]} username="ayse" />);
    expect(
      getByText('No cultures discovered yet. Try recipes from new regions to unlock cultures.'),
    ).toBeTruthy();
    expect(queryByText('Ottoman')).toBeNull();
  });

  it('renders one cell per culture', () => {
    const cultures = [
      makeCulture({ culture_name: 'Ottoman' }),
      makeCulture({ culture_name: 'Aegean', stamp_rarity: 'silver', recipes_tried: 5 }),
      makeCulture({ culture_name: 'Mediterranean', stamp_rarity: 'bronze', recipes_tried: 3 }),
    ];
    const { getByText } = render(<CultureGrid cultures={cultures} username="ayse" />);
    expect(getByText('Ottoman')).toBeTruthy();
    expect(getByText('Aegean')).toBeTruthy();
    expect(getByText('Mediterranean')).toBeTruthy();
  });

  it('navigates to CultureDetail when a cell is tapped', () => {
    const cultures = [makeCulture({ culture_name: 'Ottoman' })];
    const { getByLabelText } = render(<CultureGrid cultures={cultures} username="ayse" />);
    fireEvent.press(getByLabelText('Open culture Ottoman'));
    expect(mockNavigate).toHaveBeenCalledWith('CultureDetail', {
      username: 'ayse',
      cultureName: 'Ottoman',
    });
  });
});
