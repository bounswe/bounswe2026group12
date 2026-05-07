// Per-region CSS variable overrides applied to the map page when a region is focused.
// Variables are scoped to .map-page via inline style; they do not affect global tokens.
export const REGION_THEMES = {
  Anatolia: {
    label: 'Anatolia',
    '--rt-primary':       '#C4521E',
    '--rt-primary-hover': '#A3401A',
    '--rt-primary-tint':  'rgba(196, 82, 30, 0.10)',
    '--rt-surface':       '#FAF7EF',
    '--rt-accent-bar':    'linear-gradient(90deg, #C4521E 0%, #E8835A 100%)',
    '--rt-marker-fill':   '#C4521E',
  },
  Aegean: {
    label: 'Aegean',
    '--rt-primary':       '#4A8C6F',
    '--rt-primary-hover': '#2E7D62',
    '--rt-primary-tint':  'rgba(74, 140, 111, 0.10)',
    '--rt-surface':       '#F2FAF6',
    '--rt-accent-bar':    'linear-gradient(90deg, #4A8C6F 0%, #7EC8A4 100%)',
    '--rt-marker-fill':   '#4A8C6F',
  },
  Mediterranean: {
    label: 'Mediterranean',
    '--rt-primary':       '#C49A1E',
    '--rt-primary-hover': '#A37E18',
    '--rt-primary-tint':  'rgba(196, 154, 30, 0.10)',
    '--rt-surface':       '#FDFBF0',
    '--rt-accent-bar':    'linear-gradient(90deg, #C49A1E 0%, #E8C96A 100%)',
    '--rt-marker-fill':   '#C49A1E',
  },
  'Black Sea': {
    label: 'Black Sea',
    '--rt-primary':       '#2D6A4F',
    '--rt-primary-hover': '#1B4332',
    '--rt-primary-tint':  'rgba(45, 106, 79, 0.10)',
    '--rt-surface':       '#F1F9F5',
    '--rt-accent-bar':    'linear-gradient(90deg, #2D6A4F 0%, #52B788 100%)',
    '--rt-marker-fill':   '#2D6A4F',
  },
  Marmara: {
    label: 'Marmara',
    '--rt-primary':       '#7B5EA7',
    '--rt-primary-hover': '#5E4380',
    '--rt-primary-tint':  'rgba(123, 94, 167, 0.10)',
    '--rt-surface':       '#F8F5FC',
    '--rt-accent-bar':    'linear-gradient(90deg, #7B5EA7 0%, #B39CD0 100%)',
    '--rt-marker-fill':   '#7B5EA7',
  },
  'Southeast Anatolia': {
    label: 'Southeast Anatolia',
    '--rt-primary':       '#9B2335',
    '--rt-primary-hover': '#7A1B28',
    '--rt-primary-tint':  'rgba(155, 35, 53, 0.10)',
    '--rt-surface':       '#FDF5F6',
    '--rt-accent-bar':    'linear-gradient(90deg, #9B2335 0%, #D4637A 100%)',
    '--rt-marker-fill':   '#9B2335',
  },
};

export function getRegionTheme(regionName) {
  return REGION_THEMES[regionName] ?? REGION_THEMES['Anatolia'];
}
