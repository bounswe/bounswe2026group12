import { COUNTRY_TO_REGION, getRegionForCountry } from '../utils/countryRegions';

/**
 * Mirror of `REGIONS` in
 * `app/backend/apps/recipes/migrations/0004_seed_regions.py` (the source of
 * truth for which `Region.name` values exist on the backend). If the backend
 * grows or renames a region, update this list — the contract test below
 * fails loudly so the home map can't silently drop a region.
 */
const BACKEND_SEED_REGIONS = new Set([
  'Aegean', 'Anatolian', 'Black Sea', 'Marmara', 'Mediterranean',
  'Southeastern Anatolia', 'Levantine', 'Persian', 'Arabian', 'Saudi Arabia',
  'Balkan', 'Central European', 'Eastern European', 'French', 'Iberian',
  'Italian', 'Nordic', 'British Isles', 'France', 'Germany', 'Greece',
  'Hungary', 'Poland', 'Portugal', 'Russia', 'Spain', 'United Kingdom',
  'Central Asian', 'Chinese', 'Indian', 'Japanese', 'Korean',
  'Southeast Asian', 'China', 'South Korea', 'Thailand', 'Vietnam',
  'Kyrgyzstan', 'Uzbekistan', 'East African', 'North African', 'West African',
  'Ethiopia', 'Ghana', 'Morocco', 'Nigeria', 'Caribbean', 'Central American',
  'North American', 'South American', 'Argentina', 'Brazil', 'El Salvador',
  'Jamaica', 'Peru', 'Trinidad and Tobago', 'Oceanian', 'Australia',
]);

describe('getRegionForCountry', () => {
  it('returns null for an unmapped country', () => {
    expect(getRegionForCountry('Atlantis')).toBeNull();
  });

  it('returns null for non-string input', () => {
    expect(getRegionForCountry(undefined)).toBeNull();
    expect(getRegionForCountry(null)).toBeNull();
    expect(getRegionForCountry(42)).toBeNull();
  });

  it('is case-insensitive and trims whitespace', () => {
    expect(getRegionForCountry('  france  ')).toBe('France');
    expect(getRegionForCountry('TURKEY')).toBe('Anatolian');
  });

  it('prefers country-level regions over macro-regions when both exist', () => {
    // Russia is its own seeded region; macro-Black-Sea is not the right answer
    // for someone clicking the country Russia.
    expect(getRegionForCountry('Russia')).toBe('Russia');
    // Same for Spain (Iberian exists too, but Spain is the specific country
    // region the user expects to land on).
    expect(getRegionForCountry('Spain')).toBe('Spain');
    expect(getRegionForCountry('Brazil')).toBe('Brazil');
  });

  it('falls back to the macro-region when no country-level region exists', () => {
    expect(getRegionForCountry('Sweden')).toBe('Nordic');
    expect(getRegionForCountry('Croatia')).toBe('Balkan');
    expect(getRegionForCountry('Belgium')).toBe('Central European');
    expect(getRegionForCountry('Bangladesh')).toBe('Indian');
    expect(getRegionForCountry('Vietnam')).toBe('Vietnam'); // country-level
  });

  it('uses Southeastern Anatolia (not Southeast Anatolia) for Iraq', () => {
    // Regression: the previous mapping used "Southeast Anatolia", which the
    // backend doesn't seed — Iraq stayed cream-coloured on the home map.
    expect(getRegionForCountry('Iraq')).toBe('Southeastern Anatolia');
  });

  it('covers world-atlas truncated names alongside full names', () => {
    expect(getRegionForCountry('Bosnia and Herz.')).toBe('Balkan');
    expect(getRegionForCountry('Bosnia and Herzegovina')).toBe('Balkan');
    expect(getRegionForCountry('Czech Rep.')).toBe('Central European');
    expect(getRegionForCountry('Czechia')).toBe('Central European');
    expect(getRegionForCountry('Dem. Rep. Congo')).toBe('West African');
    expect(getRegionForCountry('S. Sudan')).toBe('East African');
  });

  it('covers a sample of countries across every continent', () => {
    expect(getRegionForCountry('Greece')).toBe('Greece');
    expect(getRegionForCountry('Japan')).toBe('Japanese');
    expect(getRegionForCountry('China')).toBe('China');
    expect(getRegionForCountry('India')).toBe('Indian');
    expect(getRegionForCountry('Australia')).toBe('Australia');
    expect(getRegionForCountry('New Zealand')).toBe('Oceanian');
    expect(getRegionForCountry('United States of America')).toBe('North American');
    expect(getRegionForCountry('Canada')).toBe('North American');
    expect(getRegionForCountry('Mexico')).toBe('Central American');
    expect(getRegionForCountry('Cuba')).toBe('Caribbean');
    expect(getRegionForCountry('Argentina')).toBe('Argentina');
    expect(getRegionForCountry('Egypt')).toBe('North African');
    expect(getRegionForCountry('Kenya')).toBe('East African');
    expect(getRegionForCountry('Nigeria')).toBe('Nigeria');
    expect(getRegionForCountry('Saudi Arabia')).toBe('Saudi Arabia');
    expect(getRegionForCountry('Iran')).toBe('Persian');
  });

  it('every mapped region value matches a backend seed Region.name', () => {
    // Contract: if this fails, either the backend seeds were renamed or a
    // typo slipped into the mapping (e.g. the old "Southeast Anatolia" bug).
    const orphans = Object.entries(COUNTRY_TO_REGION).filter(
      ([, region]) => !BACKEND_SEED_REGIONS.has(region),
    );
    expect(orphans).toEqual([]);
  });
});
