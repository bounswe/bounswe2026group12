export const MAP_FILLS = {
  default:   '#E8DDD0',
  light:     '#F4C49A',
  medium:    '#E09050',
  dark:      '#8B3A0F',
};

export function getRegionFill(culture) {
  if (!culture) return { fill: MAP_FILLS.default, star: false };

  const hasLegendary = culture.stamp_rarity === 'legendary';
  if (culture.heritage_count > 0) return { fill: MAP_FILLS.dark,   star: hasLegendary };
  if (culture.recipe_count   > 0) return { fill: MAP_FILLS.medium, star: hasLegendary };
  if (culture.story_count    > 0) return { fill: MAP_FILLS.light,  star: hasLegendary };
  return { fill: MAP_FILLS.default, star: false };
}
