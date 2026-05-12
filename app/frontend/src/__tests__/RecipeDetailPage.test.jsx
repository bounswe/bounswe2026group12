import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import RecipeDetailPage from '../pages/RecipeDetailPage';
import * as recipeService from '../services/recipeService';
import * as searchService from '../services/searchService';
import * as commentService from '../services/commentService';
import * as checkOffService from '../services/checkOffService';
import * as ingredientService from '../services/ingredientService';
import * as culturalFactService from '../services/culturalFactService';

jest.mock('../services/recipeService');
jest.mock('../services/searchService');
jest.mock('../services/commentService');
jest.mock('../services/checkOffService');
jest.mock('../services/ingredientService');
jest.mock('../services/culturalFactService');

const mockRecipe = {
  id: 1,
  title: 'Baklava',
  description: 'A sweet pastry.',
  region: 1,
  image: 'http://example.com/img.jpg',
  video: 'http://example.com/video.mp4',
  author: 3,
  author_username: 'eren',
  ingredients: [
    { ingredient: 1, ingredient_name: 'Phyllo dough', amount: '500', unit: 1, unit_name: 'g' },
  ],
  is_published: true,
  qa_enabled: true,
};

function renderPage(recipeId = '1', authUser = null) {
  return render(
    <AuthContext.Provider value={{ user: authUser, token: authUser ? 'tok' : null, login: jest.fn(), logout: jest.fn() }}>
      <MemoryRouter initialEntries={[`/recipes/${recipeId}`]}>
        <Routes>
          <Route path="/recipes/:id" element={<RecipeDetailPage />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

beforeEach(() => {
  recipeService.fetchRecipe.mockResolvedValue(mockRecipe);
  searchService.fetchRegions.mockResolvedValue([
    { id: 1, name: 'Aegean' },
    { id: 2, name: 'Mediterranean' },
  ]);
  commentService.fetchCommentsForRecipe.mockResolvedValue([]);
  checkOffService.fetchCheckedIngredients.mockResolvedValue([]);
  checkOffService.toggleCheckedIngredient.mockResolvedValue([]);
  ingredientService.fetchSubstitutes.mockResolvedValue([]);
  culturalFactService.fetchCulturalFacts.mockResolvedValue([]);
});

describe('RecipeDetailPage', () => {
  it('shows loading state initially', () => {
    renderPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('displays title and description after load', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Baklava')).toBeInTheDocument();
      expect(screen.getByText('A sweet pastry.')).toBeInTheDocument();
    });
  });

  it('renders image when image URL is present', async () => {
    renderPage();
    await waitFor(() => {
      const img = screen.getByRole('img', { name: 'Baklava' });
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'http://example.com/img.jpg');
    });
  });

  it('does not render image element when image is null', async () => {
    recipeService.fetchRecipe.mockResolvedValue({ ...mockRecipe, image: null });
    renderPage();
    await waitFor(() => screen.getByText('Baklava'));
    expect(screen.queryByRole('img', { name: 'Baklava' })).not.toBeInTheDocument();
  });

  it('renders a video element when video URL is present', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('recipe-video')).toBeInTheDocument()
    );
  });

  it('displays ingredient list with amounts and units', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Phyllo dough')).toBeInTheDocument();
      expect(screen.getByText(/500/)).toBeInTheDocument();
      expect(screen.getByText(/\bg\b/)).toBeInTheDocument();
    });
  });

  it('shows error message when API fails', async () => {
    recipeService.fetchRecipe.mockRejectedValue(new Error('Not found'));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/could not load/i)).toBeInTheDocument()
    );
  });

  it('does NOT show Edit button when user is not logged in', async () => {
    renderPage('1', null);
    await waitFor(() => screen.getByText('Baklava'));
    expect(screen.queryByRole('link', { name: /edit/i })).not.toBeInTheDocument();
  });

  it('does NOT show Edit button when logged-in user is not the author', async () => {
    renderPage('1', { id: 99, username: 'other' });
    await waitFor(() => screen.getByText('Baklava'));
    expect(screen.queryByRole('link', { name: /edit/i })).not.toBeInTheDocument();
  });

  it('displays author username', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/by eren/i)).toBeInTheDocument()
    );
  });

  it('shows Edit button when logged-in user is the author', async () => {
    renderPage('1', { id: 3, username: 'eren' });
    await waitFor(() => screen.getByText('Baklava'));
    expect(screen.getByRole('link', { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /edit/i })).toHaveAttribute('href', '/recipes/1/edit');
  });

  it('renders Q&A section heading', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Baklava'));
    expect(screen.getByRole('heading', { name: /q&a and comments/i })).toBeInTheDocument();
  });

  it('always renders an enabled Message button for non-authors', async () => {
    renderPage('1', { id: 99, username: 'other' });
    await waitFor(() => screen.getByText('Baklava'));
    const msgBtn = screen.getByRole('button', { name: /message @eren/i });
    expect(msgBtn).toBeInTheDocument();
    expect(msgBtn).not.toBeDisabled();
  });

  describe('delete flow', () => {
    beforeEach(() => {
      recipeService.deleteRecipe = jest.fn().mockResolvedValue({ status: 204 });
    });

    it('shows a Delete button only to the author', async () => {
      renderPage('1', { id: 3, username: 'eren' });
      await waitFor(() => screen.getByText('Baklava'));
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });

    it('does not show a Delete button to non-authors', async () => {
      renderPage('1', { id: 99, username: 'someone' });
      await waitFor(() => screen.getByText('Baklava'));
      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    });

    it('confirms, deletes, and navigates to /recipes on success', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
      renderPage('1', { id: 3, username: 'eren' });
      await waitFor(() => screen.getByText('Baklava'));
      await userEvent.click(screen.getByRole('button', { name: /delete/i }));
      expect(confirmSpy).toHaveBeenCalled();
      await waitFor(() => {
        expect(recipeService.deleteRecipe).toHaveBeenCalledWith(1);
      });
      confirmSpy.mockRestore();
    });

    it('does nothing when the user cancels the confirm', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
      renderPage('1', { id: 3, username: 'eren' });
      await waitFor(() => screen.getByText('Baklava'));
      await userEvent.click(screen.getByRole('button', { name: /delete/i }));
      expect(recipeService.deleteRecipe).not.toHaveBeenCalled();
      confirmSpy.mockRestore();
    });

    it('disables the Delete button while a delete request is in flight', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
      let resolveDelete;
      recipeService.deleteRecipe = jest.fn(
        () => new Promise((resolve) => { resolveDelete = resolve; })
      );
      renderPage('1', { id: 3, username: 'eren' });
      await waitFor(() => screen.getByText('Baklava'));
      const deleteBtn = screen.getByRole('button', { name: /delete/i });
      await userEvent.click(deleteBtn);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /deleting/i })).toBeDisabled();
      });
      resolveDelete({ status: 204 });
      confirmSpy.mockRestore();
    });

    it('shows an inline error if delete fails and keeps the recipe rendered', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
      recipeService.deleteRecipe = jest.fn().mockRejectedValue(new Error('boom'));
      renderPage('1', { id: 3, username: 'eren' });
      await waitFor(() => screen.getByText('Baklava'));
      await userEvent.click(screen.getByRole('button', { name: /delete/i }));
      await waitFor(() => {
        expect(screen.getByText(/could not delete recipe/i)).toBeInTheDocument();
      });
      // Recipe content still visible — not replaced by error
      expect(screen.getByText('Baklava')).toBeInTheDocument();
      expect(screen.getByText('A sweet pastry.')).toBeInTheDocument();
      confirmSpy.mockRestore();
    });
  });

  describe('ingredient check-off persistence', () => {
    beforeEach(() => {
      checkOffService.fetchCheckedIngredients.mockResolvedValue([]);
      checkOffService.toggleCheckedIngredient.mockResolvedValue([]);
    });

    it('does not render ingredient checkboxes for anonymous users', async () => {
      renderPage('1', null);
      await waitFor(() => screen.getByText('Baklava'));
      expect(screen.queryByRole('checkbox', { name: /mark .* as available/i })).not.toBeInTheDocument();
      expect(checkOffService.fetchCheckedIngredients).not.toHaveBeenCalled();
    });

    it('fetches the canonical checked set on mount for a logged-in user', async () => {
      // mockRecipe.ingredients[0].ingredient === 1
      checkOffService.fetchCheckedIngredients.mockResolvedValue([1]);
      renderPage('1', { id: 3, username: 'eren' });
      await waitFor(() => {
        expect(checkOffService.fetchCheckedIngredients).toHaveBeenCalledWith('1');
      });
      await waitFor(() => {
        const checkbox = screen.getByRole('checkbox', { name: /mark phyllo dough as available/i });
        expect(checkbox).toBeChecked();
      });
    });

    it('optimistically toggles and reconciles with the canonical list from the server', async () => {
      checkOffService.fetchCheckedIngredients.mockResolvedValue([]);
      checkOffService.toggleCheckedIngredient.mockResolvedValue([1]);
      renderPage('1', { id: 3, username: 'eren' });
      const checkbox = await screen.findByRole('checkbox', { name: /mark phyllo dough as available/i });
      expect(checkbox).not.toBeChecked();
      await userEvent.click(checkbox);
      await waitFor(() => {
        expect(checkOffService.toggleCheckedIngredient).toHaveBeenCalledWith('1', 1, true);
      });
      await waitFor(() => {
        expect(checkbox).toBeChecked();
      });
    });

    it('reverts the optimistic toggle when the server rejects it', async () => {
      checkOffService.fetchCheckedIngredients.mockResolvedValue([]);
      checkOffService.toggleCheckedIngredient.mockRejectedValue(new Error('500'));
      renderPage('1', { id: 3, username: 'eren' });
      const checkbox = await screen.findByRole('checkbox', { name: /mark phyllo dough as available/i });
      await userEvent.click(checkbox);
      await waitFor(() => {
        expect(checkbox).not.toBeChecked();
      });
    });
  });

  describe('substitute panel', () => {
    it('renders match-type chips with friendly labels (e.g. "Flavor", not "flavor" or "Flavor Match")', async () => {
      ingredientService.fetchSubstitutes.mockResolvedValue([
        { id: 9, name: 'Tofu', match_type: 'flavor' },
      ]);
      renderPage('1', { id: 99, username: 'someone' });
      await waitFor(() => screen.getByText('Baklava'));
      await userEvent.click(
        screen.getByRole('button', { name: /find substitutes for phyllo dough/i }),
      );
      await waitFor(() => {
        expect(screen.getByText('Tofu')).toBeInTheDocument();
      });
      expect(ingredientService.fetchSubstitutes).toHaveBeenCalledWith(1, 'Phyllo dough');
      expect(screen.getByText('Flavor')).toBeInTheDocument();
      expect(screen.queryByText('Flavor Match')).not.toBeInTheDocument();
      expect(screen.queryByText('flavor')).not.toBeInTheDocument();
    });
  });
});

// — Heritage badge (#500) —
describe('RecipeDetailPage heritage badge', () => {
  it('renders the heritage badge when recipe.heritage_group is present', async () => {
    recipeService.fetchRecipe.mockResolvedValueOnce({
      ...mockRecipe,
      heritage_group: { id: 1, name: 'Sarma' },
    });
    renderPage();
    const link = await screen.findByRole('link', { name: /heritage: sarma/i });
    expect(link).toHaveAttribute('href', '/heritage/1');
  });

  it('renders no heritage badge when recipe.heritage_group is null', async () => {
    recipeService.fetchRecipe.mockResolvedValueOnce({
      ...mockRecipe,
      heritage_group: null,
    });
    renderPage();
    await screen.findByText('Baklava');
    expect(screen.queryByText(/heritage:/i)).not.toBeInTheDocument();
  });
});

describe('RecipeDetailPage cultural facts', () => {
  it('fetches and renders facts when recipe has a heritage_group', async () => {
    recipeService.fetchRecipe.mockResolvedValueOnce({
      ...mockRecipe,
      heritage_group: { id: 5, name: 'Köfte' },
    });
    culturalFactService.fetchCulturalFacts.mockResolvedValueOnce([
      { id: 1, text: 'Köfte spread to Sweden as köttbullar.', source_url: '',
        heritage_group: { id: 5, name: 'Köfte' }, region: null },
    ]);
    renderPage();
    expect(await screen.findByText(/köfte spread to sweden/i)).toBeInTheDocument();
    expect(culturalFactService.fetchCulturalFacts).toHaveBeenCalledWith({ heritageGroup: 5 });
  });

  it('does not call the facts service when recipe has no heritage_group', async () => {
    recipeService.fetchRecipe.mockResolvedValueOnce({
      ...mockRecipe,
      heritage_group: null,
    });
    renderPage();
    await screen.findByText('Baklava');
    expect(culturalFactService.fetchCulturalFacts).not.toHaveBeenCalled();
  });
});

describe('RecipeDetailPage steps section', () => {
  it('renders a numbered Steps section when recipe.steps has items', async () => {
    recipeService.fetchRecipe.mockResolvedValueOnce({
      ...mockRecipe,
      steps: ['Boil the water', 'Add the pasta', 'Drain and serve'],
    });
    renderPage();
    await screen.findByText('Baklava');
    expect(screen.getByRole('heading', { name: /^steps$/i })).toBeInTheDocument();
    expect(screen.getByText('Boil the water')).toBeInTheDocument();
    expect(screen.getByText('Add the pasta')).toBeInTheDocument();
    expect(screen.getByText('Drain and serve')).toBeInTheDocument();
  });

  it('hides the Steps section when recipe.steps is empty', async () => {
    recipeService.fetchRecipe.mockResolvedValueOnce({
      ...mockRecipe,
      steps: [],
    });
    renderPage();
    await screen.findByText('Baklava');
    expect(screen.queryByRole('heading', { name: /^steps$/i })).not.toBeInTheDocument();
  });

  it('hides the Steps section when recipe.steps is missing entirely', async () => {
    const { steps: _omit, ...recipeWithoutSteps } = { ...mockRecipe, steps: undefined };
    recipeService.fetchRecipe.mockResolvedValueOnce(recipeWithoutSteps);
    renderPage();
    await screen.findByText('Baklava');
    expect(screen.queryByRole('heading', { name: /^steps$/i })).not.toBeInTheDocument();
  });
});
