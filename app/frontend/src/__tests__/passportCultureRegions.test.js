import {
  countriesForCulture,
  buildCountryCultureIndex,
} from '../utils/passportCultureRegions';

describe('countriesForCulture', () => {
  it('returns [] for unknown culture names', () => {
    expect(countriesForCulture('Atlantis')).toEqual([]);
  });

  it('returns [] for non-string input', () => {
    expect(countriesForCulture(null)).toEqual([]);
    expect(countriesForCulture(undefined)).toEqual([]);
    expect(countriesForCulture(42)).toEqual([]);
  });

  it('maps known sub-regions to their countries', () => {
    expect(countriesForCulture('Black Sea')).toContain('Turkey');
    expect(countriesForCulture('Black Sea')).toContain('Ukraine');
    expect(countriesForCulture('Aegean')).toEqual(expect.arrayContaining(['Turkey', 'Greece']));
    expect(countriesForCulture('Nordic')).toEqual(
      expect.arrayContaining(['Sweden', 'Norway', 'Denmark', 'Finland', 'Iceland']),
    );
  });

  it('is case-insensitive and trims whitespace', () => {
    expect(countriesForCulture('  AEGEAN  ')).toEqual(expect.arrayContaining(['Turkey']));
    expect(countriesForCulture('mediterranean')).toEqual(expect.arrayContaining(['Italy']));
  });
});

describe('buildCountryCultureIndex', () => {
  it('returns an empty object for null / undefined / empty input', () => {
    expect(buildCountryCultureIndex(null)).toEqual({});
    expect(buildCountryCultureIndex(undefined)).toEqual({});
    expect(buildCountryCultureIndex([])).toEqual({});
  });

  it('indexes each mapped country to its source culture', () => {
    const index = buildCountryCultureIndex([
      { culture: 'Nordic', recipes_tried: 1, stories_saved: 0, rarity: 'bronze' },
    ]);
    expect(Object.keys(index)).toEqual(
      expect.arrayContaining(['Sweden', 'Norway', 'Denmark', 'Finland', 'Iceland']),
    );
    expect(index.Sweden.culture.name).toBe('Nordic');
  });

  it('skips unmapped culture names without throwing', () => {
    const index = buildCountryCultureIndex([
      { culture: 'Unknown Region', recipes_tried: 5 },
    ]);
    expect(index).toEqual({});
  });

  it('resolves duplicate-claim conflicts by engagement (recipes_tried + stories_saved)', () => {
    // Both "Aegean" and "Black Sea" claim Turkey. The one with higher
    // engagement should win the cell.
    const index = buildCountryCultureIndex([
      { culture: 'Aegean',    recipes_tried: 1, stories_saved: 0, rarity: 'bronze' },
      { culture: 'Black Sea', recipes_tried: 5, stories_saved: 2, rarity: 'gold' },
    ]);
    expect(index.Turkey.culture.name).toBe('Black Sea');
  });

  it('accepts the older mock `name` / `recipe_count` / `story_count` shape too', () => {
    const index = buildCountryCultureIndex([
      { name: 'Nordic', recipe_count: 2, story_count: 1, stamp_rarity: 'silver' },
    ]);
    expect(index.Sweden.culture.name).toBe('Nordic');
    expect(index.Sweden.engagement).toBe(3);
  });
});
