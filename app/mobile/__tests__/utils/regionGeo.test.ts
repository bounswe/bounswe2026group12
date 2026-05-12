import { coordsForRegion, INITIAL_MAP_REGION } from '../../src/utils/regionGeo';

describe('coordsForRegion', () => {
  it('returns coordinates for a known region', () => {
    expect(coordsForRegion('Aegean')).toEqual({ latitude: 38.5, longitude: 27.0 });
  });

  it('returns coordinates for a multi-word region name', () => {
    expect(coordsForRegion('Black Sea')).toEqual({ latitude: 41.0, longitude: 36.5 });
    expect(coordsForRegion('Southeastern Anatolia')).toEqual({
      latitude: 37.5,
      longitude: 39.0,
    });
  });

  it('returns null for an unknown region', () => {
    expect(coordsForRegion('Atlantis')).toBeNull();
  });

  it('is case-sensitive (lookup uses exact keys)', () => {
    // Lookup table keys are capitalised; lowercased names should miss.
    expect(coordsForRegion('aegean')).toBeNull();
    expect(coordsForRegion('AEGEAN')).toBeNull();
  });

  it('returns null when given null, undefined, or empty string', () => {
    expect(coordsForRegion(null)).toBeNull();
    expect(coordsForRegion(undefined)).toBeNull();
    expect(coordsForRegion('')).toBeNull();
  });
});

describe('INITIAL_MAP_REGION', () => {
  it('exposes a sane default camera centered over the Anatolian region', () => {
    expect(INITIAL_MAP_REGION.latitude).toBeCloseTo(38.0);
    expect(INITIAL_MAP_REGION.longitude).toBeCloseTo(35.0);
    expect(INITIAL_MAP_REGION.latitudeDelta).toBeGreaterThan(0);
    expect(INITIAL_MAP_REGION.longitudeDelta).toBeGreaterThan(0);
  });
});
