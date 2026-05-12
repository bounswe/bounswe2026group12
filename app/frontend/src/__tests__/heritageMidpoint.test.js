import { computeHeritageMidpoint, locatableMembers } from '../utils/heritageMidpoint';

describe('locatableMembers', () => {
  it('keeps members with numeric lat/lng', () => {
    const members = [
      { id: 1, latitude: 41, longitude: 29 },
      { id: 2, latitude: 38.5, longitude: 27 },
    ];
    expect(locatableMembers(members)).toEqual(members);
  });

  it('drops members with null lat or lng', () => {
    const members = [
      { id: 1, latitude: 41, longitude: 29 },
      { id: 2, latitude: null, longitude: 27 },
      { id: 3, latitude: 38, longitude: null },
    ];
    expect(locatableMembers(members)).toEqual([{ id: 1, latitude: 41, longitude: 29 }]);
  });

  it('returns an empty array when given no members', () => {
    expect(locatableMembers([])).toEqual([]);
  });
});

describe('computeHeritageMidpoint', () => {
  it('returns null when there are no locatable members', () => {
    expect(computeHeritageMidpoint([])).toBeNull();
    expect(computeHeritageMidpoint([{ latitude: null, longitude: null }])).toBeNull();
  });

  it('returns the only member when one is locatable', () => {
    expect(computeHeritageMidpoint([{ latitude: 41, longitude: 29 }])).toEqual([41, 29]);
  });

  it('averages latitude and longitude across locatable members', () => {
    const members = [
      { latitude: 40, longitude: 30 },
      { latitude: 42, longitude: 28 },
    ];
    expect(computeHeritageMidpoint(members)).toEqual([41, 29]);
  });

  it('ignores members with missing coordinates when averaging', () => {
    const members = [
      { latitude: 40, longitude: 30 },
      { latitude: null, longitude: 0 },
      { latitude: 42, longitude: 28 },
    ];
    expect(computeHeritageMidpoint(members)).toEqual([41, 29]);
  });
});
