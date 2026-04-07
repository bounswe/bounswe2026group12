import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import StoryEditPage from '../pages/StoryEditPage';
import { AuthContext } from '../context/AuthContext';
import * as storyService from '../services/storyService';
import * as recipeService from '../services/recipeService';

jest.mock('../services/storyService');
jest.mock('../services/recipeService');

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const authorUser = { id: 3, username: 'eren' };
const otherUser  = { id: 9, username: 'other' };

const mockStory = {
  id: 1,
  title: "Grandma's Kitchen",
  body: 'Some body text.',
  language: 'en',
  author: { id: 3, username: 'eren' },
  linked_recipe: null,
};

function renderPage(authUser = authorUser) {
  return render(
    <AuthContext.Provider value={{ user: authUser, token: 'tok', login: jest.fn(), logout: jest.fn() }}>
      <MemoryRouter initialEntries={['/stories/1/edit']}>
        <Routes>
          <Route path="/stories/:id/edit" element={<StoryEditPage />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  storyService.fetchStory.mockResolvedValue(mockStory);
  recipeService.fetchRecipes.mockResolvedValue([]);
});

describe('StoryEditPage', () => {
  it('shows loading state initially', async () => {
    let resolve;
    storyService.fetchStory.mockReturnValue(new Promise(r => { resolve = r; }));
    recipeService.fetchRecipes.mockResolvedValue([]);
    renderPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    resolve(mockStory);
    await waitFor(() => screen.getByDisplayValue("Grandma's Kitchen"));
  });

  it('pre-populates title and body from existing story', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByDisplayValue("Grandma's Kitchen")).toBeInTheDocument()
    );
    expect(screen.getByDisplayValue('Some body text.')).toBeInTheDocument();
  });

  it('shows unauthorized error when non-author accesses edit', async () => {
    renderPage(otherUser);
    await waitFor(() =>
      expect(screen.getByText(/not authorized/i)).toBeInTheDocument()
    );
  });

  it('shows title required error on empty submit', async () => {
    renderPage();
    await waitFor(() => screen.getByDisplayValue("Grandma's Kitchen"));
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(screen.getByText(/title is required/i)).toBeInTheDocument();
  });

  it('calls updateStory and shows success toast on valid save', async () => {
    storyService.updateStory.mockResolvedValue({ id: 1 });
    renderPage();
    await waitFor(() => screen.getByDisplayValue("Grandma's Kitchen"));
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() =>
      expect(screen.getByText(/story updated/i)).toBeInTheDocument()
    );
    expect(storyService.updateStory).toHaveBeenCalled();
  });

  it('shows error toast when updateStory fails', async () => {
    storyService.updateStory.mockRejectedValue(new Error('fail'));
    renderPage();
    await waitFor(() => screen.getByDisplayValue("Grandma's Kitchen"));
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() =>
      expect(screen.getByText(/failed to save/i)).toBeInTheDocument()
    );
  });
});
