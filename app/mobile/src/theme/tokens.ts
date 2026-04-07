export const tokens = {
  colors: {
    bg: '#C4521E',
    surface: '#FAF7EF',
    surfaceDark: '#3D1500',
    surfaceInput: '#FFFCF6',
    text: '#2C1008',
    textMuted: '#7A5C52',
    textOnDark: '#FAF7EF',
    primary: '#C4521E',
    primaryHover: '#A3401A',
    accentGreen: '#4A8C6F',
    accentMustard: '#D4A830',
    border: '#E8DDD0',
    error: '#DC2626',
    success: '#16A34A',
    primaryTint: 'rgba(196, 82, 30, 0.10)',
    primarySubtle: 'rgba(196, 82, 30, 0.06)',
    primaryBorder: 'rgba(196, 82, 30, 0.20)',
    accentGreenTint: 'rgba(74, 140, 111, 0.10)',
    accentGreenBorder: 'rgba(74, 140, 111, 0.30)',
    backdrop: 'rgba(44, 16, 8, 0.45)',
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 20,
    xl: 28,
    pill: 999,
  },
  typography: {
    // Avoid custom font dependencies; approximate the web look using system fonts.
    display: { fontFamily: 'Georgia' as const, fontWeight: '700' as const },
    body: { fontFamily: 'System' as const },
  },
} as const;

