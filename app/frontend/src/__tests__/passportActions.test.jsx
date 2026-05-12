import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import RecipeDetailPage from '../pages/RecipeDetailPage';
import StoryDetailPage from '../pages/StoryDetailPage';
import * as recipeService from '../services/recipeService';
import * as searchService from '../services/searchService';
import * as commentService from '../services/commentService';
import * as checkOffService from '../services/checkOffService';
import * as ingredientService from '../services/ingredientService';
import * as culturalFactService from '../services/culturalFactService';
import * as storyService from '../services/storyService';
import * as passportService from '../services/passportService';

jest.mock('../services/recipeService');
jest.mock('../services/searchService');
jest.mock('../services/commentService');
jest.mock('../services/checkOffService');
jest.mock('../services/ingredientService');
jest.mock('../services/culturalFactService');
jest.mock('../services/storyService');
jest.mock('../services/passportService');

const mockRecipe = {
  id: 1,
  title: 'Baklava',
  description: 'A sweet pastry.',
  region: 1,
  author: 3,
  author_username: 'eren',
  ingredients: [],
  is_published: true,
  qa_enabled: false,
};

const mockStory = {
  id: 1,
  title: "Grandma's Sunday Kitchen",
  body: 'Every Sunday morning...',
  author: 3,
  author_username: 'eren',
  linked_recipe: null,
  is_published: true,
};

const loggedInUser = { id: 99, username: 'viewer' };

function renderRecipePage(authUser = null) {
  return render(
    <AuthContext.Provider value={{ user: authUser, token: authUser ? 'tok' : null, login: jest.fn(), logout: jest.fn() }}>
      <MemoryRouter initialEntries={['/recipes/1']}>
        <Routes>
          <Route path="/recipes/:id" element={<RecipeDetailPage />} />
          <Route path="/inbox" element={<div>Inbox</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

function renderStoryPage(authUser = null) {
  return render(
    <AuthContext.Provider value={{ user: authUser, token: authUser ? 'tok' : null, login: jest.fn(), logout: jest.fn() }}>
      <MemoryRouter initialEntries={['/stories/1']}>
        <Routes>
          <Route path="/stories/:id" element={<StoryDetailPage />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  recipeService.fetchRecipe.mockResolvedValue(mockRecipe);
  searchService.fetchRegions.mockResolvedValue([]);
  commentService.fetchCommentsForRecipe.mockResolvedValue([]);
  checkOffService.fetchCheckedIngredients.mockResolvedValue([]);
  checkOffService.toggleCheckedIngredient.mockResolvedValue([]);
  ingredientService.fetchSubstitutes.mockResolvedValue([]);
  culturalFactService.fetchCulturalFacts.mockResolvedValue([]);
  storyService.fetchStory.mockResolvedValue(mockStory);
  passportService.tryRecipe.mockResolvedValue({ status: 'ok' });
  passportService.saveStoryToPassport.mockResolvedValue({ status: 'ok' });
});

describe('Passport action buttons — RecipeDetailPage', () => {
  it('does not show I Tried This button when logged out', async () => {
    renderRecipePage(null);
    await waitFor(() => expect(screen.getByText('Baklava')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /i tried this/i })).not.toBeInTheDocument();
  });

  it('shows I Tried This button when logged in', async () => {
    renderRecipePage(loggedInUser);
    await waitFor(() => expect(screen.getByRole('button', { name: /i tried this/i })).toBeInTheDocument());
  });

  it('clicking I Tried This calls tryRecipe and disables the button', async () => {
    renderRecipePage(loggedInUser);
    await waitFor(() => expect(screen.getByRole('button', { name: /i tried this/i })).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /i tried this/i }));
    expect(passportService.tryRecipe).toHaveBeenCalledWith('1');
    await waitFor(() => expect(screen.getByRole('button', { name: /✓ i tried this/i })).toBeDisabled());
  });

  it('tryRecipe failure shows error, button stays clickable', async () => {
    passportService.tryRecipe.mockRejectedValue(new Error('fail'));
    renderRecipePage(loggedInUser);
    await waitFor(() => expect(screen.getByRole('button', { name: /i tried this/i })).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /i tried this/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /i tried this/i })).not.toBeDisabled();
  });

});

describe('Passport action buttons — StoryDetailPage', () => {
  it('does not show Save to Passport button when logged out', async () => {
    renderStoryPage(null);
    await waitFor(() => expect(screen.getByText("Grandma's Sunday Kitchen")).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /save to passport/i })).not.toBeInTheDocument();
  });

  it('shows Save to Passport button when logged in', async () => {
    renderStoryPage(loggedInUser);
    await waitFor(() => expect(screen.getByRole('button', { name: /save to passport/i })).toBeInTheDocument());
  });

  it('clicking Save to Passport calls saveStoryToPassport and disables the button', async () => {
    renderStoryPage(loggedInUser);
    await waitFor(() => expect(screen.getByRole('button', { name: /save to passport/i })).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /save to passport/i }));
    expect(passportService.saveStoryToPassport).toHaveBeenCalledWith(1);
    await waitFor(() => expect(screen.getByRole('button', { name: /✓ saved to passport/i })).toBeDisabled());
  });

  it('saveStoryToPassport failure shows error, button stays clickable', async () => {
    passportService.saveStoryToPassport.mockRejectedValue(new Error('fail'));
    renderStoryPage(loggedInUser);
    await waitFor(() => expect(screen.getByRole('button', { name: /save to passport/i })).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /save to passport/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /save to passport/i })).not.toBeDisabled();
  });
});
