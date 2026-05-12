import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import HomePage from '../pages/HomePage';
import * as searchService from '../services/searchService';
import * as culturalContentService from '../services/culturalContentService';
import * as culturalFactService from '../services/culturalFactService';
import * as mapService from '../services/mapService';
import * as recipeService from '../services/recipeService';
import * as storyService from '../services/storyService';

jest.mock('../services/searchService');
jest.mock('../services/culturalContentService');
jest.mock('../services/culturalFactService');
jest.mock('../services/mapService');
jest.mock('../services/recipeService');
jest.mock('../services/storyService');
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
  mapService.fetchMapRegions.mockResolvedValue([]);
  recipeService.fetchFeaturedRecipes.mockResolvedValue([]);
  storyService.fetchFeaturedStories.mockResolvedValue([]);
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
    // Use findByRole so the assertion races with a single retried query
    // instead of waitFor polling — the latter interleaves with async state
    // updates from RandomCulturalFact and DailyCulturalSection and flakes.
    expect(await screen.findByRole('button', { name: 'Aegean' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mediterranean' })).toBeInTheDocument();
  });

  it('renders meal type chip buttons', () => {
    renderPage();
    expect(screen.getByRole('button', { name: 'Breakfast' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Soup' })).toBeInTheDocument();
  });

  it('navigates to /search with region, meal_type and story_type on submit', async () => {
    renderPage();
    await waitFor(() => screen.getByRole('button', { name: 'Aegean' }));

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'baklava' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aegean' }));
    fireEvent.click(screen.getByRole('button', { name: 'Soup' }));
    fireEvent.click(screen.getByRole('button', { name: 'Family' }));
    fireEvent.click(screen.getByRole('button', { name: /^search$/i }));

    expect(mockNavigate).toHaveBeenCalledWith(
      '/search?q=baklava&region=Aegean&meal_type=Soup&story_type=family'
    );
  });

  it('navigates with empty params when no input is given', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /^search$/i }));
    expect(mockNavigate).toHaveBeenCalledWith(
      '/search?q=&region=&meal_type=&story_type='
    );
  });

  it('renders Story Type chips that are enabled and clickable', () => {
    renderPage();
    const familyChip = screen.getByRole('button', { name: 'Family' });
    expect(familyChip).toBeEnabled();
    fireEvent.click(familyChip);
    expect(familyChip.className).toMatch(/active/);
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

describe('HomePage — redesign sections (#876)', () => {
  it('renders the Explore by region section', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: /explore by region/i })).toBeInTheDocument();
  });

  it("renders the This week's recipes and This week's stories rails", async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: /this week's recipes/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /this week's stories/i })).toBeInTheDocument();
  });

  it('renders the Feedback Bar with the prompt and Send button', async () => {
    renderPage();
    expect(await screen.findByLabelText(/what would you like to see on genipe/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
  });

  it('renders the closing brand banner', async () => {
    renderPage();
    expect(await screen.findByRole('region', { name: /sharing cultures/i })).toBeInTheDocument();
  });
});
