import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import AccountPage from '../pages/AccountPage';
import * as authService from '../services/authService';

jest.mock('../services/authService');

const mockUpdateUser = jest.fn();

const baseUser = {
  id: 1,
  username: 'alice',
  cultural_interests: ['Ottoman'],
  regional_ties: ['Aegean'],
  religious_preferences: ['Halal'],
  event_interests: ['Ramadan'],
};

function renderPage(user = baseUser) {
  return render(
    <AuthContext.Provider
      value={{ user, token: 'tok', login: jest.fn(), logout: jest.fn(), updateUser: mockUpdateUser }}
    >
      <MemoryRouter>
        <AccountPage />
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe('AccountPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authService.updateMe.mockResolvedValue({ ...baseUser });
  });

  it('renders saved preferences in view mode', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /my account/i })).toBeInTheDocument();
    expect(screen.getByText('Ottoman')).toBeInTheDocument();
    expect(screen.getByText('Aegean')).toBeInTheDocument();
    expect(screen.getByText('Halal')).toBeInTheDocument();
    expect(screen.getByText('Ramadan')).toBeInTheDocument();
  });

  it('shows "None selected" for empty preference lists', () => {
    const emptyUser = {
      ...baseUser,
      cultural_interests: [],
      regional_ties: [],
      religious_preferences: [],
      event_interests: [],
    };
    renderPage(emptyUser);
    const noneLabels = screen.getAllByText('None selected');
    expect(noneLabels).toHaveLength(4);
  });

  it('enters edit mode on Edit Preferences click', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /edit preferences/i }));
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('cancel returns to view mode without saving', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /edit preferences/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.getByRole('button', { name: /edit preferences/i })).toBeInTheDocument();
    expect(authService.updateMe).not.toHaveBeenCalled();
  });

  it('calls updateMe with current draft on Save Changes', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /edit preferences/i }));
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(authService.updateMe).toHaveBeenCalledWith({
      cultural_interests: ['Ottoman'],
      regional_ties: ['Aegean'],
      religious_preferences: ['Halal'],
      event_interests: ['Ramadan'],
    }));
    expect(mockUpdateUser).toHaveBeenCalled();
  });

  it('returns to view mode after successful save', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /edit preferences/i }));
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(screen.getByRole('button', { name: /edit preferences/i })).toBeInTheDocument());
  });

  it('shows error message if updateMe fails', async () => {
    authService.updateMe.mockRejectedValue(new Error('Network error'));
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /edit preferences/i }));
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(screen.getByText(/could not save preferences/i)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
  });

  it('toggles a chip in edit mode', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /edit preferences/i }));
    const anatolianLabel = screen.getByLabelText(/anatolian/i);
    expect(anatolianLabel).not.toBeChecked();
    fireEvent.click(anatolianLabel);
    expect(anatolianLabel).toBeChecked();
    fireEvent.click(anatolianLabel);
    expect(anatolianLabel).not.toBeChecked();
  });
});
