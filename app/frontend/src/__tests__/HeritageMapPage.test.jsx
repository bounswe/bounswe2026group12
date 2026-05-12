import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import HeritageMapPage from '../pages/HeritageMapPage';
import * as heritageService from '../services/heritageService';

jest.mock('../services/heritageService');

jest.mock('react-leaflet', () => ({
  MapContainer: ({ children, center }) => (
    <div data-testid="map-container" data-center={JSON.stringify(center)}>{children}</div>
  ),
  TileLayer: () => null,
  CircleMarker: ({ children, center, eventHandlers }) => (
    <div
      data-testid="region-pin"
      data-center={JSON.stringify(center)}
      onClick={eventHandlers?.click}
    >{children}</div>
  ),
  Marker: ({ children, position, eventHandlers }) => (
    <div
      data-testid="center-marker"
      data-center={JSON.stringify(position)}
      onClick={eventHandlers?.click}
    >{children}</div>
  ),
  Polyline: ({ positions }) => (
    <div data-testid="polyline" data-positions={JSON.stringify(positions)} />
  ),
  Tooltip: ({ children }) => <span>{children}</span>,
}));

// Black Sea: 2 recipes (top region), Konya: 1 story, Unknown: null coords (skipped)
const GROUP = {
  id: 1,
  name: 'Sarma / Dolma',
  description: '',
  members: [
    { content_type: 'recipe', id: 11, title: 'Black Sea Sarma',   author: 'zeynep', region: 'Black Sea', latitude: 41.0, longitude: 39.7 },
    { content_type: 'recipe', id: 12, title: 'Black Sea Dolma',   author: 'ali',    region: 'Black Sea', latitude: 41.2, longitude: 39.9 },
    { content_type: 'story',  id: 22, title: 'Wedding sarma',     author: 'fatma',  region: 'Konya',     latitude: 37.9, longitude: 32.5 },
    { content_type: 'recipe', id: 33, title: 'Unlocated recipe',  author: 'x',      region: 'Unknown',   latitude: null, longitude: null },
  ],
  journey_steps: [],
};

function renderPage(id = 1) {
  return render(
    <MemoryRouter initialEntries={[`/heritage/${id}/map`]}>
      <Routes>
        <Route path="/heritage/:id/map" element={<HeritageMapPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  heritageService.fetchHeritageGroup.mockResolvedValue(GROUP);
});

describe('HeritageMapPage', () => {
  it('centres the map on the top region (most recipes)', async () => {
    renderPage();
    await screen.findByTestId('map-container');
    const center = JSON.parse(screen.getByTestId('map-container').getAttribute('data-center'));
    // Black Sea centroid: avg of (41.0, 39.7) and (41.2, 39.9)
    expect(center[0]).toBeCloseTo((41.0 + 41.2) / 2, 3);
    expect(center[1]).toBeCloseTo((39.7 + 39.9) / 2, 3);
  });

  it('renders one region pin per non-center region (no per-member duplicates)', async () => {
    renderPage();
    await waitFor(() => expect(screen.getAllByTestId('region-pin')).toHaveLength(1));
    const pin = screen.getByTestId('region-pin');
    const coords = JSON.parse(pin.getAttribute('data-center'));
    expect(coords[0]).toBeCloseTo(37.9, 3);
  });

  it('renders one polyline per non-center region', async () => {
    renderPage();
    await waitFor(() => expect(screen.getAllByTestId('polyline')).toHaveLength(1));
  });

  it('renders no polylines for a single-region heritage', async () => {
    heritageService.fetchHeritageGroup.mockResolvedValue({
      ...GROUP,
      members: GROUP.members.filter((m) => m.region === 'Black Sea'),
    });
    renderPage();
    await screen.findByTestId('center-marker');
    expect(screen.queryByTestId('polyline')).not.toBeInTheDocument();
    expect(screen.queryByTestId('region-pin')).not.toBeInTheDocument();
  });

  it('clicking the center marker opens the panel for the center region', async () => {
    renderPage();
    const marker = await screen.findByTestId('center-marker');
    fireEvent.click(marker);
    // findByRole('heading') matches only <h2>, not tooltip <span>
    expect(await screen.findByRole('heading', { name: 'Black Sea' })).toBeInTheDocument();
    expect(screen.getByText('Black Sea Sarma')).toBeInTheDocument();
    expect(screen.getByText('Black Sea Dolma')).toBeInTheDocument();
  });

  it('clicking a region pin opens the panel for that region', async () => {
    renderPage();
    const pin = await screen.findByTestId('region-pin');
    fireEvent.click(pin);
    expect(await screen.findByRole('heading', { name: 'Konya' })).toBeInTheDocument();
    expect(screen.getByText('Wedding sarma')).toBeInTheDocument();
  });

  it('panel shows placeholder text when no region is selected', async () => {
    renderPage();
    await screen.findByTestId('center-marker');
    expect(screen.getByText(/select a region pin/i)).toBeInTheDocument();
  });

  it('links "Back to Heritage Page" to /heritage/:id', async () => {
    renderPage(1);
    const link = await screen.findByRole('link', { name: /back to heritage page/i });
    expect(link).toHaveAttribute('href', '/heritage/1');
  });

  it('shows an empty-state message when no members have coordinates', async () => {
    heritageService.fetchHeritageGroup.mockResolvedValue({
      ...GROUP,
      members: GROUP.members.map((m) => ({ ...m, latitude: null, longitude: null })),
    });
    renderPage();
    expect(await screen.findByText(/no locations to plot/i)).toBeInTheDocument();
    expect(screen.queryByTestId('map-container')).not.toBeInTheDocument();
  });
});
