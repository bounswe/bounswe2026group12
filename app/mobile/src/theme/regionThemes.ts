import { tokens } from './tokens';

/**
 * Region-specific accent overrides. Keys must match `Region.name` strings
 * returned by `/api/regions/`. Unmapped regions fall back to the default theme.
 */
export type RegionAccent = {
  /** Action / call-to-action background. */
  accent: string;
  /** Border on hero elements (cards, sheet handle). */
  accentBorder: string;
  /** Text color on top of `accent` fills. */
  accentText: string;
};

const DEFAULT_ACCENT: RegionAccent = {
  accent: tokens.colors.accentGreen,
  accentBorder: tokens.colors.surfaceDark,
  accentText: tokens.colors.textOnDark,
};

const REGION_ACCENTS: Record<string, RegionAccent> = {
  Aegean: { accent: '#1F6FB2', accentBorder: '#0B3A66', accentText: '#F5FAFF' },
  'Black Sea': { accent: '#2F5D3A', accentBorder: '#142C1C', accentText: '#F2F8F4' },
  Anatolian: { accent: '#A86A2C', accentBorder: '#5A3A18', accentText: '#FFF5E8' },
  Marmara: { accent: '#5C5DAB', accentBorder: '#2A2B65', accentText: '#F2F2FA' },
  Mediterranean: { accent: '#0F8E8E', accentBorder: '#054242', accentText: '#EAFCFC' },
  'Southeastern Anatolia': { accent: '#B23A48', accentBorder: '#5C1820', accentText: '#FFEDEF' },
  Levantine: { accent: '#C77B2B', accentBorder: '#5E3712', accentText: '#FFF1E0' },
  Persian: { accent: '#7E3F95', accentBorder: '#3A1B47', accentText: '#F8EEFF' },
  Arabian: { accent: '#C49A2A', accentBorder: '#5E4910', accentText: '#FFF6D5' },
  Balkan: { accent: '#2A8E5F', accentBorder: '#0F4329', accentText: '#EAF8F1' },
  Caucasian: { accent: '#6E5E2A', accentBorder: '#33290F', accentText: '#FFF7DC' },
};

export function accentForRegion(name: string | null | undefined): RegionAccent {
  if (!name) return DEFAULT_ACCENT;
  return REGION_ACCENTS[name] ?? DEFAULT_ACCENT;
}

export const DEFAULT_REGION_ACCENT = DEFAULT_ACCENT;
