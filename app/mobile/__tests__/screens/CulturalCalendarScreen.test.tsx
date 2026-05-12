import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

jest.mock('../../src/services/httpClient', () => ({
  apiGetJson: jest.fn(),
}));

jest.mock('../../src/services/calendarService', () => {
  const actual = jest.requireActual('../../src/services/calendarService');
  return {
    ...actual,
    fetchCulturalEvents: jest.fn(),
  };
});

import CulturalCalendarScreen from '../../src/screens/CulturalCalendarScreen';
import { fetchCulturalEvents, type CulturalEvent } from '../../src/services/calendarService';

const mockedFetch = fetchCulturalEvents as jest.MockedFunction<typeof fetchCulturalEvents>;

function makeProps() {
  const navigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
    addListener: jest.fn(() => () => undefined),
  } as any;
  const route = { key: 'k', name: 'CulturalCalendar', params: undefined } as any;
  return { navigation, route };
}

function renderScreen() {
  const props = makeProps();
  const utils = render(
    <SafeAreaProvider initialMetrics={{
      frame: { x: 0, y: 0, width: 320, height: 640 },
      insets: { top: 0, left: 0, right: 0, bottom: 0 },
    }}>
      <CulturalCalendarScreen {...props} />
    </SafeAreaProvider>,
  );
  return { ...utils, ...props };
}

describe('CulturalCalendarScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-15T00:00:00Z'));
    mockedFetch.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders fetched events grouped under their resolved month', async () => {
    const events: CulturalEvent[] = [
      {
        id: 1,
        name: 'Nevruz',
        date_rule: 'fixed:03-21',
        region: { id: 1, name: 'Anatolian' },
        description: 'Spring equinox celebration.',
        recipes: [{ id: 100, title: 'Sumalak', region: 'Anatolian' }],
      },
      {
        id: 2,
        name: 'Ramadan',
        date_rule: 'lunar:ramadan',
        region: null,
        description: '',
        recipes: [],
      },
    ];
    mockedFetch.mockResolvedValueOnce(events);

    const { findByText, getByText } = renderScreen();

    expect(await findByText('Nevruz')).toBeTruthy();
    // Nevruz: March group label and day badge
    expect(getByText('March')).toBeTruthy();
    expect(getByText('21')).toBeTruthy();
    // Ramadan resolves to Feb 18 in 2026
    expect(getByText('Ramadan')).toBeTruthy();
    expect(getByText('February')).toBeTruthy();
    expect(getByText('18')).toBeTruthy();
    // Related recipe pill
    expect(getByText('Sumalak')).toBeTruthy();
  });

  it('renders an empty state when the service returns no events', async () => {
    mockedFetch.mockResolvedValueOnce([]);
    const { findByText } = renderScreen();
    expect(await findByText(/No events match the current filter/i)).toBeTruthy();
  });

  it('renders an error view when the service rejects', async () => {
    mockedFetch.mockRejectedValueOnce(new Error('network down'));
    const { findByText } = renderScreen();
    expect(await findByText('network down')).toBeTruthy();
  });
});
