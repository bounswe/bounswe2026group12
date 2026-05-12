/**
 * Country (as named by world-atlas' `countries-110m.json` `properties.name`)
 * → culinary-region lookup used by the home page's `RegionContentMap`.
 *
 * Region names here mirror the backend `Region.name` values seeded in
 * `app/backend/apps/recipes/migrations/0004_seed_regions.py` (which is the
 * single source of truth — every value below MUST exist there or the map will
 * never light up that country, because `RegionContentMap` joins this lookup
 * against the `/api/map/regions/` payload by exact name).
 *
 * Strategy: prefer the most specific region available — a country-level
 * region wins over a macro-region. e.g. `Japan` → `Japanese` (no country-level
 * "Japan" region exists), `Russia` → `Russia` (a country-level region exists),
 * `Sweden` → `Nordic` (no Swedish country-level region).
 *
 * Aliases: world-atlas / Natural Earth truncates a few long names with `.`
 * ("Bosnia and Herz.", "Czech Rep.") — we add both forms so existing tests
 * keep passing and so the map doesn't go cream-empty if the topojson swaps
 * between long and short forms in a future version.
 *
 * Lookup is case-insensitive and trims whitespace.
 * Returns `null` for countries that don't belong to any culinary region yet.
 */
export const COUNTRY_TO_REGION = {
  // ── Anatolia / surrounding ──
  Turkey: 'Anatolian',
  Iraq: 'Southeastern Anatolia',
  Syria: 'Levantine',
  Lebanon: 'Levantine',
  Israel: 'Levantine',
  Jordan: 'Levantine',
  Palestine: 'Levantine',
  'West Bank': 'Levantine',

  // ── Mediterranean basin ──
  Greece: 'Greece',
  Italy: 'Italian',
  'San Marino': 'Italian',
  Vatican: 'Italian',
  Malta: 'Mediterranean',
  Cyprus: 'Mediterranean',
  'N. Cyprus': 'Mediterranean',

  // ── Iberia ──
  Spain: 'Spain',
  Portugal: 'Portugal',
  Andorra: 'Iberian',

  // ── France & adjacent ──
  France: 'France',
  Monaco: 'French',

  // ── British Isles ──
  'United Kingdom': 'United Kingdom',
  Ireland: 'British Isles',

  // ── Central Europe ──
  Germany: 'Germany',
  Austria: 'Central European',
  Switzerland: 'Central European',
  Liechtenstein: 'Central European',
  Luxembourg: 'Central European',
  Belgium: 'Central European',
  Netherlands: 'Central European',
  Czechia: 'Central European',
  'Czech Rep.': 'Central European',
  Slovakia: 'Central European',
  Hungary: 'Hungary',
  Poland: 'Poland',

  // ── Eastern Europe ──
  Belarus: 'Eastern European',
  Latvia: 'Eastern European',
  Lithuania: 'Eastern European',
  Estonia: 'Eastern European',
  Moldova: 'Eastern European',

  // ── Nordics ──
  Sweden: 'Nordic',
  Norway: 'Nordic',
  Denmark: 'Nordic',
  Finland: 'Nordic',
  Iceland: 'Nordic',

  // ── Balkans ──
  Albania: 'Balkan',
  Bosnia: 'Balkan',
  'Bosnia and Herz.': 'Balkan',
  'Bosnia and Herzegovina': 'Balkan',
  Croatia: 'Balkan',
  Kosovo: 'Balkan',
  Macedonia: 'Balkan',
  'North Macedonia': 'Balkan',
  Montenegro: 'Balkan',
  Serbia: 'Balkan',
  Slovenia: 'Balkan',

  // ── Black Sea littoral ──
  Russia: 'Russia',
  Ukraine: 'Black Sea',
  Romania: 'Black Sea',
  Bulgaria: 'Black Sea',
  Georgia: 'Black Sea',
  Armenia: 'Black Sea',
  Azerbaijan: 'Black Sea',

  // ── Persian / Arabian ──
  Iran: 'Persian',
  'Saudi Arabia': 'Saudi Arabia',
  Yemen: 'Arabian',
  Oman: 'Arabian',
  'United Arab Emirates': 'Arabian',
  Qatar: 'Arabian',
  Bahrain: 'Arabian',
  Kuwait: 'Arabian',

  // ── Central Asia ──
  Afghanistan: 'Central Asian',
  Kazakhstan: 'Central Asian',
  Turkmenistan: 'Central Asian',
  Tajikistan: 'Central Asian',
  Mongolia: 'Central Asian',
  Kyrgyzstan: 'Kyrgyzstan',
  Uzbekistan: 'Uzbekistan',

  // ── South Asia ──
  India: 'Indian',
  Pakistan: 'Indian',
  Bangladesh: 'Indian',
  Nepal: 'Indian',
  Bhutan: 'Indian',
  'Sri Lanka': 'Indian',
  Maldives: 'Indian',

  // ── East Asia ──
  China: 'China',
  Taiwan: 'Chinese',
  Japan: 'Japanese',
  'North Korea': 'Korean',
  'Dem. Rep. Korea': 'Korean',
  'South Korea': 'South Korea',
  'Republic of Korea': 'South Korea',

  // ── Southeast Asia ──
  Thailand: 'Thailand',
  Vietnam: 'Vietnam',
  Laos: 'Southeast Asian',
  Cambodia: 'Southeast Asian',
  Myanmar: 'Southeast Asian',
  Burma: 'Southeast Asian',
  Malaysia: 'Southeast Asian',
  Singapore: 'Southeast Asian',
  Brunei: 'Southeast Asian',
  Indonesia: 'Southeast Asian',
  Philippines: 'Southeast Asian',
  'Timor-Leste': 'Southeast Asian',
  'East Timor': 'Southeast Asian',

  // ── North Africa ──
  Morocco: 'Morocco',
  Algeria: 'North African',
  Tunisia: 'North African',
  Libya: 'North African',
  Egypt: 'North African',
  Sudan: 'North African',
  'W. Sahara': 'North African',
  'Western Sahara': 'North African',

  // ── East Africa ──
  Ethiopia: 'Ethiopia',
  Eritrea: 'East African',
  Djibouti: 'East African',
  Somalia: 'East African',
  Somaliland: 'East African',
  'S. Sudan': 'East African',
  'South Sudan': 'East African',
  Kenya: 'East African',
  Uganda: 'East African',
  Tanzania: 'East African',
  Rwanda: 'East African',
  Burundi: 'East African',
  Madagascar: 'East African',
  Comoros: 'East African',
  Seychelles: 'East African',
  Mauritius: 'East African',
  Malawi: 'East African',
  Mozambique: 'East African',
  Zambia: 'East African',
  Zimbabwe: 'East African',

  // ── West / Central Africa ──
  Nigeria: 'Nigeria',
  Ghana: 'Ghana',
  Senegal: 'West African',
  Gambia: 'West African',
  'Guinea-Bissau': 'West African',
  Guinea: 'West African',
  'Sierra Leone': 'West African',
  Liberia: 'West African',
  'Côte d\'Ivoire': 'West African',
  'Ivory Coast': 'West African',
  Mali: 'West African',
  'Burkina Faso': 'West African',
  Niger: 'West African',
  Togo: 'West African',
  Benin: 'West African',
  Mauritania: 'West African',
  'Cape Verde': 'West African',
  Cameroon: 'West African',
  Chad: 'West African',
  'Central African Rep.': 'West African',
  'Central African Republic': 'West African',
  Gabon: 'West African',
  'Eq. Guinea': 'West African',
  'Equatorial Guinea': 'West African',
  Congo: 'West African',
  'Dem. Rep. Congo': 'West African',
  'Democratic Republic of the Congo': 'West African',
  Angola: 'West African',
  Namibia: 'West African',

  // ── North America ──
  'United States of America': 'North American',
  'United States': 'North American',
  USA: 'North American',
  Canada: 'North American',
  Greenland: 'North American',

  // ── Central America / Caribbean ──
  Mexico: 'Central American',
  Guatemala: 'Central American',
  Belize: 'Central American',
  Honduras: 'Central American',
  'El Salvador': 'El Salvador',
  Nicaragua: 'Central American',
  'Costa Rica': 'Central American',
  Panama: 'Central American',
  Cuba: 'Caribbean',
  Jamaica: 'Jamaica',
  Haiti: 'Caribbean',
  'Dominican Rep.': 'Caribbean',
  'Dominican Republic': 'Caribbean',
  'Puerto Rico': 'Caribbean',
  'Trinidad and Tobago': 'Trinidad and Tobago',
  Bahamas: 'Caribbean',
  Dominica: 'Caribbean',
  Barbados: 'Caribbean',

  // ── South America ──
  Brazil: 'Brazil',
  Argentina: 'Argentina',
  Peru: 'Peru',
  Chile: 'South American',
  Colombia: 'South American',
  Venezuela: 'South American',
  Ecuador: 'South American',
  Bolivia: 'South American',
  Paraguay: 'South American',
  Uruguay: 'South American',
  Guyana: 'South American',
  Suriname: 'South American',
  'French Guiana': 'South American',

  // ── Oceania ──
  Australia: 'Australia',
  'New Zealand': 'Oceanian',
  'Papua New Guinea': 'Oceanian',
  Fiji: 'Oceanian',
  'Solomon Is.': 'Oceanian',
  'Solomon Islands': 'Oceanian',
  Vanuatu: 'Oceanian',
  Samoa: 'Oceanian',
  Tonga: 'Oceanian',
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
