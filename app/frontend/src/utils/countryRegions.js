/**
 * Country (as named by world-atlas' `countries-110m.json` `properties.name`)
 * → culinary-region lookup used by the home page's `RegionContentMap`.
 *
 * Region names here mirror the backend `Region.name` values returned by
 * `/api/map/regions/` (e.g. "Anatolia", "Aegean", "Black Sea", …) so that the
 * map can hand the name straight into `/search?region=<name>` URLs and into
 * `byName.get(region.name)` lookups against the API payload.
 *
 * The same source data underpins `passportCultureRegions.js` (which works in
 * the inverse direction, culture → countries). The two utilities are kept
 * separate because they serve genuinely different flows: the passport flow
 * cares about how engaged the user is with a culture and can let multiple
 * cultures claim the same country, while the home-page map only needs a
 * single canonical region per country.
 *
 * Lookup is case-insensitive and trims whitespace.
 * Returns `null` for countries that don't belong to any culinary region yet.
 */
export const COUNTRY_TO_REGION = {
  // Turkish heartland — single canonical pick per country.
  Turkey: 'Anatolia',
  Greece: 'Aegean',
  Italy: 'Mediterranean',
  Spain: 'Mediterranean',
  France: 'Mediterranean',
  Malta: 'Mediterranean',
  Cyprus: 'Mediterranean',
  Egypt: 'Mediterranean',
  Libya: 'Mediterranean',
  Tunisia: 'Mediterranean',
  Algeria: 'Mediterranean',
  Morocco: 'Mediterranean',
  Lebanon: 'Mediterranean',
  Israel: 'Mediterranean',
  Syria: 'Mediterranean',
  // Black Sea littoral.
  Ukraine: 'Black Sea',
  Russia: 'Black Sea',
  Romania: 'Black Sea',
  Bulgaria: 'Black Sea',
  Georgia: 'Black Sea',
  // South-eastern Anatolia spills into Iraq.
  Iraq: 'Southeast Anatolia',
};

const LOOKUP = Object.fromEntries(
  Object.entries(COUNTRY_TO_REGION).map(([country, region]) => [
    country.trim().toLowerCase(),
    region,
  ]),
);

/**
 * Return the canonical culinary-region name for a country, or `null` if the
 * country isn't part of any region yet. Trims whitespace and ignores case.
 */
export function getRegionForCountry(countryName) {
  if (typeof countryName !== 'string') return null;
  const key = countryName.trim().toLowerCase();
  return LOOKUP[key] ?? null;
}
