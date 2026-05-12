export const MAP_FILLS = {
  default:   '#E8DDD0',
  light:     '#F4C49A',
  medium:    '#E09050',
  dark:      '#8B3A0F',
};

/**
 * Decide a region fill + star marker based on the user's engagement with the
 * culture mapped to that region.
 *
 * Backend `culture_summaries[]` ships
 *   { culture, recipes_tried, stories_saved, interactions, rarity }
 *
 * Older mock payloads used `stamp_rarity` / `recipe_count` / `story_count`;
 * we accept both shapes so the map keeps rendering through future contract
 * tweaks. `heritage_count` is not exposed per-culture yet, so the
 * "heritage contributed" tier collapses into the legendary-rarity branch
 * (any culture deep enough to earn a legendary stamp gets the dark fill).
 */
export function getRegionFill(culture) {
  if (!culture) return { fill: MAP_FILLS.default, star: false };

  const rarity = culture.rarity ?? culture.stamp_rarity ?? null;
  const recipesTried = culture.recipes_tried ?? culture.recipe_count ?? 0;
  const storiesSaved = culture.stories_saved ?? culture.story_count ?? 0;
  const heritageCount = culture.heritage_count ?? 0;
  const isLegendary = rarity === 'legendary';

  if (heritageCount > 0 || isLegendary) {
    return { fill: MAP_FILLS.dark, star: isLegendary };
  }
  if (recipesTried > 0) return { fill: MAP_FILLS.medium, star: false };
  if (storiesSaved > 0) return { fill: MAP_FILLS.light, star: false };
  return { fill: MAP_FILLS.default, star: false };
}
