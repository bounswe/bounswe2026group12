import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';

jest.mock('../../src/services/recipeService', () => ({
  fetchRecipesList: jest.fn(async () => []),
}));
jest.mock('../../src/services/storyService', () => ({
  fetchStoriesList: jest.fn(async () => []),
}));
jest.mock('../../src/services/dailyCulturalService', () => ({
  fetchDailyCultural: jest.fn(async () => []),
}));
jest.mock('../../src/services/recommendationsService', () => ({
  fetchRecommendations: jest.fn(async () => []),
}));
jest.mock('../../src/services/notificationService', () => ({
  fetchUnreadCount: jest.fn(async () => 0),
}));

const mockNavigate = jest.fn();
const mockUseAuth = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  const ReactLocal = jest.requireActual('react');
  return {
    ...actual,
    useFocusEffect: (cb: () => void | (() => void)) => {
      ReactLocal.useEffect(() => {
        const cleanup = cb();
        return typeof cleanup === 'function' ? cleanup : undefined;
      }, []);
    },
  };
});

jest.mock('../../src/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

import HomeScreen from '../../src/screens/HomeScreen';
import { fetchUnreadCount } from '../../src/services/notificationService';

function makeProps() {
  const navigation = {
    navigate: mockNavigate,
    goBack: jest.fn(),
    setOptions: jest.fn(),
    addListener: jest.fn(() => () => undefined),
  } as any;
  const route = { key: 'k', name: 'Home', params: undefined } as any;
  return { navigation, route };
}

function renderScreen() {
  const props = makeProps();
  const utils = render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 320, height: 640 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <NavigationContainer>
        <HomeScreen {...props} />
      </NavigationContainer>
    </SafeAreaProvider>,
  );
  return { ...utils, ...props };
}

describe('HomeScreen notifications bell', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    (fetchUnreadCount as jest.Mock).mockReset();
    (fetchUnreadCount as jest.Mock).mockResolvedValue(0);
  });

  it('renders the bell for anonymous users and routes to Login on press', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, isReady: true });
    const { findByLabelText } = renderScreen();
    const bell = await findByLabelText('Open notifications');
    expect(bell).toBeTruthy();
    fireEvent.press(bell);
    expect(mockNavigate).toHaveBeenCalledWith('Login');
  });

  it('renders the bell for authenticated users and routes to Notifications on press', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isReady: true });
    (fetchUnreadCount as jest.Mock).mockResolvedValue(3);
    const { findByLabelText } = renderScreen();
    const bell = await findByLabelText('Open notifications');
    expect(bell).toBeTruthy();
    fireEvent.press(bell);
    expect(mockNavigate).toHaveBeenCalledWith('Notifications');
    await waitFor(() => expect(fetchUnreadCount).toHaveBeenCalled());
  });
});
