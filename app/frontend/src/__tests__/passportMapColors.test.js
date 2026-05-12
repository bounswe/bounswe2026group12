import { getRegionFill, MAP_FILLS } from '../utils/passportMapColors';

describe('getRegionFill', () => {
  it('null culture → default fill, no star', () => {
    expect(getRegionFill(null)).toEqual({ fill: MAP_FILLS.default, star: false });
  });

  it('no engagement → default fill', () => {
    expect(getRegionFill({ recipe_count: 0, story_count: 0, heritage_count: 0, stamp_rarity: 'bronze' }))
      .toEqual({ fill: MAP_FILLS.default, star: false });
  });

  it('story saved → light fill', () => {
    expect(getRegionFill({ recipe_count: 0, story_count: 1, heritage_count: 0, stamp_rarity: 'bronze' }))
      .toEqual({ fill: MAP_FILLS.light, star: false });
  });

  it('recipe tried → medium fill', () => {
    expect(getRegionFill({ recipe_count: 2, story_count: 0, heritage_count: 0, stamp_rarity: 'bronze' }))
      .toEqual({ fill: MAP_FILLS.medium, star: false });
  });

  it('heritage contributed → dark fill', () => {
    expect(getRegionFill({ recipe_count: 0, story_count: 0, heritage_count: 1, stamp_rarity: 'bronze' }))
      .toEqual({ fill: MAP_FILLS.dark, star: false });
  });

  it('legendary stamp → star flag returned', () => {
    expect(getRegionFill({ recipe_count: 1, story_count: 0, heritage_count: 0, stamp_rarity: 'legendary' }).star)
      .toBe(true);
  });

  it('non-legendary stamp → no star', () => {
    expect(getRegionFill({ recipe_count: 1, story_count: 0, heritage_count: 0, stamp_rarity: 'gold' }).star)
      .toBe(false);
  });

  // Backend `culture_summaries[]` ships `recipes_tried` / `stories_saved` /
  // `rarity` — these tests cover the canonical contract directly so the map
  // tinting works against the real API (#583 fix).
  describe('canonical backend shape', () => {
    it('recipes_tried > 0 → medium fill', () => {
      expect(getRegionFill({ recipes_tried: 3, stories_saved: 0, rarity: 'bronze' }))
        .toEqual({ fill: MAP_FILLS.medium, star: false });
    });

    it('stories_saved > 0 (no recipes) → light fill', () => {
      expect(getRegionFill({ recipes_tried: 0, stories_saved: 2, rarity: 'bronze' }))
        .toEqual({ fill: MAP_FILLS.light, star: false });
    });

    it('legendary rarity → dark fill with star', () => {
      expect(getRegionFill({ recipes_tried: 5, stories_saved: 2, rarity: 'legendary' }))
        .toEqual({ fill: MAP_FILLS.dark, star: true });
    });

    it('gold rarity with recipes → medium fill, no star', () => {
      expect(getRegionFill({ recipes_tried: 1, stories_saved: 0, rarity: 'gold' }))
        .toEqual({ fill: MAP_FILLS.medium, star: false });
    });
  });
});
