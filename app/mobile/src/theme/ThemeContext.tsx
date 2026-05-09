import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { accentForRegion, DEFAULT_REGION_ACCENT, type RegionAccent } from './regionThemes';

type ThemeContextValue = {
  /** Currently focused region name, or null when no region is in focus. */
  focusedRegion: string | null;
  /** Accent palette derived from the focused region. */
  accent: RegionAccent;
  /** Set or clear the focused region. */
  setFocusedRegion: (region: string | null) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  focusedRegion: null,
  accent: DEFAULT_REGION_ACCENT,
  setFocusedRegion: () => undefined,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [focusedRegion, setRegion] = useState<string | null>(null);

  const setFocusedRegion = useCallback((region: string | null) => {
    setRegion(region);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      focusedRegion,
      accent: accentForRegion(focusedRegion),
      setFocusedRegion,
    }),
    [focusedRegion, setFocusedRegion],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
