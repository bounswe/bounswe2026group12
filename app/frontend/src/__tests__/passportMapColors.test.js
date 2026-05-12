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
});
