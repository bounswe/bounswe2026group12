import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MapPage from '../pages/MapPage';
import * as mapService from '../services/mapService';

jest.mock('../services/mapService');
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => null,
  CircleMarker: ({ children }) => <div data-testid="circle-marker">{children}</div>,
  Tooltip: ({ children }) => <span>{children}</span>,
}));

beforeEach(() => {
  mapService.fetchMapRegions.mockResolvedValue([
    {
      id: 1,
      name: 'Aegean',
      latitude: 38.5,
      longitude: 27.0,
      content_count: { recipes: 0, stories: 0 },
    },
  ]);
  mapService.fetchMapRegionContent.mockResolvedValue([]);
});

describe('MapPage', () => {
  it('builds "See all from {region}" using region.name, not region.id', async () => {
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
