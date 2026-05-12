import { tokens } from '../theme';

/**
 * Catalogue of passport cover themes shipped with the mobile app (#600).
 *
 * Themes fall into two buckets:
 *   - Level-based: awarded as the user climbs through Cultural Passport
 *     levels (Classic Traveler → Heritage Archive → ...).
 *   - Calendar-based: surfaced during cultural events such as Ramazan, Eid,
 *     Harvest Moon, and Lunar New Year.
 *
 * The backend stores `active_theme` as a slug string on the passport (see
 * apps/passport/models.py) but the issue spec describes a future-proof
 * `{ name, kind? }` shape. `resolveTheme` accepts both, plus plain strings,
 * so the component is forward-compatible while still working today.
 */

export type PassportThemeName =
  | 'Classic Traveler'
  | 'Vintage Recipe Book'
  | 'Street Food Explorer'
  | "Grandmother's Kitchen"
  | 'Mediterranean Journal'
  | 'Heritage Archive'
  | 'World Kitchen Explorer'
  | 'Ramazan'
  | 'Eid Festival'
  | 'Harvest Moon'
  | 'Lunar New Year';

export type PassportTheme = {
  name: PassportThemeName | string;
  background: string;
  accent: string;
  textOnCover: string;
  glyph: string;
  copy: string;
};

const c = tokens.colors;

/** Canonical catalogue keyed by the user-facing theme name. */
export const PASSPORT_THEMES: Record<PassportThemeName, PassportTheme> = {
  'Classic Traveler': {
    name: 'Classic Traveler',
    background: c.surface,
    accent: c.accentMustard,
    textOnCover: c.surfaceDark,
    glyph: '🧳',
    copy: 'CLASSIC TRAVELER',
  },
  'Vintage Recipe Book': {
    name: 'Vintage Recipe Book',
    background: c.accentMustard,
    accent: c.surfaceDark,
    textOnCover: c.surfaceDark,
    glyph: '📖',
    copy: 'VINTAGE RECIPE BOOK',
  },
  'Street Food Explorer': {
    name: 'Street Food Explorer',
    background: c.primary,
    accent: c.accentGreen,
    textOnCover: c.surfaceDark,
    glyph: '🌮',
    copy: 'STREET FOOD EXPLORER',
  },
  "Grandmother's Kitchen": {
    name: "Grandmother's Kitchen",
    background: c.bg,
    accent: c.primary,
    textOnCover: c.surfaceDark,
    glyph: '🍞',
    copy: "GRANDMOTHER'S KITCHEN",
  },
  'Mediterranean Journal': {
    name: 'Mediterranean Journal',
    background: c.accentGreen,
    accent: c.accentMustard,
    textOnCover: c.bg,
    glyph: '🫒',
    copy: 'MEDITERRANEAN JOURNAL',
  },
  'Heritage Archive': {
    name: 'Heritage Archive',
    background: c.surfaceDark,
    accent: c.accentMustard,
    textOnCover: c.bg,
    glyph: '🏛️',
    copy: 'HERITAGE ARCHIVE',
  },
  'World Kitchen Explorer': {
    name: 'World Kitchen Explorer',
    background: c.primaryHover,
    accent: c.accentGreen,
    textOnCover: c.bg,
    glyph: '🌍',
    copy: 'WORLD KITCHEN EXPLORER',
  },
  Ramazan: {
    name: 'Ramazan',
    background: c.surfaceDark,
    accent: c.accentMustard,
    textOnCover: c.bg,
    glyph: '🌙',
    copy: 'RAMAZAN EDITION',
  },
  'Eid Festival': {
    name: 'Eid Festival',
    background: c.accentGreen,
    accent: c.accentMustard,
    textOnCover: c.bg,
    glyph: '🕌',
    copy: 'EID FESTIVAL',
  },
  'Harvest Moon': {
    name: 'Harvest Moon',
    background: c.primary,
    accent: c.accentMustard,
    textOnCover: c.surfaceDark,
    glyph: '🌾',
    copy: 'HARVEST MOON',
  },
  'Lunar New Year': {
    name: 'Lunar New Year',
    background: c.primaryHover,
    accent: c.accentMustard,
    textOnCover: c.bg,
    glyph: '🧧',
    copy: 'LUNAR NEW YEAR',
  },
};

/**
 * Aliases for backend slug strings, lowercase forms, and a handful of
 * synonymous names. Anything we don't recognise will fall through to the
 * level-based default.
 */
const NAME_ALIASES: Record<string, PassportThemeName> = {
  classic_traveler: 'Classic Traveler',
  'classic traveler': 'Classic Traveler',
  vintage_recipe_book: 'Vintage Recipe Book',
  'vintage recipe book': 'Vintage Recipe Book',
  street_food_explorer: 'Street Food Explorer',
  'street food explorer': 'Street Food Explorer',
  grandmothers_kitchen: "Grandmother's Kitchen",
  grandmother_kitchen: "Grandmother's Kitchen",
  "grandmother's kitchen": "Grandmother's Kitchen",
  mediterranean_journal: 'Mediterranean Journal',
  'mediterranean journal': 'Mediterranean Journal',
  aegean_voyager: 'Mediterranean Journal',
  heritage_archive: 'Heritage Archive',
  'heritage archive': 'Heritage Archive',
  world_kitchen_explorer: 'World Kitchen Explorer',
  'world kitchen explorer': 'World Kitchen Explorer',
  ramazan: 'Ramazan',
  ramadan: 'Ramazan',
  eid: 'Eid Festival',
  eid_festival: 'Eid Festival',
  'eid festival': 'Eid Festival',
  harvest_moon: 'Harvest Moon',
  'harvest moon': 'Harvest Moon',
  lunar_new_year: 'Lunar New Year',
  'lunar new year': 'Lunar New Year',
};

function normaliseName(input: string): PassportThemeName | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (trimmed in PASSPORT_THEMES) {
    return trimmed as PassportThemeName;
  }
  const key = trimmed.toLowerCase();
  if (key in NAME_ALIASES) {
    return NAME_ALIASES[key];
  }
  return null;
}

/**
 * Pick a sensible theme based purely on the user's passport level. Used as a
 * fallback when the backend doesn't return an active_theme we recognise.
 *   1-2  → Classic Traveler
 *   3-5  → Vintage Recipe Book
 *   6-8  → Mediterranean Journal
 *   9+   → Heritage Archive
 */
export function themeForLevel(level: number | undefined): PassportTheme {
  const lvl = typeof level === 'number' && level > 0 ? level : 1;
  if (lvl >= 9) return PASSPORT_THEMES['Heritage Archive'];
  if (lvl >= 6) return PASSPORT_THEMES['Mediterranean Journal'];
  if (lvl >= 3) return PASSPORT_THEMES['Vintage Recipe Book'];
  return PASSPORT_THEMES['Classic Traveler'];
}

export type ActiveThemeInput =
  | { name?: string | null }
  | string
  | null
  | undefined;

/**
 * Resolve the cover theme for a passport response. Accepts either the legacy
 * slug string returned by the backend today (e.g. `"classic_traveler"`) or
 * the richer `{ name, kind? }` object described in the #600 spec. Falls back
 * to a level-based default when nothing matches.
 */
export function resolveTheme(
  active: ActiveThemeInput,
  level?: number,
): PassportTheme {
  let rawName: string | null = null;
  if (typeof active === 'string') {
    rawName = active;
  } else if (active && typeof active === 'object' && active.name) {
    rawName = active.name;
  }

  if (rawName) {
    const matched = normaliseName(rawName);
    if (matched) {
      return PASSPORT_THEMES[matched];
    }
  }

  return themeForLevel(level);
}
