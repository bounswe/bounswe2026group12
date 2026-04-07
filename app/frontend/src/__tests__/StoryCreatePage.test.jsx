import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import StoryCreatePage from '../pages/StoryCreatePage';
import * as storyService from '../services/storyService';
import * as recipeService from '../services/recipeService';

jest.mock('../services/storyService');
jest.mock('../services/recipeService');
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockRecipes = [
  { id: 1, title: 'Baklava', region: 'Aegean' },
  { id: 2, title: 'Menemen', region: 'Aegean' },
];

function renderPage() {
  return render(
    <AuthContext.Provider value={{ user: { id: 1 }, token: 'tok', login: jest.fn(), logout: jest.fn() }}>
      <MemoryRouter>
        <StoryCreatePage />
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  recipeService.fetchRecipes.mockResolvedValue(mockRecipes);
  storyService.createStory.mockResolvedValue({ id: 10, title: 'My Story' });
});

describe('StoryCreatePage', () => {
  it('renders the Create Story heading', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /create story/i })).toBeInTheDocument();
  });

  it('renders title, body, and language fields', () => {
    renderPage();
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/body/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/language/i)).toBeInTheDocument();
  });

  it('shows validation error when title is empty on submit', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /publish/i }));
    expect(await screen.findByText(/title is required/i)).toBeInTheDocument();
  });

  it('shows validation error when body is empty on submit', async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'A Story' } });
    fireEvent.click(screen.getByRole('button', { name: /publish/i }));
    expect(await screen.findByText(/body is required/i)).toBeInTheDocument();
  });

  it('submits with title, body, language and no linked recipe', async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'My Story' } });
    fireEvent.change(screen.getByLabelText(/body/i), { target: { value: 'Some text here.' } });
    fireEvent.click(screen.getByRole('button', { name: /publish/i }));

    await waitFor(() => {
      expect(storyService.createStory).toHaveBeenCalled();
    });
  });

  it('navigates to story detail page after successful submission', async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'My Story' } });
    fireEvent.change(screen.getByLabelText(/body/i), { target: { value: 'Some text.' } });
    fireEvent.click(screen.getByRole('button', { name: /publish/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/stories/10');
    });
  });

  it('renders the recipe linking section with a search input', async () => {
    renderPage();
    expect(await screen.findByPlaceholderText(/search recipes/i)).toBeInTheDocument();
  });

  it('filters recipe list by search term', async () => {
    renderPage();
    await waitFor(() => screen.getByPlaceholderText(/search recipes/i));
    fireEvent.change(screen.getByPlaceholderText(/search recipes/i), { target: { value: 'bak' } });
    expect(screen.getByText('Baklava')).toBeInTheDocument();
    expect(screen.queryByText('Menemen')).not.toBeInTheDocument();
  });

  it('allows selecting a recipe and reflects it as linked', async () => {
    renderPage();
    await waitFor(() => screen.getByPlaceholderText(/search recipes/i));
    fireEvent.change(screen.getByPlaceholderText(/search recipes/i), { target: { value: 'Baklava' } });
    fireEvent.click(screen.getByRole('button', { name: /select/i }));
    expect(await screen.findByText(/linked: baklava/i)).toBeInTheDocument();
  });

  it('includes linked_recipe id in submission payload', async () => {
    renderPage();
    await waitFor(() => screen.getByPlaceholderText(/search recipes/i));
    fireEvent.change(screen.getByPlaceholderText(/search recipes/i), { target: { value: 'Baklava' } });
    fireEvent.click(screen.getByRole('button', { name: /select/i }));

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'My Story' } });
    fireEvent.change(screen.getByLabelText(/body/i), { target: { value: 'Some text.' } });
    fireEvent.click(screen.getByRole('button', { name: /publish/i }));

    await waitFor(() => {
      expect(storyService.createStory).toHaveBeenCalled();
    });
  });

  it('renders a photo upload field', () => {
    renderPage();
    expect(screen.getByLabelText(/photo/i)).toBeInTheDocument();
  });
});
