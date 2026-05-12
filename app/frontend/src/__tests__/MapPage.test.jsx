import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MapPage from '../pages/MapPage';
import * as mapService from '../services/mapService';
import * as recipeService from '../services/recipeService';
import * as storyService from '../services/storyService';

jest.mock('../services/mapService');
jest.mock('../services/recipeService');
jest.mock('../services/storyService');

jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map">{children}</div>,
  TileLayer: () => null,
  CircleMarker: ({ children, eventHandlers, pathOptions }) => (
    <button
      type="button"
      data-testid={`marker-${pathOptions?.fillColor ?? 'unknown'}`}
      onClick={eventHandlers?.click}
    >
      {children}
    </button>
  ),
  Tooltip: ({ children }) => <span>{children}</span>,
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <MapPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mapService.fetchMapRegions.mockResolvedValue([
    { id: 1, name: 'Black Sea', latitude: 41.0, longitude: 39.7 },
  ]);
  recipeService.fetchRecipesByRegion = jest.fn().mockResolvedValue([]);
  storyService.fetchStoriesByRegion = jest.fn().mockResolvedValue([]);
});

describe('MapPage', () => {
  it('builds "See all from {region}" using region.name, not region.id', async () => {
    mapService.fetchMapRegions.mockResolvedValue([
      {
        id: 1,
        name: 'Aegean',
        latitude: 38.5,
        longitude: 27.0,
        content_count: { recipes: 0, stories: 0 },
      },
    ]);
    render(
      <MemoryRouter>
        <MapPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByRole('link', { name: /see all from aegean/i })).toBeInTheDocument());
    const link = screen.getByRole('link', { name: /see all from aegean/i });
    expect(link).toHaveAttribute('href', '/search?region=Aegean');
  });
});

describe('MapPage — recipe and story pins (#732)', () => {
  it('renders a pin per located recipe and per located story with distinct colours', async () => {
    recipeService.fetchRecipesByRegion.mockResolvedValue([
      { id: 1, title: 'Anchovy Pilaf', latitude: 41.0, longitude: 39.7, author_username: 'a' },
    ]);
    storyService.fetchStoriesByRegion.mockResolvedValue([
      { id: 2, title: 'Trabzon Memory', latitude: 41.1, longitude: 39.8, author_username: 'b' },
    ]);
    renderPage();
    expect(await screen.findByText(/anchovy pilaf/i)).toBeInTheDocument();
    expect(screen.getByTestId('marker-#C4521E')).toBeInTheDocument();
    expect(screen.getByTestId('marker-#2E7D7D')).toBeInTheDocument();
  });

  it('lists unlocated items in the "Without a location" panel', async () => {
    recipeService.fetchRecipesByRegion.mockResolvedValue([
      { id: 3, title: 'Located Recipe',   latitude: 41.0, longitude: 39.7, author_username: 'a' },
      { id: 4, title: 'Unlocated Recipe', latitude: null, longitude: null, author_username: 'a' },
    ]);
    storyService.fetchStoriesByRegion.mockResolvedValue([
      { id: 5, title: 'Unlocated Story',  latitude: null, longitude: null, author_username: 'b' },
    ]);
    renderPage();
    expect(await screen.findByText(/unlocated recipe/i)).toBeInTheDocument();
    expect(screen.getByText(/unlocated story/i)).toBeInTheDocument();
    expect(screen.getByText(/without a location/i)).toBeInTheDocument();
  });

  it('renders an explicit "X recipes + Y stories on map · Z without a location" count line', async () => {
    recipeService.fetchRecipesByRegion.mockResolvedValue([
      { id: 10, title: 'On Map A',  latitude: 41.0, longitude: 39.7, author_username: 'a' },
      { id: 11, title: 'Off Map A', latitude: null, longitude: null, author_username: 'a' },
    ]);
    storyService.fetchStoriesByRegion.mockResolvedValue([
      { id: 12, title: 'On Map B',  latitude: 41.1, longitude: 39.8, author_username: 'b' },
    ]);
    renderPage();
    expect(await screen.findByText(/1 recipe.* \+ 1 stor.* on map.* 1 without a location/i))
      .toBeInTheDocument();
  });

  it('links recipe pins to /recipes/:id and story pins to /stories/:id', async () => {
    recipeService.fetchRecipesByRegion.mockResolvedValue([
      { id: 1, title: 'R1', latitude: 41.0, longitude: 39.7, author_username: 'a' },
    ]);
    storyService.fetchStoriesByRegion.mockResolvedValue([
      { id: 2, title: 'S1', latitude: 41.1, longitude: 39.8, author_username: 'b' },
    ]);
    renderPage();
    expect(await screen.findByRole('link', { name: /r1/i })).toHaveAttribute('href', '/recipes/1');
    expect(screen.getByRole('link', { name: /s1/i })).toHaveAttribute('href', '/stories/2');
  });
});
