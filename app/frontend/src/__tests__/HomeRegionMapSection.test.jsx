import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HomeRegionMapSection from '../components/HomeRegionMapSection';
import * as mapService from '../services/mapService';

jest.mock('../services/mapService');
// Mock the inner RegionContentMap so we focus on the wrapper's behaviour.
// Render the names of the regions it received so we can assert.
jest.mock('../components/RegionContentMap', () => ({
  __esModule: true,
  default: ({ regions = [] }) => (
    <div data-testid="region-content-map">
      {regions.map((r) => <span key={r.id}>{r.name}</span>)}
    </div>
  ),
}));

function renderSection() {
  return render(
    <MemoryRouter>
      <HomeRegionMapSection />
    </MemoryRouter>,
  );
}

beforeEach(() => jest.clearAllMocks());

describe('HomeRegionMapSection', () => {
  it('renders the section heading and tagline', async () => {
    mapService.fetchMapRegions.mockResolvedValue([]);
    renderSection();
    expect(await screen.findByRole('heading', { name: /explore by region/i })).toBeInTheDocument();
    expect(screen.getByText(/hover any culinary region/i)).toBeInTheDocument();
  });

  it('fetches regions on mount and forwards them to RegionContentMap', async () => {
    mapService.fetchMapRegions.mockResolvedValue([
      { id: 1, name: 'Anatolia',  content_count: { recipes: 4, stories: 2 } },
      { id: 2, name: 'Aegean',    content_count: { recipes: 7, stories: 1 } },
    ]);
    renderSection();
    expect(await screen.findByText('Anatolia')).toBeInTheDocument();
    expect(screen.getByText('Aegean')).toBeInTheDocument();
    expect(mapService.fetchMapRegions).toHaveBeenCalledTimes(1);
  });

  it('shows a loading state while the fetch is in flight', () => {
    let resolve;
    mapService.fetchMapRegions.mockReturnValue(new Promise((r) => { resolve = r; }));
    renderSection();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    resolve([]);
  });

  it('shows an error message if the fetch fails', async () => {
    mapService.fetchMapRegions.mockRejectedValue(new Error('boom'));
    renderSection();
    expect(await screen.findByText(/could not load region map/i)).toBeInTheDocument();
  });
});
