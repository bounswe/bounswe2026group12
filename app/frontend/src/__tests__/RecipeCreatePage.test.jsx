import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RecipeCreatePage from '../pages/RecipeCreatePage';
import * as recipeService from '../services/recipeService';
import * as searchService from '../services/searchService';

jest.mock('../services/recipeService');
jest.mock('../services/searchService');
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

beforeEach(() => {
  jest.clearAllMocks();
  recipeService.fetchIngredients.mockResolvedValue([{ id: 1, name: 'Salt' }]);
  recipeService.fetchUnits.mockResolvedValue([{ id: 1, name: 'cup' }]);
  searchService.fetchRegions.mockResolvedValue([
    { id: 1, name: 'Aegean' },
    { id: 2, name: 'Mediterranean' },
  ]);
});

function renderPage() {
  return render(
    <MemoryRouter>
      <RecipeCreatePage />
    </MemoryRouter>
  );
}

describe('RecipeCreatePage', () => {
  it('renders title, description, region, and video fields', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/region/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/video/i)).toBeInTheDocument();
    });
  });

  it('renders Q&A toggle checkbox', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByLabelText(/enable q&a/i)).toBeInTheDocument()
    );
  });

  it('shows validation error when title is empty on submit', async () => {
    renderPage();
    await waitFor(() => screen.getByRole('button', { name: /publish/i }));
    fireEvent.click(screen.getByRole('button', { name: /publish/i }));
    expect(screen.getByText(/title is required/i)).toBeInTheDocument();
  });

  it('shows validation error when ingredient amount is not a positive number', async () => {
    renderPage();
    await waitFor(() => screen.getByPlaceholderText('Amount'));
    const amountInput = screen.getByPlaceholderText('Amount');
    fireEvent.change(amountInput, { target: { value: '-1' } });
    fireEvent.click(screen.getByRole('button', { name: /publish/i }));
    expect(screen.getByText(/amount must be a positive number/i)).toBeInTheDocument();
  });

  it('calls createRecipe and shows success toast on valid submit', async () => {
    recipeService.createRecipe.mockResolvedValue({ id: 1 });
    renderPage();
    await waitFor(() => screen.getByLabelText(/title/i));
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Baklava' } });
    fireEvent.click(screen.getByRole('button', { name: /publish/i }));
    await waitFor(() =>
      expect(screen.getByText(/recipe published/i)).toBeInTheDocument()
    );
    expect(recipeService.createRecipe).toHaveBeenCalled();
    // Verify navigation happens after the delay
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/recipes/1'), { timeout: 2000 });
  });

  it('shows error toast when API call fails', async () => {
    recipeService.createRecipe.mockRejectedValue(new Error('Server error'));
    renderPage();
    await waitFor(() => screen.getByLabelText(/title/i));
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Baklava' } });
    fireEvent.click(screen.getByRole('button', { name: /publish/i }));
    await waitFor(() =>
      expect(screen.getByText(/failed to publish/i)).toBeInTheDocument()
    );
  });

  it('renders region as a combobox (select element)', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /region/i })).toBeInTheDocument();
    });
  });

  it('populates region dropdown from API', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Aegean' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Mediterranean' })).toBeInTheDocument();
    });
  });
});
