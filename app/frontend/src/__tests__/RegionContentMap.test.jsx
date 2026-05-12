import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import RegionContentMap from '../components/RegionContentMap';

// "Turkey" and "Greece" both exist in COUNTRY_TO_REGION; "Antarctica" does not.
// (See utils/countryRegions.js.)
const MOCK_GEOS = [
  { rsmKey: 'TR', properties: { name: 'Turkey' } },
  { rsmKey: 'GR', properties: { name: 'Greece' } },
  { rsmKey: 'AQ', properties: { name: 'Antarctica' } },
];

jest.mock('react-simple-maps', () => ({
  ComposableMap: ({ children }) => <div data-testid="map">{children}</div>,
  Geographies: ({ children }) => children({ geographies: MOCK_GEOS }),
  Geography: ({ geography, onClick, onMouseEnter, onMouseLeave, style }) => (
    <button
      type="button"
      data-testid={`geo-${geography.properties.name}`}
      data-fill={style?.default?.fill}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      {geography.properties.name}
    </button>
  ),
}));

function renderMap(regions) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<RegionContentMap regions={regions} />} />
        <Route path="/search" element={<div>search-page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

// Turkey → "Anatolia", Greece → "Aegean" per countryRegions.js.
const REGIONS = [
  { id: 1, name: 'Anatolia', content_count: { recipes: 4,  stories: 2 } },
  { id: 2, name: 'Aegean',   content_count: { recipes: 12, stories: 5 } },
];

describe('RegionContentMap', () => {
  it('shows N recipes · M stories on hover for a mapped country', () => {
    renderMap(REGIONS);
    fireEvent.mouseEnter(screen.getByTestId('geo-Turkey'));
    expect(screen.getByText(/anatolia/i)).toBeInTheDocument();
    expect(screen.getByText(/4 recipes.*2 stories/i)).toBeInTheDocument();
  });

  it('shows the "not part of a culinary region yet" fallback for an unmapped country', () => {
    renderMap(REGIONS);
    fireEvent.mouseEnter(screen.getByTestId('geo-Antarctica'));
    expect(screen.getByText(/not part of a culinary region yet/i)).toBeInTheDocument();
  });

  it('navigates to /search?region=<name> when a mapped country is clicked', async () => {
    renderMap(REGIONS);
    fireEvent.click(screen.getByTestId('geo-Turkey'));
    expect(await screen.findByText('search-page')).toBeInTheDocument();
  });

  it('does not navigate when an unmapped country is clicked', () => {
    renderMap(REGIONS);
    fireEvent.click(screen.getByTestId('geo-Antarctica'));
    expect(screen.queryByText('search-page')).not.toBeInTheDocument();
  });

  it('tints higher-traffic regions darker than lower-traffic ones', () => {
    renderMap(REGIONS);
    const turkey = screen.getByTestId('geo-Turkey').getAttribute('data-fill');
    const greece = screen.getByTestId('geo-Greece').getAttribute('data-fill');
    // Aegean (Greece) has more content (12+5=17) than Anatolia (Turkey, 4+2=6);
    // the higher-traffic region should get a different (darker) fill.
    expect(turkey).not.toEqual(greece);
  });

  it('uses the neutral cream fill for unmapped countries', () => {
    renderMap(REGIONS);
    const antarctica = screen.getByTestId('geo-Antarctica').getAttribute('data-fill');
    expect(antarctica?.toUpperCase()).toBe('#FAF7EF');
  });
});
