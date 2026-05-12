import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EndangeredListPage from '../pages/EndangeredListPage';
import * as recipeService from '../services/recipeService';

jest.mock('../services/recipeService');

function renderPage() {
  return render(
    <MemoryRouter>
      <EndangeredListPage />
    </MemoryRouter>,
  );
}

describe('EndangeredListPage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders endangered recipes by default', async () => {
    recipeService.fetchRecipesByHeritageStatus.mockResolvedValue([
      { id: 1, title: 'Pinhead Pilaf',  heritage_status: 'endangered', author_username: 'ayse', region_name: 'Aegean', image: null },
      { id: 2, title: 'Tarhana Ekşili', heritage_status: 'endangered', author_username: 'demo_chef', region_name: 'Anatolian', image: null },
    ]);
    renderPage();
    await waitFor(() => expect(screen.getByText('Pinhead Pilaf')).toBeInTheDocument());
    expect(screen.getByText('Tarhana Ekşili')).toBeInTheDocument();
    expect(recipeService.fetchRecipesByHeritageStatus).toHaveBeenCalledWith('endangered');
  });

  it('switches to the revived filter when the tab is selected', async () => {
    recipeService.fetchRecipesByHeritageStatus.mockResolvedValueOnce([]);
    renderPage();
    await waitFor(() => screen.getByText(/no recipes flagged as endangered/i));

    recipeService.fetchRecipesByHeritageStatus.mockResolvedValueOnce([
      { id: 9, title: 'Revived Bread', heritage_status: 'revived', author_username: 'baker', region_name: 'Marmara', image: null },
    ]);
    fireEvent.click(screen.getByRole('tab', { name: /revived/i }));
    await waitFor(() => expect(screen.getByText('Revived Bread')).toBeInTheDocument());
    expect(recipeService.fetchRecipesByHeritageStatus).toHaveBeenLastCalledWith('revived');
  });

  it('shows an error state when the API fails', async () => {
    recipeService.fetchRecipesByHeritageStatus.mockRejectedValue(new Error('boom'));
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/could not load/i);
    });
  });

  it('shows an empty state when no recipes match', async () => {
    recipeService.fetchRecipesByHeritageStatus.mockResolvedValue([]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/no recipes flagged as endangered/i)).toBeInTheDocument();
    });
  });
});
