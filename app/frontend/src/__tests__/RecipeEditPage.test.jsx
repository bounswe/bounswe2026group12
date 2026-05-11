import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import RecipeEditPage from '../pages/RecipeEditPage';
import * as recipeService from '../services/recipeService';
import * as searchService from '../services/searchService';

jest.mock('../services/recipeService');
jest.mock('../services/searchService');
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockRecipe = {
  id: 1,
  title: 'Baklava',
  description: 'A sweet pastry.',
  region: 1,
  video: null,
  author: 3,
  author_username: 'eren',
  ingredients: [
    { ingredient: 1, ingredient_name: 'Phyllo dough', amount: '500', unit: 1, unit_name: 'g' },
  ],
  is_published: true,
  qa_enabled: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  recipeService.fetchRecipe.mockResolvedValue(mockRecipe);
  recipeService.fetchIngredients.mockResolvedValue([{ id: 1, name: 'Phyllo dough' }]);
  recipeService.fetchUnits.mockResolvedValue([{ id: 1, name: 'g' }]);
  searchService.fetchRegions.mockResolvedValue([
    { id: 1, name: 'Aegean' },
    { id: 2, name: 'Mediterranean' },
  ]);
});

function renderPage(authUser = { id: 3, username: 'eren' }) {
  return render(
    <AuthContext.Provider value={{ user: authUser, token: 'tok', login: jest.fn(), logout: jest.fn() }}>
      <MemoryRouter initialEntries={['/recipes/1/edit']}>
        <Routes>
          <Route path="/recipes/:id/edit" element={<RecipeEditPage />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe('RecipeEditPage', () => {
  it('pre-populates title from existing recipe', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByLabelText(/title/i)).toHaveValue('Baklava')
    );
  });

  it('pre-populates description from existing recipe', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByLabelText(/description/i)).toHaveValue('A sweet pastry.')
    );
  });

  it('pre-populates Q&A toggle from existing recipe (qa_enabled: false)', async () => {
    renderPage();
    await waitFor(() => {
      const toggle = screen.getByLabelText(/enable q&a/i);
      expect(toggle).not.toBeChecked();
    });
  });

  it('shows validation error when title is cleared', async () => {
    renderPage();
    await waitFor(() => screen.getByLabelText(/title/i));
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    expect(screen.getByText(/title is required/i)).toBeInTheDocument();
  });

  it('shows error when both description and video are absent on submit', async () => {
    renderPage();
    await waitFor(() => screen.getByLabelText(/title/i));
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    expect(screen.getByText(/description or video is required/i)).toBeInTheDocument();
  });

  it('calls updateRecipe and shows success toast on valid submit', async () => {
    recipeService.updateRecipe.mockResolvedValue({ id: 1 });
    renderPage();
    await waitFor(() => screen.getByLabelText(/title/i));
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() =>
      expect(screen.getByText(/recipe updated/i)).toBeInTheDocument()
    );
    expect(recipeService.updateRecipe).toHaveBeenCalledWith(
      '1',
      expect.objectContaining({ title: 'Baklava', is_published: true })
    );
  });

  it('calls updateRecipe with is_published: false when "Save as draft" is clicked', async () => {
    recipeService.updateRecipe.mockResolvedValue({ id: 1 });
    renderPage();
    await waitFor(() => screen.getByLabelText(/title/i));
    fireEvent.click(screen.getByRole('button', { name: /save as draft/i }));
    await waitFor(() =>
      expect(screen.getByText(/draft saved/i)).toBeInTheDocument()
    );
    expect(recipeService.updateRecipe).toHaveBeenCalledWith(
      '1',
      expect.objectContaining({ is_published: false })
    );
  });

  it('shows "Publish" as the primary button when the recipe is a draft', async () => {
    recipeService.fetchRecipe.mockResolvedValue({ ...mockRecipe, is_published: false });
    renderPage();
    await waitFor(() => screen.getByLabelText(/title/i));
    expect(screen.getByRole('button', { name: /^publish$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument();
  });

  it('shows error toast when API call fails', async () => {
    recipeService.updateRecipe.mockRejectedValue(new Error('Server error'));
    renderPage();
    await waitFor(() => screen.getByLabelText(/title/i));
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() =>
      expect(screen.getByText(/failed to save/i)).toBeInTheDocument()
    );
  });

  it('shows error message when initial load fails', async () => {
    recipeService.fetchRecipe.mockRejectedValue(new Error('Network Error'));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/could not load recipe/i)).toBeInTheDocument()
    );
  });

  it('redirects non-authors to the detail page', async () => {
    render(
      <AuthContext.Provider value={{ user: { id: 99, username: 'visitor' }, token: 'tok', login: jest.fn(), logout: jest.fn(), loading: false }}>
        <MemoryRouter initialEntries={['/recipes/1/edit']}>
          <Routes>
            <Route path="/recipes/:id/edit" element={<RecipeEditPage />} />
            <Route path="/recipes/:id" element={<div>Detail Page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );
    await waitFor(() => expect(screen.getByText('Detail Page')).toBeInTheDocument());
  });

  it('renders a thumbnail upload field', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByLabelText(/thumbnail/i)).toBeInTheDocument()
    );
  });

  it('shows error when no ingredients are filled in', async () => {
    recipeService.fetchRecipe.mockResolvedValue({ ...mockRecipe, ingredients: [] });
    renderPage();
    await waitFor(() => screen.getByRole('button', { name: /save changes/i }));
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    expect(screen.getByText(/at least one ingredient/i)).toBeInTheDocument();
  });

  it('renders region as a combobox (select element)', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /region/i })).toBeInTheDocument();
    });
  });

  it('pre-populates region dropdown with value from recipe', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /region/i })).toHaveValue('1');
    });
  });
});

describe('RecipeEditPage — draft auto-save', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
  });
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('shows DraftRestoreBanner when a draft exists for this recipe', async () => {
    localStorage.setItem(
      'draft:recipe:1',
      JSON.stringify({ title: 'Draft Edit', description: 'x', region: '', qaEnabled: false, rows: [] })
    );
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/unsaved draft found/i)).toBeInTheDocument()
    );
  });

  it('restores title from draft when Restore is clicked', async () => {
    localStorage.setItem(
      'draft:recipe:1',
      JSON.stringify({ title: 'Restored Title', description: 'x', region: '', qaEnabled: false, rows: [] })
    );
    renderPage();
    await waitFor(() => screen.getByText(/unsaved draft found/i));
    fireEvent.click(screen.getByRole('button', { name: /restore/i }));
    expect(screen.getByLabelText(/title/i).value).toBe('Restored Title');
  });
});
