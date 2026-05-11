import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import OnboardingPage from '../pages/OnboardingPage';
import * as authService from '../services/authService';

jest.mock('../services/authService');

const mockUpdateUser = jest.fn();
const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

function renderPage() {
  return render(
    <AuthContext.Provider
      value={{
        user: { id: 1, username: 'alice', cultural_interests: [], regional_ties: [], religious_preferences: [], event_interests: [] },
        token: 'tok',
        login: jest.fn(),
        logout: jest.fn(),
        updateUser: mockUpdateUser,
      }}
    >
      <MemoryRouter>
        <OnboardingPage />
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe('OnboardingPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authService.updateMe.mockResolvedValue({
      id: 1,
      username: 'alice',
      cultural_interests: ['Ottoman'],
      regional_ties: ['Aegean'],
      religious_preferences: ['Halal'],
      event_interests: ['Ramadan'],
    });
  });

  it('renders first onboarding step', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /cultural onboarding/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /cultural interests/i })).toBeInTheDocument();
  });

  it('supports skip path', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /skip for now/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('submits all preference fields on finish', async () => {
    renderPage();

    fireEvent.click(screen.getByLabelText(/ottoman/i));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.click(screen.getByLabelText(/aegean/i));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.click(screen.getByLabelText(/halal/i));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.click(screen.getByLabelText(/ramadan/i));
    fireEvent.click(screen.getByRole('button', { name: /finish/i }));

    await waitFor(() => expect(authService.updateMe).toHaveBeenCalledWith({
      cultural_interests: ['Ottoman'],
      regional_ties: ['Aegean'],
      religious_preferences: ['Halal'],
      event_interests: ['Ramadan'],
    }));
    expect(mockUpdateUser).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('keeps Finish disabled until at least one selection in each step', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByRole('button', { name: /finish/i })).toBeDisabled();
  });

  it('enables Finish once every step has at least one selection', () => {
    renderPage();
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    expect(screen.getByRole('button', { name: /finish/i })).not.toBeDisabled();
  });
});

