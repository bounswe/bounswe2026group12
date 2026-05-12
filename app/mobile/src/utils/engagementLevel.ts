/**
 * Engagement-depth ladder used by the embedded passport world map (issue #603).
 *
 * Each user-culture rollup is bucketed into one of five levels that drives
 * pin colour + glyph on the map:
 *
 *   0  no engagement                 — pin not rendered
 *   1  story saved only              — silver  (#C0C0C0)
 *   2  recipe tried                  — bronze  (#CD7F32)
 *   3  heritage contributed          — emerald (#50C878)
 *   4  legendary stamp               — purple  (#9B59B6)
 *
 * The function reads tolerantly: rarity strings are the canonical signal
 * (the backend hands them back even when per-culture counters are zero),
 * but raw counters (`recipes_tried`, `stories_saved`, `heritage_recipes`)
 * are used as a fallback for any rollup whose rarity field is missing or
 * unknown. Extracted into `utils/` so the colour rule can be unit-tested
 * without spinning up `react-native-maps`.
 */

/**
 * Minimal duck-typed contract — the live shape (see PR #784) is
 * `{ culture | culture_name, stamp_rarity | rarity, recipes_tried,
 *    stories_saved, heritage_recipes?, ingredients_discovered? }`.
 * We accept anything with those keys so the function tolerates both the
 * raw backend payload and the normalized service-layer shape.
 */
export type EngagementCulture = {
  culture?: string | null;
  culture_name?: string | null;
  rarity?: string | null;
  stamp_rarity?: string | null;
  recipes_tried?: number | null;
  stories_saved?: number | null;
  heritage_recipes?: number | null;
  interactions?: number | null;
};

export type EngagementLevel = 0 | 1 | 2 | 3 | 4;

export const ENGAGEMENT_COLORS: Record<Exclude<EngagementLevel, 0>, string> = {
  1: '#C0C0C0', // silver — story saved
  2: '#CD7F32', // bronze — recipe tried
  3: '#50C878', // emerald — heritage contributed
  4: '#9B59B6', // legendary purple
};

export const ENGAGEMENT_LABELS: Record<Exclude<EngagementLevel, 0>, string> = {
  1: 'Story saved',
  2: 'Recipe tried',
  3: 'Heritage contributed',
  4: 'Legendary',
};

function toNum(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Resolve the engagement bucket for a single culture rollup. Pure: no I/O,
 * no React state. Rarity takes precedence because the backend bumps it on
 * heritage shares even when per-culture interaction counters stay at zero
 * (see `apps/passport/services.py#culture_summaries`).
 */
export function engagementLevel(culture: EngagementCulture | null | undefined): EngagementLevel {
  if (!culture) return 0;

  const rarityRaw =
    (typeof culture.stamp_rarity === 'string' && culture.stamp_rarity) ||
    (typeof culture.rarity === 'string' && culture.rarity) ||
    '';
  const rarity = rarityRaw.toLowerCase();

  const recipes = toNum(culture.recipes_tried);
  const stories = toNum(culture.stories_saved);
  const heritage = toNum(culture.heritage_recipes);

  // Tier 4: legendary stamp always wins, regardless of counters.
  if (rarity === 'legendary') return 4;

  // Tier 3: heritage contribution — either an explicit counter, or the
  // backend has already promoted the stamp to emerald/gold for heritage.
  if (heritage > 0 || rarity === 'emerald' || rarity === 'gold') return 3;

  // Tier 2: at least one recipe tried (or bronze stamp without other signal).
  if (recipes > 0 || rarity === 'bronze') return 2;

  // Tier 1: stories saved only (silver stamp also lands here).
  if (stories > 0 || rarity === 'silver') return 1;

  // No engagement signal anywhere — pin is skipped by the map.
  return 0;
}

/** Convenience: hex colour for a level, or `null` for level 0. */
export function colorForLevel(level: EngagementLevel): string | null {
  if (level === 0) return null;
  return ENGAGEMENT_COLORS[level];
}
