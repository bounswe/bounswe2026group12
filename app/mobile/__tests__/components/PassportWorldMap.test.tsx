import React from 'react';
import { View, Text } from 'react-native';
import { render } from '@testing-library/react-native';

// Mock react-native-maps with plain RN views so jest-expo (jsdom-ish RN env)
// can render the component without the native module. We forward `pinColor`,
// `coordinate`, `title`, `description` and `testID` so the tests can still
// assert on pin count + colour computation through props.
jest.mock('react-native-maps', () => {
  const ReactInner = require('react');
  const { View: RNView, Text: RNText } = require('react-native');
  const MapView = ReactInner.forwardRef(
    ({ children, ...rest }: any, ref: any) =>
      ReactInner.createElement(RNView, { ref, ...rest, testID: rest.testID ?? 'mock-map' }, children),
  );
  const Marker = (props: any) =>
    ReactInner.createElement(
      RNView,
      {
        testID: props.testID ?? `marker-${props.title ?? ''}`,
        accessibilityLabel: `marker:${props.title ?? ''}:${props.pinColor ?? ''}`,
      },
      props.children,
    );
  const Callout = (props: any) => ReactInner.createElement(RNView, null, props.children);
  return { __esModule: true, default: MapView, MapView, Marker, Callout };
});

import { PassportWorldMap, type CultureSummary } from '../../src/components/passport/PassportWorldMap';

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

describe('PassportWorldMap', () => {
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
});

// Silence the unused-import warning when this file is tree-shaken in CI.
export const _keepAlive = { View, Text };
