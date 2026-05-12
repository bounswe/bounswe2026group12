import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import HeritagePage from '../pages/HeritagePage';
import * as heritageService from '../services/heritageService';
import * as culturalFactService from '../services/culturalFactService';

jest.mock('../services/heritageService');
jest.mock('../services/culturalFactService');

const GROUP = {
  id: 1,
  name: 'Sarma / Dolma',
  description: 'A shared tradition.',
  members: [
    { content_type: 'recipe', id: 11, title: 'Black Sea Sarma', author: 'zeynep', region: 'Black Sea', latitude: 41.0, longitude: 39.7 },
    { content_type: 'story',  id: 22, title: 'Wedding sarma',    author: 'fatma',  region: 'Konya',     latitude: 37.9, longitude: 32.5 },
  ],
  journey_steps: [
    { id: 1, order: 1, location: 'Central Asia', story: 'Origins.', era: 'Pre-Ottoman' },
  ],
};

function renderPage(id = 1) {
  return render(
    <MemoryRouter initialEntries={[`/heritage/${id}`]}>
      <Routes>
        <Route path="/heritage/:id" element={<HeritagePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  heritageService.fetchHeritageGroup.mockResolvedValue(GROUP);
  culturalFactService.fetchCulturalFacts.mockResolvedValue([]);
});

describe('HeritagePage', () => {
  it('shows loading state then renders the heritage name and description', async () => {
    renderPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: /sarma \/ dolma/i })).toBeInTheDocument();
    expect(screen.getByText('A shared tradition.')).toBeInTheDocument();
  });

  it('renders a "Show Heritage Map" link to /heritage/:id/map', async () => {
    renderPage(1);
    const link = await screen.findByRole('link', { name: /show heritage map/i });
    expect(link).toHaveAttribute('href', '/heritage/1/map');
  });

  it('renders one card per member with title, author, region and link', async () => {
    renderPage();
    expect(await screen.findByText('Black Sea Sarma')).toBeInTheDocument();
    expect(screen.getByText('Wedding sarma')).toBeInTheDocument();
    expect(screen.getByText('@zeynep')).toBeInTheDocument();
    expect(screen.getByText('@fatma')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /black sea sarma/i })).toHaveAttribute('href', '/recipes/11');
    expect(screen.getByRole('link', { name: /wedding sarma/i })).toHaveAttribute('href', '/stories/22');
  });

  it('renders the journey section when the group has steps', async () => {
    renderPage();
    expect(await screen.findByText('Central Asia')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /journey/i })).toBeInTheDocument();
  });

  it('renders cultural facts when present', async () => {
    culturalFactService.fetchCulturalFacts.mockResolvedValue([
      { id: 1, text: 'Dolma standardized in Ottoman cuisine.', source_url: '', heritage_group: { id: 1, name: 'Sarma / Dolma' }, region: null },
    ]);
    renderPage();
    expect(await screen.findByText(/dolma standardized/i)).toBeInTheDocument();
    expect(culturalFactService.fetchCulturalFacts).toHaveBeenCalledWith({ heritageGroup: '1' });
  });

  it('shows an error message when fetch fails', async () => {
    heritageService.fetchHeritageGroup.mockRejectedValue(new Error('boom'));
    renderPage();
    expect(await screen.findByText(/could not load heritage group/i)).toBeInTheDocument();
  });
});
