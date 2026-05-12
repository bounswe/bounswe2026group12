jest.mock('../../src/services/httpClient', () => ({
  apiGetJson: jest.fn(),
}));

import { apiGetJson } from '../../src/services/httpClient';
import {
  fetchCultureDetail,
  fetchCultures,
} from '../../src/services/passportCultureService';

const mockedApiGetJson = apiGetJson as jest.MockedFunction<typeof apiGetJson>;

// Mirrors the actual backend shape from `apps/passport/services.py#culture_summaries`:
// `{ culture, recipes_tried, stories_saved, interactions, rarity }`.
const BACKEND_PAYLOAD = {
  culture_summaries: [
    { culture: 'Ottoman', recipes_tried: 8, stories_saved: 3, interactions: 12, rarity: 'gold' },
    { culture: 'Aegean', recipes_tried: 5, stories_saved: 2, interactions: 7, rarity: 'silver' },
    { culture: 'Mediterranean', recipes_tried: 3, stories_saved: 1, interactions: 4, rarity: 'bronze' },
  ],
};

describe('fetchCultureDetail', () => {
  beforeEach(() => {
    mockedApiGetJson.mockReset();
  });

  it('finds a culture by name and normalizes backend field names', async () => {
    mockedApiGetJson.mockResolvedValueOnce(BACKEND_PAYLOAD);
    const result = await fetchCultureDetail('ayse', 'Ottoman');
    expect(mockedApiGetJson).toHaveBeenCalledWith('/api/users/ayse/passport/');
    expect(result).toEqual({
      culture_name: 'Ottoman',
      stamp_rarity: 'gold',
      recipes_tried: 8,
      stories_saved: 3,
      // Backend doesn't surface these yet — toNum coerces undefined to 0.
      ingredients_discovered: 0,
      heritage_recipes: 0,
    });
  });

  it('returns null when no culture matches', async () => {
    mockedApiGetJson.mockResolvedValueOnce(BACKEND_PAYLOAD);
    const result = await fetchCultureDetail('ayse', 'Bavarian');
    expect(result).toBeNull();
  });

  it('matches case-insensitively', async () => {
    mockedApiGetJson.mockResolvedValueOnce(BACKEND_PAYLOAD);
    const result = await fetchCultureDetail('ayse', 'ottoman');
    expect(result?.culture_name).toBe('Ottoman');
  });

  it('returns null when the passport has no culture_summaries field', async () => {
    mockedApiGetJson.mockResolvedValueOnce({});
    const result = await fetchCultureDetail('ayse', 'Ottoman');
    expect(result).toBeNull();
  });
});

describe('fetchCultures', () => {
  beforeEach(() => mockedApiGetJson.mockReset());

  it('normalizes all entries and drops malformed rows', async () => {
    mockedApiGetJson.mockResolvedValueOnce({
      culture_summaries: [
        { culture: 'Ottoman', recipes_tried: '8', stories_saved: 3, rarity: 'gold' },
        null,
        { culture: '' },
        { culture_name: 'Levantine', stamp_rarity: 'emerald', ingredients_discovered: 4 },
      ],
    });
    const result = await fetchCultures('ayse');
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      culture_name: 'Ottoman',
      stamp_rarity: 'gold',
      recipes_tried: 8, // toNum coerced from string
    });
    expect(result[1]).toMatchObject({
      culture_name: 'Levantine',
      stamp_rarity: 'emerald',
      ingredients_discovered: 4,
      recipes_tried: 0,
    });
  });
});
