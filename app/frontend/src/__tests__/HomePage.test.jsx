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

  it('navigates to /search with query params on submit', async () => {
    renderPage();
    await waitFor(() => screen.getByRole('option', { name: 'Aegean' }));

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'baklava' } });
    fireEvent.change(screen.getByLabelText(/region/i), { target: { value: 'Aegean' } });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    expect(mockNavigate).toHaveBeenCalledWith(
      '/search?q=baklava&region=Aegean&language='
    );
  });

  it('navigates with empty params when no input is given', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /search/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/search?q=&region=&language=');
  });
});
