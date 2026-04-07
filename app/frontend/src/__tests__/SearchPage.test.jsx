import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SearchPage from '../pages/SearchPage';
import * as searchService from '../services/searchService';

jest.mock('../services/searchService');

const mockResults = [
  { type: 'recipe', id: 1, title: 'Yogurt Soup', region: 'Black Sea', thumbnail: null },
  { type: 'recipe', id: 2, title: 'Yogurt Salad', region: 'Aegean', thumbnail: null },
  { type: 'story',  id: 3, title: "Grandma's Kitchen", region: 'Mediterranean', thumbnail: null },
];

function renderPage(search = '?q=&region=&ingredient=&meal_type=') {
  return render(
    <MemoryRouter initialEntries={[`/search${search}`]}>
      <Routes>
        <Route path="/search" element={<SearchPage />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => jest.clearAllMocks());

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
    renderPage('?q=soup&region=Aegean&ingredient=yogurt&meal_type=');
    await waitFor(() => {
      expect(searchService.search).toHaveBeenCalledWith('soup yogurt', 'Aegean', '');
    });
  });

  it('applies meal_type client-side to filter results by title', async () => {
    searchService.search.mockResolvedValue(mockResults);
    renderPage('?q=&region=&ingredient=yogurt&meal_type=soup');
    await waitFor(() => screen.getByText('Yogurt Soup'));
    expect(screen.getByText('Yogurt Soup')).toBeInTheDocument();
    expect(screen.queryByText('Yogurt Salad')).not.toBeInTheDocument();
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
});
