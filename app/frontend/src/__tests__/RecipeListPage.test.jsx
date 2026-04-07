import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RecipeListPage from '../pages/RecipeListPage';
import * as recipeService from '../services/recipeService';

jest.mock('../services/recipeService');

const mockRecipes = [
  { id: 1, title: 'Baklava', region: 1, region_name: 'Aegean', image: null, author_username: 'eren' },
  { id: 2, title: 'Manti', region: 2, region_name: 'Central Anatolia', image: null, author_username: 'ahmet' },
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

  it('displays region name (not ID) on recipe cards', async () => {
    recipeService.fetchRecipes.mockResolvedValue(mockRecipes);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Aegean')).toBeInTheDocument();
      expect(screen.queryByText('1')).not.toBeInTheDocument();
    });
  });

  it('does not show region tag when region_name is absent', async () => {
    recipeService.fetchRecipes.mockResolvedValue([
      { id: 1, title: 'Baklava', region: null, region_name: null, image: null, author_username: 'eren' },
    ]);
    renderPage();
    await waitFor(() => screen.getByText('Baklava'));
    expect(screen.queryByRole('generic', { name: /region/i })).not.toBeInTheDocument();
  });

  it('renders recipe image when image is present', async () => {
    recipeService.fetchRecipes.mockResolvedValue([
      { id: 1, title: 'Baklava', region: 1, region_name: 'Aegean', image: 'http://example.com/img.jpg', author_username: 'eren' },
    ]);
    renderPage();
    await waitFor(() => {
      const img = screen.getByRole('img', { name: 'Baklava' });
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'http://example.com/img.jpg');
    });
  });

  it('shows error message when API fails', async () => {
    recipeService.fetchRecipes.mockRejectedValue(new Error('fail'));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/could not load/i)).toBeInTheDocument()
    );
  });
});
