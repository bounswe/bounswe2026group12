import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HomePage from '../pages/HomePage';
import * as searchService from '../services/searchService';

jest.mock('../services/searchService');
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

beforeEach(() => {
  jest.clearAllMocks();
  searchService.fetchRegions.mockResolvedValue([
    { regionId: 1, name: 'Aegean' },
    { regionId: 2, name: 'Mediterranean' },
  ]);
});

function renderPage() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>
  );
}

describe('HomePage', () => {
  it('renders a search input', () => {
    renderPage();
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
  });

  it('renders a submit button', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
  });

  it('populates region dropdown from API', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Aegean' })).toBeInTheDocument();
    });
  });

  it('renders ingredient and meal type filter inputs', () => {
    renderPage();
    expect(screen.getByLabelText(/ingredient/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/meal type/i)).toBeInTheDocument();
  });

  it('navigates to /search with all params on submit', async () => {
    renderPage();
    await waitFor(() => screen.getByRole('option', { name: 'Aegean' }));

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'baklava' } });
    fireEvent.change(screen.getByLabelText(/region/i), { target: { value: 'Aegean' } });
    fireEvent.change(screen.getByLabelText(/ingredient/i), { target: { value: 'yogurt' } });
    fireEvent.change(screen.getByLabelText(/meal type/i), { target: { value: 'soup' } });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    expect(mockNavigate).toHaveBeenCalledWith(
      '/search?q=baklava&region=Aegean&ingredient=yogurt&meal_type=soup'
    );
  });

  it('navigates with empty params when no input is given', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /search/i }));
    expect(mockNavigate).toHaveBeenCalledWith(
      '/search?q=&region=&ingredient=&meal_type='
    );
  });
});
