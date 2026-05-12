import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

jest.mock('../../src/services/profileService', () => ({
  fetchOwnProfile: jest.fn(),
  updateOwnProfile: jest.fn(),
}));

const mockUpdateUser = jest.fn().mockResolvedValue(undefined);
jest.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '1', username: 'ayse', email: 'ayse@example.com' },
    updateUser: mockUpdateUser,
  }),
}));

const mockShowToast = jest.fn();
jest.mock('../../src/context/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

import EditProfileScreen from '../../src/screens/EditProfileScreen';
import {
  fetchOwnProfile,
  updateOwnProfile,
} from '../../src/services/profileService';

const mockedFetch = fetchOwnProfile as jest.MockedFunction<typeof fetchOwnProfile>;
const mockedUpdate = updateOwnProfile as jest.MockedFunction<typeof updateOwnProfile>;

function makeProps() {
  const navigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
    addListener: jest.fn(() => () => undefined),
  } as any;
  const route = { key: 'k', name: 'EditProfile', params: undefined } as any;
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
      <EditProfileScreen {...props} />
    </SafeAreaProvider>,
  );
  return { ...utils, ...props };
}

describe('EditProfileScreen', () => {
  beforeEach(() => {
    mockedFetch.mockReset();
    mockedUpdate.mockReset();
    mockUpdateUser.mockClear();
    mockShowToast.mockClear();
  });

  it('renders the fetched profile and prefills the bio and region inputs', async () => {
    mockedFetch.mockResolvedValueOnce({
      id: 1,
      username: 'ayse',
      email: 'ayse@example.com',
      bio: 'Black Sea cook.',
      region: 'Black Sea',
    });
    const { findByDisplayValue, getByText } = renderScreen();
    expect(await findByDisplayValue('Black Sea cook.')).toBeTruthy();
    expect(getByText('@ayse')).toBeTruthy();
    expect(getByText('ayse@example.com')).toBeTruthy();
  });

  it('calls updateOwnProfile with only the changed fields and navigates back on save', async () => {
    mockedFetch.mockResolvedValueOnce({
      id: 1,
      username: 'ayse',
      email: 'ayse@example.com',
      bio: 'Old bio',
      region: 'Aegean',
    });
    mockedUpdate.mockResolvedValueOnce({
      id: 1,
      username: 'ayse',
      email: 'ayse@example.com',
      bio: 'New bio',
      region: 'Aegean',
    });

    const { findByDisplayValue, getByLabelText, navigation } = renderScreen();

    const bioInput = await findByDisplayValue('Old bio');
    await act(async () => {
      fireEvent.changeText(bioInput, 'New bio');
    });

    const saveBtn = getByLabelText('Save profile');
    await act(async () => {
      fireEvent.press(saveBtn);
    });

    await waitFor(() => {
      expect(mockedUpdate).toHaveBeenCalledWith({ bio: 'New bio' });
    });
    expect(mockShowToast).toHaveBeenCalledWith('Profile updated', 'success');
    expect(navigation.goBack).toHaveBeenCalled();
  });
});
