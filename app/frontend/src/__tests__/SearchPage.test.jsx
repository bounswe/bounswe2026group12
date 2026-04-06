import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SearchPage from '../pages/SearchPage';
import * as searchService from '../services/searchService';

jest.mock('../services/searchService');

const mockResults = [
  { type: 'recipe', id: 1, title: 'Baklava', region: 'Aegean', thumbnail: null },
  { type: 'story',  id: 2, title: "Grandma's Kitchen", region: 'Mediterranean', thumbnail: null },
];

function renderPage(search = '?q=baklava&region=&language=') {
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
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Baklava')).toBeInTheDocument();
      expect(screen.getByText("Grandma's Kitchen")).toBeInTheDocument();
    });
  });

  it('passes correct params to search service from URL', async () => {
    searchService.search.mockResolvedValue([]);
    renderPage('?q=soup&region=Aegean&language=en');
    await waitFor(() => {
      expect(searchService.search).toHaveBeenCalledWith('soup', 'Aegean', 'en');
    });
  });

  it('shows empty state message when no results returned', async () => {
    searchService.search.mockResolvedValue([]);
    renderPage('?q=xyz&region=&language=');
    await waitFor(() => {
      expect(screen.getByText(/no results found/i)).toBeInTheDocument();
    });
  });

  it('search heading remains visible after no-result search', async () => {
    searchService.search.mockResolvedValue([]);
    renderPage('?q=xyz&region=&language=');
    await waitFor(() => screen.getByText(/no results found/i));
    expect(screen.getByRole('heading', { name: /search/i })).toBeInTheDocument();
  });

  it('shows error message when API fails', async () => {
    searchService.search.mockRejectedValue(new Error('Network Error'));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/could not load/i)).toBeInTheDocument();
    });
  });
});
