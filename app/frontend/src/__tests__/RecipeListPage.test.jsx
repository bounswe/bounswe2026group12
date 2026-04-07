import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RecipeListPage from '../pages/RecipeListPage';
import * as recipeService from '../services/recipeService';

jest.mock('../services/recipeService');

const mockRecipes = [
  { id: 1, title: 'Baklava', region: 'Aegean', thumbnail: null, author: { username: 'eren' } },
  { id: 2, title: 'Manti', region: 'Central Anatolia', thumbnail: null, author: { username: 'ahmet' } },
];

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/recipes']}>
      <Routes>
        <Route path="/recipes" element={<RecipeListPage />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => jest.clearAllMocks());

describe('RecipeListPage', () => {
  it('shows loading state initially', async () => {
    let resolveRecipes;
    recipeService.fetchRecipes.mockReturnValue(
      new Promise((resolve) => { resolveRecipes = resolve; })
    );
    renderPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    resolveRecipes([]);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
  });

  it('renders all recipe titles after load', async () => {
    recipeService.fetchRecipes.mockResolvedValue(mockRecipes);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Baklava')).toBeInTheDocument();
      expect(screen.getByText('Manti')).toBeInTheDocument();
    });
  });

  it('each recipe card links to /recipes/:id', async () => {
    recipeService.fetchRecipes.mockResolvedValue(mockRecipes);
    renderPage();
    await waitFor(() => screen.getByText('Baklava'));
    const links = screen.getAllByRole('link');
    const hrefs = links.map((l) => l.getAttribute('href'));
    expect(hrefs).toContain('/recipes/1');
    expect(hrefs).toContain('/recipes/2');
  });

  it('shows empty message when no recipes exist', async () => {
    recipeService.fetchRecipes.mockResolvedValue([]);
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/no recipes yet/i)).toBeInTheDocument()
    );
  });

  it('shows error message when API fails', async () => {
    recipeService.fetchRecipes.mockRejectedValue(new Error('fail'));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/could not load/i)).toBeInTheDocument()
    );
  });
});
