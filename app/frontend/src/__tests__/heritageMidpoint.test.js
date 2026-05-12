import { locatableMembers, groupByRegion, topRegion } from '../utils/heritageMidpoint';

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

describe('groupByRegion', () => {
  it('returns one group per distinct region', () => {
    const members = [
      { id: 1, region: 'Aegean',    content_type: 'recipe', latitude: 38, longitude: 27 },
      { id: 2, region: 'Black Sea', content_type: 'story',  latitude: 41, longitude: 36 },
      { id: 3, region: 'Aegean',    content_type: 'story',  latitude: 37, longitude: 28 },
    ];
    const groups = groupByRegion(members);
    expect(groups).toHaveLength(2);
    const aegean = groups.find((g) => g.region === 'Aegean');
    expect(aegean.members).toHaveLength(2);
    expect(aegean.coords[0]).toBeCloseTo((38 + 37) / 2, 5);
    expect(aegean.coords[1]).toBeCloseTo((27 + 28) / 2, 5);
  });

  it('drops members with null coordinates', () => {
    const members = [
      { id: 1, region: 'Aegean', content_type: 'recipe', latitude: 38, longitude: 27 },
      { id: 2, region: 'Aegean', content_type: 'recipe', latitude: null, longitude: null },
    ];
    const groups = groupByRegion(members);
    expect(groups).toHaveLength(1);
    expect(groups[0].members).toHaveLength(1);
  });

  it('returns empty array when all members lack coordinates', () => {
    expect(groupByRegion([{ id: 1, region: 'X', latitude: null, longitude: null }])).toEqual([]);
  });

  it('returns empty array for empty input', () => {
    expect(groupByRegion([])).toEqual([]);
  });

  it('preserves insertion order for tie-break', () => {
    const members = [
      { id: 1, region: 'B', content_type: 'recipe', latitude: 40, longitude: 30 },
      { id: 2, region: 'A', content_type: 'recipe', latitude: 41, longitude: 29 },
    ];
    const groups = groupByRegion(members);
    expect(groups[0].region).toBe('B');
    expect(groups[1].region).toBe('A');
  });
});

describe('topRegion', () => {
  it('returns null for empty array', () => {
    expect(topRegion([])).toBeNull();
  });

  it('returns the only group when there is one', () => {
    const groups = [{ region: 'X', coords: [40, 30], members: [{ content_type: 'recipe' }] }];
    expect(topRegion(groups)).toBe(groups[0]);
  });

  it('picks the group with the most recipes', () => {
    const groups = [
      { region: 'A', coords: [40, 30], members: [{ content_type: 'story' }] },
      { region: 'B', coords: [41, 29], members: [{ content_type: 'recipe' }, { content_type: 'recipe' }] },
    ];
    expect(topRegion(groups)).toBe(groups[1]);
  });

  it('tie-breaks to the first group (lower index)', () => {
    const groups = [
      { region: 'A', coords: [40, 30], members: [{ content_type: 'recipe' }] },
      { region: 'B', coords: [41, 29], members: [{ content_type: 'recipe' }] },
    ];
    expect(topRegion(groups)).toBe(groups[0]);
  });

  it('falls back to first group when all groups have only stories', () => {
    const groups = [
      { region: 'A', coords: [40, 30], members: [{ content_type: 'story' }] },
      { region: 'B', coords: [41, 29], members: [{ content_type: 'story' }] },
    ];
    expect(topRegion(groups)).toBe(groups[0]);
  });
});
