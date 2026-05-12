import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import HomePage from '../pages/HomePage';
import * as searchService from '../services/searchService';
import * as culturalContentService from '../services/culturalContentService';
import * as culturalFactService from '../services/culturalFactService';

jest.mock('../services/searchService');
jest.mock('../services/culturalContentService');
jest.mock('../services/culturalFactService');
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
  culturalFactService.fetchRandomCulturalFact.mockResolvedValue({
    id: 99, text: 'Köfte traveled to Sweden.', source_url: '',
    heritage_group: null, region: null,
  });
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

  it('populates region chips from API', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Aegean' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Mediterranean' })).toBeInTheDocument();
    });
  });

  it('renders meal type chip buttons', () => {
    renderPage();
    expect(screen.getByRole('button', { name: 'Breakfast' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Soup' })).toBeInTheDocument();
  });

  it('navigates to /search with region and meal_type on submit', async () => {
    renderPage();
    await waitFor(() => screen.getByRole('button', { name: 'Aegean' }));

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'baklava' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aegean' }));
    fireEvent.click(screen.getByRole('button', { name: 'Soup' }));
    fireEvent.click(screen.getByRole('button', { name: /^search$/i }));

    expect(mockNavigate).toHaveBeenCalledWith(
      '/search?q=baklava&region=Aegean&meal_type=Soup'
    );
  });

  it('navigates with empty params when no input is given', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /^search$/i }));
    expect(mockNavigate).toHaveBeenCalledWith(
      '/search?q=&region=&meal_type='
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

describe('HomePage random cultural fact', () => {
  it('renders the random cultural fact when one is returned', async () => {
    renderPage();
    expect(await screen.findByText(/köfte traveled to sweden/i)).toBeInTheDocument();
  });

  it('renders nothing when fetchRandomCulturalFact resolves null', async () => {
    culturalFactService.fetchRandomCulturalFact.mockResolvedValueOnce(null);
    renderPage();
    // Wait for the page baseline to settle — region chips finish loading.
    await screen.findByRole('button', { name: 'Aegean' });
    expect(screen.queryByText(/köfte traveled to sweden/i)).not.toBeInTheDocument();
  });
});
