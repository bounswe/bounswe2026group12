import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MigrationRoutesPage from '../pages/MigrationRoutesPage';
import * as ingredientRouteService from '../services/ingredientRouteService';

jest.mock('../services/ingredientRouteService');

// react-leaflet pulls in DOM-only globals (window.L etc) that aren't relevant
// to the component's data wiring; stub the parts the page uses with simple
// passthrough wrappers so the test focuses on state + waypoint plumbing.
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map">{children}</div>,
  TileLayer: () => null,
  Polyline: ({ positions }) => (
    <div data-testid="polyline" data-points={JSON.stringify(positions)} />
  ),
  CircleMarker: ({ children, center }) => (
    <div data-testid="marker" data-center={JSON.stringify(center)}>{children}</div>
  ),
  Popup: ({ children }) => <div data-testid="popup">{children}</div>,
}));

const ROUTES = [
  {
    id: 1,
    ingredient: 11,
    ingredient_name: 'Tomato',
    waypoints: [
      { lat: -9.19, lng: -75.01, era: 'Ancestral',  label: 'Andes (Peru)' },
      { lat: 19.43, lng: -99.13, era: 'Pre-Columbian', label: 'Mexico (Aztecs)' },
      { lat: 40.41, lng:  -3.70, era: '1540s',     label: 'Spain' },
    ],
  },
  {
    id: 2,
    ingredient: 22,
    ingredient_name: 'Lentils',
    waypoints: [
      { lat: 37.0, lng: 38.0, era: 'Neolithic',   label: 'Fertile Crescent' },
      { lat: 30.0, lng: 31.0, era: '3000 BC',     label: 'Ancient Egypt' },
      { lat: 41.0, lng: 29.0, era: 'Ottoman',     label: 'Anatolia / Istanbul' },
    ],
  },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <MigrationRoutesPage />
    </MemoryRouter>,
  );
}

describe('MigrationRoutesPage', () => {
  beforeEach(() => jest.clearAllMocks());
  afterEach(() => jest.useRealTimers());

  it('renders an empty state when no routes are returned', async () => {
    ingredientRouteService.fetchIngredientRoutes.mockResolvedValue([]);
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/no ingredient migration routes/i)).toBeInTheDocument(),
    );
  });

  it('renders an error state when the API fails', async () => {
    ingredientRouteService.fetchIngredientRoutes.mockRejectedValue(new Error('boom'));
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/could not load/i),
    );
  });

  it('renders the picker, full polyline and one marker per waypoint by default', async () => {
    ingredientRouteService.fetchIngredientRoutes.mockResolvedValue(ROUTES);
    const { container } = renderPage();
    await waitFor(() =>
      expect(screen.getByLabelText('Ingredient')).toBeInTheDocument(),
    );
    expect(screen.getByRole('combobox')).toHaveValue('1'); // first route
    expect(screen.getAllByTestId('marker')).toHaveLength(3);
    const line = screen.getByTestId('polyline');
    expect(JSON.parse(line.getAttribute('data-points'))).toEqual([
      [-9.19, -75.01],
      [19.43, -99.13],
      [40.41, -3.7],
    ]);
    // Each waypoint shows up in the side list, fully visible (no pending state).
    const labelTexts = Array.from(
      container.querySelectorAll('.migration-routes-waypoint-label'),
    ).map((el) => el.textContent);
    expect(labelTexts).toEqual(['Andes (Peru)', 'Mexico (Aztecs)', 'Spain']);
  });

  it('switches routes when a different ingredient is picked', async () => {
    ingredientRouteService.fetchIngredientRoutes.mockResolvedValue(ROUTES);
    const { container } = renderPage();
    await waitFor(() => screen.getByLabelText('Ingredient'));
    const readLabels = () =>
      Array.from(container.querySelectorAll('.migration-routes-waypoint-label')).map(
        (el) => el.textContent,
      );
    expect(readLabels()).toEqual(['Andes (Peru)', 'Mexico (Aztecs)', 'Spain']);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '2' } });
    expect(readLabels()).toEqual([
      'Fertile Crescent',
      'Ancient Egypt',
      'Anatolia / Istanbul',
    ]);
    expect(screen.getAllByTestId('marker')).toHaveLength(3);
  });

  it('reveals waypoints sequentially when Animate is clicked, then completes', async () => {
    jest.useFakeTimers();
    ingredientRouteService.fetchIngredientRoutes.mockResolvedValue(ROUTES);
    renderPage();
    // Wait for the picker to mount.
    await waitFor(() => screen.getByLabelText('Ingredient'));

    fireEvent.click(screen.getByRole('button', { name: /animate route/i }));
    // First tick — only the origin should be drawn (no polyline because we
    // need ≥ 2 points).
    expect(screen.getAllByTestId('marker')).toHaveLength(1);
    expect(screen.queryByTestId('polyline')).toBeNull();

    act(() => { jest.advanceTimersByTime(650); });
    expect(screen.getAllByTestId('marker')).toHaveLength(2);
    expect(screen.getByTestId('polyline')).toBeInTheDocument();

    act(() => { jest.advanceTimersByTime(650); });
    expect(screen.getAllByTestId('marker')).toHaveLength(3);
  });

  it('skips routes whose payload has fewer than two valid waypoints', async () => {
    ingredientRouteService.fetchIngredientRoutes.mockResolvedValue([
      ...ROUTES,
      { id: 3, ingredient_name: 'Bogus', waypoints: [{ lat: 'NaN', lng: null }] },
      { id: 4, ingredient_name: 'OnePointOnly', waypoints: [{ lat: 0, lng: 0, label: 'X' }] },
    ]);
    renderPage();
    await waitFor(() => screen.getByLabelText('Ingredient'));
    const options = screen.getAllByRole('option').map((o) => o.textContent);
    expect(options).toEqual(['Tomato', 'Lentils']);
  });
});
