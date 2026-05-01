import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import HomePage from '../pages/HomePage';
import * as searchService from '../services/searchService';
import * as culturalContentService from '../services/culturalContentService';

jest.mock('../services/searchService');
jest.mock('../services/culturalContentService');
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

beforeEach(() => {
  jest.clearAllMocks();
  searchService.fetchRegions.mockResolvedValue([
    { id: 1, name: 'Aegean' },
    { id: 2, name: 'Mediterranean' },
  ]);
  culturalContentService.fetchDailyCulturalContent.mockResolvedValue([
    { id: 10, title: 'Cultural Card', body: 'Body', tags: ['Aegean'] },
  ]);
});

function renderPage(user = null) {
  return render(
    <AuthContext.Provider value={{ user, token: user ? 'tok' : null, login: jest.fn(), logout: jest.fn(), updateUser: jest.fn() }}>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe('HomePage', () => {
  it('renders a search input', () => {
    renderPage();
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
  });

  it('renders a submit button', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
  });

  it('populates region dropdown from API', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Aegean' })).toBeInTheDocument();
    });
  });

  it('renders ingredient and meal type filter inputs', () => {
    renderPage();
    expect(screen.getByLabelText(/ingredient/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/meal type/i)).toBeInTheDocument();
  });

  it('navigates to /search with all params on submit', async () => {
    renderPage();
    await waitFor(() => screen.getByRole('option', { name: 'Aegean' }));

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'baklava' } });
    fireEvent.change(screen.getByLabelText(/region/i), { target: { value: 'Aegean' } });
    fireEvent.change(screen.getByLabelText(/ingredient/i), { target: { value: 'yogurt' } });
    fireEvent.change(screen.getByLabelText(/meal type/i), { target: { value: 'soup' } });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    expect(mockNavigate).toHaveBeenCalledWith(
      '/search?q=baklava&region=Aegean&ingredient=yogurt&meal_type=soup'
    );
  });

  it('navigates with empty params when no input is given', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /search/i }));
    expect(mockNavigate).toHaveBeenCalledWith(
      '/search?q=&region=&ingredient=&meal_type='
    );
  });

  it('shows onboarding nudge for logged-in users without onboarding data', () => {
    renderPage({ id: 1, username: 'u1', cultural_interests: [], regional_ties: [], religious_preferences: [], event_interests: [] });
    expect(screen.getByText(/personalize your feed/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /complete now/i })).toHaveAttribute('href', '/onboarding');
  });

  it('renders personalized daily cultural section for onboarded users', async () => {
    renderPage({ id: 1, username: 'u1', cultural_interests: ['Aegean'], regional_ties: [], religious_preferences: [], event_interests: [] });
    expect(await screen.findByRole('heading', { name: /for you: cultural highlights/i })).toBeInTheDocument();
    expect(screen.getByText('Cultural Card')).toBeInTheDocument();
  });
});
