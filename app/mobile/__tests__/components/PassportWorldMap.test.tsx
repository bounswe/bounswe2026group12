import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import * as ReactNavigation from '@react-navigation/native';

// Mock react-native-maps — forward pinColor for colour tests and onPress for selection.
jest.mock('react-native-maps', () => {
  const ReactInner = require('react');
  const { View: RNView } = require('react-native');
  const MapView = ReactInner.forwardRef(({ children, ...rest }: any, ref: any) => {
    ReactInner.useImperativeHandle(ref, () => ({
      fitToCoordinates: jest.fn(),
      animateToRegion: jest.fn(),
    }));
    return ReactInner.createElement(RNView, { ref, ...rest, testID: rest.testID ?? 'mock-map' }, children);
  });
  const Marker = (props: any) =>
    ReactInner.createElement(RNView, {
      testID: props.testID ?? 'marker',
      accessibilityLabel: `marker:${props.pinColor ?? ''}`,
      onPress: props.onPress,
    }, props.children);
  return { __esModule: true, default: MapView, MapView, Marker };
});

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

import { PassportWorldMap, recipeAndStoryIdsForCulture, type CultureSummary } from '../../src/components/passport/PassportWorldMap';
import type { Stamp } from '../../src/components/passport/StampCollection';

function makeCulture(over: Partial<CultureSummary>): CultureSummary {
  return {
    culture_name: 'Aegean',
    stamp_rarity: 'bronze',
    recipes_tried: 0,
    stories_saved: 0,
    ingredients_discovered: 0,
    heritage_recipes: 0,
    ...over,
  };
}

describe('recipeAndStoryIdsForCulture', () => {
  it('returns nulls when stamps are missing', () => {
    expect(recipeAndStoryIdsForCulture(undefined, 'Aegean')).toEqual({
      recipeId: null,
      storyId: null,
    });
  });

  it('matches stamp culture name case-insensitively and prefers latest earned', () => {
    const stamps = [
      {
        id: 1,
        name: 'aegean',
        category: 'recipe',
        rarity: 'bronze',
        earned_at: '2026-01-01T00:00:00Z',
        source_recipe: 10,
        source_story: null,
      },
      {
        id: 2,
        name: 'Aegean',
        category: 'story',
        rarity: 'silver',
        earned_at: '2026-06-01T00:00:00Z',
        source_recipe: 99,
        source_story: 7,
      },
    ] as Stamp[];
    expect(recipeAndStoryIdsForCulture(stamps, 'Aegean')).toEqual({
      recipeId: '99',
      storyId: '7',
    });
  });
});

describe('PassportWorldMap', () => {
  beforeEach(() => {
    (ReactNavigation.useNavigation as jest.Mock).mockReturnValue({
      navigate: jest.fn(),
    });
  });

  it('renders one Marker per culture with engagement + known coords', () => {
    const cultures: CultureSummary[] = [
      makeCulture({ culture_name: 'Aegean', stamp_rarity: 'silver', stories_saved: 2 }),
      makeCulture({ culture_name: 'Marmara', stamp_rarity: 'bronze', recipes_tried: 1 }),
      makeCulture({ culture_name: 'Anatolian', stamp_rarity: 'emerald', heritage_recipes: 1 }),
    ];
    const { getByTestId } = render(<PassportWorldMap cultures={cultures} />);
    expect(getByTestId('passport-pin-Aegean')).toBeTruthy();
    expect(getByTestId('passport-pin-Marmara')).toBeTruthy();
    expect(getByTestId('passport-pin-Anatolian')).toBeTruthy();
  });

  it('skips cultures with no engagement (level 0)', () => {
    const cultures: CultureSummary[] = [
      makeCulture({ culture_name: 'Aegean', stamp_rarity: '', recipes_tried: 0, stories_saved: 0 }),
      makeCulture({ culture_name: 'Marmara', stamp_rarity: 'bronze', recipes_tried: 1 }),
    ];
    const { queryByTestId } = render(<PassportWorldMap cultures={cultures} />);
    expect(queryByTestId('passport-pin-Aegean')).toBeNull();
    expect(queryByTestId('passport-pin-Marmara')).toBeTruthy();
  });

  it('skips cultures whose name has no regionGeo centroid', () => {
    const cultures: CultureSummary[] = [
      makeCulture({ culture_name: 'Atlantis', stamp_rarity: 'emerald' }),
      makeCulture({ culture_name: 'Anatolian', stamp_rarity: 'emerald' }),
    ];
    const { queryByTestId } = render(<PassportWorldMap cultures={cultures} />);
    expect(queryByTestId('passport-pin-Atlantis')).toBeNull();
    expect(queryByTestId('passport-pin-Anatolian')).toBeTruthy();
  });

  it('colours each pin by engagement level (silver / bronze / emerald / purple)', () => {
    const cultures: CultureSummary[] = [
      makeCulture({ culture_name: 'Aegean', stamp_rarity: 'silver' }),
      makeCulture({ culture_name: 'Marmara', stamp_rarity: 'bronze' }),
      makeCulture({ culture_name: 'Anatolian', stamp_rarity: 'emerald' }),
      makeCulture({ culture_name: 'Persian', stamp_rarity: 'legendary' }),
    ];
    const { getByTestId } = render(<PassportWorldMap cultures={cultures} />);
    expect(getByTestId('passport-pin-Aegean').props.accessibilityLabel).toContain('#C0C0C0');
    expect(getByTestId('passport-pin-Marmara').props.accessibilityLabel).toContain('#CD7F32');
    expect(getByTestId('passport-pin-Anatolian').props.accessibilityLabel).toContain('#50C878');
    expect(getByTestId('passport-pin-Persian').props.accessibilityLabel).toContain('#9B59B6');
  });

  it('renders the empty banner when no pins are placeable', () => {
    const { getByText } = render(<PassportWorldMap cultures={[]} />);
    expect(getByText(/No cultures with map coordinates yet/i)).toBeTruthy();
  });

  it('opens selection card on marker press and shows link buttons when stamps have ids', () => {
    const navigate = jest.fn();
    (ReactNavigation.useNavigation as jest.Mock).mockReturnValue({ navigate });
    const stamps = [
      {
        id: 1,
        name: 'Aegean',
        category: 'recipe',
        rarity: 'bronze',
        earned_at: '2026-01-01T00:00:00Z',
        source_recipe: 42,
        source_story: 5,
      },
    ] as Stamp[];
    const cultures: CultureSummary[] = [
      makeCulture({ culture_name: 'Aegean', stamp_rarity: 'silver', stories_saved: 1 }),
    ];
    const { getByTestId, getByText } = render(<PassportWorldMap cultures={cultures} stamps={stamps} />);
    fireEvent.press(getByTestId('passport-pin-Aegean'));
    expect(getByTestId('passport-map-selection-card')).toBeTruthy();
    expect(getByText('Open recipe →')).toBeTruthy();
    expect(getByText('Open story →')).toBeTruthy();
  });

  it('navigates to recipe when Open recipe is pressed', () => {
    const navigate = jest.fn();
    (ReactNavigation.useNavigation as jest.Mock).mockReturnValue({ navigate });
    const stamps = [
      {
        id: 1,
        name: 'Aegean',
        category: 'recipe',
        rarity: 'bronze',
        earned_at: '2026-01-01T00:00:00Z',
        source_recipe: 42,
        source_story: null,
      },
    ] as Stamp[];
    const cultures: CultureSummary[] = [
      makeCulture({ culture_name: 'Aegean', stamp_rarity: 'silver', stories_saved: 1 }),
    ];
    const { getByTestId, getByText } = render(<PassportWorldMap cultures={cultures} stamps={stamps} />);
    fireEvent.press(getByTestId('passport-pin-Aegean'));
    fireEvent.press(getByText('Open recipe →'));
    expect(navigate).toHaveBeenCalledWith('RecipeDetail', { id: '42' });
  });
});
