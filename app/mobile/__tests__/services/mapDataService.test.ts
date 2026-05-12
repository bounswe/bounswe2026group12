import { fetchRegionPins, fetchRegionRecipes } from '../../src/services/mapDataService';
import { apiGetJson } from '../../src/services/httpClient';

jest.mock('../../src/services/httpClient', () => ({
  apiGetJson: jest.fn(),
  nextPagePath: (next: string | null | undefined) => {
    if (!next) return null;
    try {
      const url = new URL(next);
      return `${url.pathname}${url.search}`;
    } catch {
      return null;
    }
  },
}));

const mockedGet = apiGetJson as jest.MockedFunction<typeof apiGetJson>;

describe('fetchRegionPins', () => {
  beforeEach(() => mockedGet.mockReset());

  it('prefers backend lat/lng but falls back to the regionGeo table when missing', async () => {
    mockedGet.mockResolvedValueOnce({
      results: [
        { id: 1, name: 'Aegean', latitude: null, longitude: null, content_count: { recipes: 4 } },
        { id: 2, name: 'CustomLand', latitude: 12.3, longitude: 45.6, content_count: { recipes: 2 } },
        { id: 3, name: 'UnknownLand', latitude: null, longitude: null },
      ],
    });

    const pins = await fetchRegionPins();

    expect(mockedGet).toHaveBeenCalledWith('/api/map/regions/?geo_only=false');
    // UnknownLand has no backend coords and no fallback in regionGeo, so it's dropped.
    expect(pins.map((p) => p.name)).toEqual(['Aegean', 'CustomLand']);
    // Aegean uses the fallback coords from regionGeo (38.5, 27.0).
    expect(pins[0].coords).toEqual({ latitude: 38.5, longitude: 27.0 });
    expect(pins[0].recipeCount).toBe(4);
    // CustomLand uses the backend-provided coords.
    expect(pins[1].coords).toEqual({ latitude: 12.3, longitude: 45.6 });
    expect(pins[1].recipeCount).toBe(2);
  });

  it('defaults recipeCount to 0 when content_count is missing', async () => {
    mockedGet.mockResolvedValueOnce({
      results: [{ id: 1, name: 'Aegean', latitude: null, longitude: null }],
    });

    const pins = await fetchRegionPins();
    expect(pins[0].recipeCount).toBe(0);
  });
});

describe('fetchRegionRecipes', () => {
  beforeEach(() => mockedGet.mockReset());

  it('walks pagination and splits recipes into located vs unlocated', async () => {
    // First call: region metadata
    mockedGet.mockResolvedValueOnce({
      results: [
        {
          id: 1,
          name: 'Aegean',
          latitude: 38.5,
          longitude: 27.0,
          bbox_north: 40,
          bbox_south: 36,
          bbox_east: 28,
          bbox_west: 25,
        },
      ],
    });
    // Page 1 of recipes
    mockedGet.mockResolvedValueOnce({
      next: 'http://api.example.com/api/recipes/?region=Aegean&page=2',
      results: [
        {
          id: 10,
          title: 'Located 1',
          author_username: 'alice',
          image: null,
          latitude: '38.6',
          longitude: '27.1',
        },
        {
          id: 11,
          title: 'Unlocated 1',
          author_username: 'bob',
          image: null,
          latitude: null,
          longitude: null,
        },
      ],
    });
    // Page 2
    mockedGet.mockResolvedValueOnce({
      next: null,
      results: [
        {
          id: 12,
          title: 'Located 2',
          author_username: 'carol',
          image: 'http://example.com/img.jpg',
          latitude: 38.7,
          longitude: 27.2,
        },
      ],
    });

    const out = await fetchRegionRecipes('Aegean');

    expect(out.bbox).toEqual({ north: 40, south: 36, east: 28, west: 25 });
    expect(out.centroid).toEqual({ latitude: 38.5, longitude: 27.0 });

    expect(out.located).toHaveLength(2);
    expect(out.located[0]).toEqual({
      id: '10',
      title: 'Located 1',
      authorUsername: 'alice',
      image: null,
      coords: { latitude: 38.6, longitude: 27.1 },
    });
    expect(out.located[1].id).toBe('12');

    expect(out.unlocated).toHaveLength(1);
    expect(out.unlocated[0]).toEqual({
      id: '11',
      title: 'Unlocated 1',
      authorUsername: 'bob',
      image: null,
    });
  });

  it('falls back to regionGeo centroid when backend metadata lookup fails', async () => {
    mockedGet.mockRejectedValueOnce(new Error('boom'));
    // recipes call returns empty
    mockedGet.mockResolvedValueOnce({ next: null, results: [] });

    const out = await fetchRegionRecipes('Aegean');
    expect(out.centroid).toEqual({ latitude: 38.5, longitude: 27.0 });
    expect(out.bbox).toBeNull();
    expect(out.located).toEqual([]);
    expect(out.unlocated).toEqual([]);
  });
});
