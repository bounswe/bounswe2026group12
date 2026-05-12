import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import SearchPage from '../pages/SearchPage';
import * as searchService from '../services/searchService';
import * as recipeService from '../services/recipeService';

jest.mock('../services/searchService');
jest.mock('../services/recipeService');

const mockResults = [
  { type: 'recipe', id: 1, title: 'Yogurt Soup', region: 'Black Sea', thumbnail: null },
  { type: 'recipe', id: 2, title: 'Yogurt Salad', region: 'Aegean', thumbnail: null },
  { type: 'story',  id: 3, title: "Grandma's Kitchen", region: 'Mediterranean', thumbnail: null },
];

function renderPage(search = '?q=&region=&ingredient=&meal_type=', user = null) {
  return render(
    <AuthContext.Provider value={{ user, token: user ? 'tok' : null, login: jest.fn(), logout: jest.fn(), updateUser: jest.fn() }}>
      <MemoryRouter initialEntries={[`/search${search}`]}>
        <Routes>
          <Route path="/search" element={<SearchPage />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  searchService.fetchRegions.mockResolvedValue([
    { id: 1, name: 'Aegean' },
    { id: 2, name: 'Mediterranean' },
  ]);
  recipeService.fetchDietaryTags.mockResolvedValue([
    { id: 1, name: 'Vegan' },
    { id: 2, name: 'Halal' },
  ]);
  recipeService.fetchEventTags.mockResolvedValue([
    { id: 1, name: 'Wedding' },
  ]);
  recipeService.fetchIngredients.mockResolvedValue([
    { id: 1, name: 'Tomato' },
    { id: 2, name: 'Onion' },
  ]);
});

describe('SearchPage', () => {
  it('shows loading state initially', () => {
    searchService.search.mockResolvedValue(mockResults);
    renderPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders result cards after API resolves', async () => {
    searchService.search.mockResolvedValue(mockResults);
    renderPage('?q=yogurt&region=&ingredient=&meal_type=');
    await waitFor(() => {
      expect(screen.getByText('Yogurt Soup')).toBeInTheDocument();
      expect(screen.getByText("Grandma's Kitchen")).toBeInTheDocument();
    });
  });

  it('combines q and ingredient into a single search call', async () => {
    searchService.search.mockResolvedValue([]);
    renderPage('?q=soup&region=Aegean&ingredient=Tomato&meal_type=');
    await waitFor(() => {
      expect(searchService.search).toHaveBeenCalledWith('soup', 'Aegean', '', {
        ingredient: 'Tomato',
        diet: '',
        event: '',
        meal_type: '',
      });
    });
  });

  it('passes meal_type server-side to the search API (#700)', async () => {
    searchService.search.mockResolvedValue([]);
    renderPage('?q=&region=&ingredient=yogurt&meal_type=breakfast');
    await waitFor(() => {
      expect(searchService.search).toHaveBeenCalledWith('', '', '', expect.objectContaining({
        ingredient: 'yogurt',
        meal_type: 'breakfast',
      }));
    });
  });

  it('applies story_type client-side to filter story results only', async () => {
    searchService.search.mockResolvedValue([
      { type: 'recipe', id: 1, title: 'Yogurt Soup', region: 'Black Sea', thumbnail: null },
      { type: 'story',  id: 2, title: 'Family Feast',  region: 'Aegean', story_type: 'family', thumbnail: null },
      { type: 'story',  id: 3, title: 'Old Customs',   region: 'Aegean', story_type: 'traditional', thumbnail: null },
    ]);
    renderPage('?q=&region=&ingredient=&meal_type=&story_type=family');
    await waitFor(() => screen.getByText('Family Feast'));
    expect(screen.getByText('Family Feast')).toBeInTheDocument();
    expect(screen.queryByText('Old Customs')).not.toBeInTheDocument();
    // Recipes are unaffected by story_type.
    expect(screen.getByText('Yogurt Soup')).toBeInTheDocument();
  });

  it('renders a story_type active-filter chip when the URL carries one', async () => {
    searchService.search.mockResolvedValue([]);
    renderPage('?q=&region=&ingredient=&meal_type=&story_type=festive');
    await waitFor(() => screen.getByText(/no results/i));
    expect(screen.getByText(/story type: festive/i)).toBeInTheDocument();
  });

  it('shows active filter chips for non-empty filters', async () => {
    searchService.search.mockResolvedValue([]);
    renderPage('?q=&region=Aegean&ingredient=yogurt&meal_type=');
    await waitFor(() => screen.getByText(/no results/i));
    expect(screen.getByText(/ingredient: yogurt/i)).toBeInTheDocument();
    expect(screen.getByText(/region: aegean/i)).toBeInTheDocument();
  });

  it('shows empty state message when no results returned', async () => {
    searchService.search.mockResolvedValue([]);
    renderPage('?q=xyz&region=&ingredient=&meal_type=');
    await waitFor(() => {
      expect(screen.getByText(/no results found/i)).toBeInTheDocument();
    });
  });

  it('shows error message when API fails', async () => {
    searchService.search.mockRejectedValue(new Error('Network Error'));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/could not load/i)).toBeInTheDocument();
    });
  });

  it('renders search input and region filter on the results page', async () => {
    searchService.search.mockResolvedValue([]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('searchbox')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });

  it('populates region dropdown from API on results page', async () => {
    searchService.search.mockResolvedValue([]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Aegean' })).toBeInTheDocument();
    });
  });

  it('search input is pre-filled with current query', async () => {
    searchService.search.mockResolvedValue([]);
    renderPage('?q=baklava&region=&language=');
    await waitFor(() => {
      expect(screen.getByRole('searchbox')).toHaveValue('baklava');
    });
  });

  it('submitting filter form triggers new search with updated params', async () => {
    searchService.search.mockResolvedValue([]);
    renderPage('?q=baklava&region=&language=');
    await waitFor(() => screen.getByRole('searchbox'));
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'soup' } });
    fireEvent.submit(screen.getByRole('form', { name: /refine search/i }));
    await waitFor(() => {
      expect(searchService.search).toHaveBeenCalledWith('soup', '', '', {
        ingredient: '',
        diet: '',
        event: '',
        meal_type: '',
      });
    });
  });

  it('shows personalization note when user has onboarding data', async () => {
    searchService.search.mockResolvedValue([]);
    renderPage('?q=baklava&region=&language=', { id: 1, cultural_interests: ['Aegean'] });
    expect(await screen.findByText(/ranked using your cultural onboarding profile/i)).toBeInTheDocument();
  });

  it('toggles a chip on click and includes it in the search params on submit', async () => {
    searchService.search.mockResolvedValue([]);
    renderPage('?q=&region=Aegean&ingredient=&meal_type=');
    const veganChip = await screen.findByRole('button', { name: 'Vegan' });
    fireEvent.click(veganChip);
    expect(veganChip).toHaveAttribute('aria-pressed', 'true');
    fireEvent.submit(screen.getByRole('form', { name: /refine search/i }));
    await waitFor(() => {
      expect(searchService.search).toHaveBeenLastCalledWith('', 'Aegean', '', {
        ingredient: '',
        diet: 'Vegan',
        event: '',
        meal_type: '',
      });
    });
    expect(screen.getByText(/diet: vegan/i)).toBeInTheDocument();
  });

  it('untoggles a chip when clicked a second time', async () => {
    searchService.search.mockResolvedValue([]);
    renderPage();
    const veganChip = await screen.findByRole('button', { name: 'Vegan' });
    fireEvent.click(veganChip);
    expect(veganChip).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(veganChip);
    expect(veganChip).toHaveAttribute('aria-pressed', 'false');
  });
});
