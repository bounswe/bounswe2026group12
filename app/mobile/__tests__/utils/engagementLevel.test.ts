import {
  ENGAGEMENT_COLORS,
  colorForLevel,
  engagementLevel,
} from '../../src/utils/engagementLevel';

describe('engagementLevel', () => {
  it('returns 0 when the culture is null or undefined', () => {
    expect(engagementLevel(null)).toBe(0);
    expect(engagementLevel(undefined)).toBe(0);
  });

  it('returns 0 when there is no engagement signal of any kind', () => {
    expect(
      engagementLevel({
        culture_name: 'Aegean',
        stamp_rarity: '',
        recipes_tried: 0,
        stories_saved: 0,
        heritage_recipes: 0,
      }),
    ).toBe(0);
  });

  it('returns 1 (silver) for stories-saved-only', () => {
    expect(
      engagementLevel({
        culture_name: 'Aegean',
        stamp_rarity: '',
        recipes_tried: 0,
        stories_saved: 2,
        heritage_recipes: 0,
      }),
    ).toBe(1);
  });

  it('returns 1 (silver) when rarity is silver even with zero counters', () => {
    expect(engagementLevel({ culture_name: 'Aegean', stamp_rarity: 'silver' })).toBe(1);
  });

  it('returns 2 (bronze) for at least one recipe tried', () => {
    expect(
      engagementLevel({
        culture_name: 'Marmara',
        stamp_rarity: '',
        recipes_tried: 1,
        stories_saved: 0,
        heritage_recipes: 0,
      }),
    ).toBe(2);
  });

  it('returns 2 (bronze) when rarity is bronze', () => {
    expect(engagementLevel({ culture_name: 'Marmara', stamp_rarity: 'bronze' })).toBe(2);
  });

  it('returns 3 (emerald) for an explicit heritage_recipes count', () => {
    expect(
      engagementLevel({
        culture_name: 'Anatolian',
        stamp_rarity: '',
        recipes_tried: 0,
        stories_saved: 0,
        heritage_recipes: 1,
      }),
    ).toBe(3);
  });

  it('returns 3 (emerald) when rarity is emerald or gold', () => {
    expect(engagementLevel({ culture_name: 'Anatolian', stamp_rarity: 'emerald' })).toBe(3);
    expect(engagementLevel({ culture_name: 'Anatolian', stamp_rarity: 'gold' })).toBe(3);
  });

  it('returns 4 (legendary) and prefers it over every other signal', () => {
    expect(
      engagementLevel({
        culture_name: 'Persian',
        stamp_rarity: 'legendary',
        recipes_tried: 0,
        stories_saved: 0,
        heritage_recipes: 0,
      }),
    ).toBe(4);
    // Legendary still wins when counters look like a bronze tier.
    expect(
      engagementLevel({
        culture_name: 'Persian',
        stamp_rarity: 'legendary',
        recipes_tried: 99,
        stories_saved: 99,
        heritage_recipes: 99,
      }),
    ).toBe(4);
  });

  it('falls back to counters when the rarity string is unknown', () => {
    expect(
      engagementLevel({
        culture_name: 'Caucasian',
        stamp_rarity: 'mystery-tier',
        recipes_tried: 0,
        stories_saved: 1,
        heritage_recipes: 0,
      }),
    ).toBe(1);
  });

  it('accepts the raw backend keys (`culture` + `rarity`)', () => {
    expect(
      engagementLevel({
        culture: 'Black Sea',
        rarity: 'emerald',
      } as any),
    ).toBe(3);
  });

  it('tolerates missing optional fields without throwing', () => {
    expect(engagementLevel({ culture_name: 'X' } as any)).toBe(0);
  });

  it('rarity is case-insensitive', () => {
    expect(engagementLevel({ culture_name: 'Z', stamp_rarity: 'LEGENDARY' })).toBe(4);
    expect(engagementLevel({ culture_name: 'Z', stamp_rarity: 'Emerald' })).toBe(3);
  });
});

describe('colorForLevel', () => {
  it('returns null for level 0', () => {
    expect(colorForLevel(0)).toBeNull();
  });

  it('returns silver / bronze / emerald / purple for levels 1..4', () => {
    expect(colorForLevel(1)).toBe('#C0C0C0');
    expect(colorForLevel(2)).toBe('#CD7F32');
    expect(colorForLevel(3)).toBe('#50C878');
    expect(colorForLevel(4)).toBe('#9B59B6');
  });

  it('exports the same colours via ENGAGEMENT_COLORS', () => {
    expect(ENGAGEMENT_COLORS[1]).toBe('#C0C0C0');
    expect(ENGAGEMENT_COLORS[4]).toBe('#9B59B6');
  });
});
