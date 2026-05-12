import { render, screen, waitFor } from '@testing-library/react';
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
      data-testid="circle-marker"
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

const GROUP = {
  id: 1,
  name: 'Sarma / Dolma',
  description: '',
  members: [
    { content_type: 'recipe', id: 11, title: 'Black Sea Sarma', author: 'zeynep', region: 'Black Sea', latitude: 41.0, longitude: 39.7 },
    { content_type: 'story',  id: 22, title: 'Wedding sarma',    author: 'fatma',  region: 'Konya',     latitude: 37.9, longitude: 32.5 },
    { content_type: 'recipe', id: 33, title: 'Located somewhere', author: 'x',     region: 'Unknown',   latitude: null, longitude: null },
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
  it('renders one circle marker per locatable member (unlocatable members are skipped)', async () => {
    renderPage();
    await waitFor(() => expect(screen.getAllByTestId('circle-marker')).toHaveLength(2));
  });

  it('centres the map on the midpoint of locatable members', async () => {
    renderPage();
    await screen.findByTestId('map-container');
    const center = JSON.parse(screen.getByTestId('map-container').getAttribute('data-center'));
    expect(center[0]).toBeCloseTo((41.0 + 37.9) / 2, 3);
    expect(center[1]).toBeCloseTo((39.7 + 32.5) / 2, 3);
  });

  it('renders a polyline from the midpoint to each locatable member', async () => {
    renderPage();
    await waitFor(() => expect(screen.getAllByTestId('polyline')).toHaveLength(2));
  });

  it('renders a central building marker at the midpoint', async () => {
    renderPage();
    await screen.findByTestId('center-marker');
    const center = JSON.parse(screen.getByTestId('center-marker').getAttribute('data-center'));
    expect(center[0]).toBeCloseTo((41.0 + 37.9) / 2, 3);
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
    expect(screen.queryByTestId('circle-marker')).not.toBeInTheDocument();
  });
});
