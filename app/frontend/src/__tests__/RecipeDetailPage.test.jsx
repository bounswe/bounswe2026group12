import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import RecipeDetailPage from '../pages/RecipeDetailPage';
import * as recipeService from '../services/recipeService';
import * as searchService from '../services/searchService';
import * as commentService from '../services/commentService';

jest.mock('../services/recipeService');
jest.mock('../services/searchService');
jest.mock('../services/commentService');

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

  it('shows disabled messaging button when author is not contactable', async () => {
    recipeService.fetchRecipe.mockResolvedValue({
      ...mockRecipe,
      author_is_contactable: false,
    });
    renderPage('1', { id: 99, username: 'other' });
    await waitFor(() => screen.getByText('Baklava'));
    expect(screen.getByRole('button', { name: /messaging disabled by author/i })).toBeDisabled();
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
  });
});
