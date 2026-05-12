/**
 * Map a backend `culture_summaries[].culture` value to the country names
 * (as they appear in world-atlas' `countries-110m.json` `properties.name`)
 * that should be tinted on the passport world map.
 *
 * Backend `Region.name` values are sub-region or geographic-region strings
 * ("Black Sea", "Aegean", "Mediterranean", "Balkan", "Nordic", …) — not
 * countries. We translate each one into the set of countries that culturally
 * belongs to it so the world map can light up a meaningful area.
 *
 * Lookup is case-insensitive and ignores leading/trailing whitespace.
 * Unknown culture names return `[]` so the map silently skips them rather
 * than throwing.
 *
 * To extend: add a new lowercase key and the array of country names that
 * match the strings in `countries-110m.json`. World-atlas uses Natural Earth
 * naming, so "Bosnia and Herz." (with the dot) and "United States of America"
 * are the canonical forms.
 */
const CULTURE_TO_COUNTRIES = {
  // Turkish sub-regions all map to Türkiye.
  aegean: ['Turkey', 'Greece'],
  anatolian: ['Turkey'],
  'central anatolia': ['Turkey'],
  'east anatolia': ['Turkey'],
  'eastern anatolia': ['Turkey'],
  marmara: ['Turkey'],
  'southeastern anatolia': ['Turkey', 'Iraq', 'Syria'],
  // Geographic / multi-country regions.
  'black sea': ['Turkey', 'Russia', 'Ukraine', 'Romania', 'Bulgaria', 'Georgia'],
  mediterranean: [
    'Turkey', 'Greece', 'Italy', 'Spain', 'France', 'Malta', 'Cyprus',
    'Egypt', 'Libya', 'Tunisia', 'Algeria', 'Morocco', 'Lebanon', 'Israel',
    'Syria', 'Croatia', 'Slovenia', 'Albania', 'Montenegro', 'Bosnia and Herz.',
  ],
  balkan: [
    'Greece', 'Bulgaria', 'Romania', 'Serbia', 'Croatia', 'Bosnia and Herz.',
    'Albania', 'Montenegro', 'Macedonia', 'Slovenia', 'Kosovo',
  ],
  balkans: [
    'Greece', 'Bulgaria', 'Romania', 'Serbia', 'Croatia', 'Bosnia and Herz.',
    'Albania', 'Montenegro', 'Macedonia', 'Slovenia', 'Kosovo',
  ],
  nordic: ['Sweden', 'Norway', 'Denmark', 'Finland', 'Iceland'],
};

export function countriesForCulture(cultureName) {
  if (typeof cultureName !== 'string') return [];
  const key = cultureName.trim().toLowerCase();
  return CULTURE_TO_COUNTRIES[key] ?? [];
}

/**
 * Build a `countryName → culture` lookup from a list of `culture_summaries`.
 * The same country can be claimed by more than one culture (e.g. Turkey by
 * both "Aegean" and "Black Sea"); in that case the culture with the highest
 * engagement (`recipes_tried + stories_saved`) wins. Ties break by the order
 * the backend sent them (cultures with higher arrays index lose).
 */
export function buildCountryCultureIndex(cultures) {
  const index = {};
  if (!Array.isArray(cultures)) return index;
  cultures.forEach((culture) => {
    const cultureName = culture?.culture ?? culture?.name;
    if (typeof cultureName !== 'string' || !cultureName) return;
    const countries = countriesForCulture(cultureName);
    const engagement =
      (culture.recipes_tried ?? culture.recipe_count ?? 0) +
      (culture.stories_saved ?? culture.story_count ?? 0);
    countries.forEach((country) => {
      const existing = index[country];
      if (!existing || engagement > existing.engagement) {
        index[country] = { culture: { ...culture, name: cultureName }, engagement };
      }
    });
  });
  return index;
}
