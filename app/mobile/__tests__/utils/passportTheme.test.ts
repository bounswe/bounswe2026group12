import {
  PASSPORT_THEMES,
  resolveTheme,
  themeForLevel,
} from '../../src/utils/passportTheme';

describe('resolveTheme', () => {
  it('resolves an exact catalogue name', () => {
    const theme = resolveTheme({ name: 'Mediterranean Journal' }, 1);
    expect(theme.name).toBe('Mediterranean Journal');
    expect(theme.copy).toBe('MEDITERRANEAN JOURNAL');
  });

  it('resolves a backend slug string ("classic_traveler")', () => {
    const theme = resolveTheme('classic_traveler', 1);
    expect(theme.name).toBe('Classic Traveler');
  });

  it('resolves alias slugs to their canonical theme', () => {
    expect(resolveTheme('aegean_voyager', 1).name).toBe('Mediterranean Journal');
    expect(resolveTheme('ramadan', 1).name).toBe('Ramazan');
  });

  it('resolves calendar-based themes by name', () => {
    expect(resolveTheme({ name: 'Eid Festival' }).name).toBe('Eid Festival');
    expect(resolveTheme({ name: 'Lunar New Year' }).name).toBe('Lunar New Year');
    expect(resolveTheme({ name: 'Harvest Moon' }).name).toBe('Harvest Moon');
  });

  it('falls back to a level-based theme when name is unknown', () => {
    expect(resolveTheme({ name: 'Nonexistent' }, 1).name).toBe('Classic Traveler');
    expect(resolveTheme({ name: 'Nonexistent' }, 4).name).toBe('Vintage Recipe Book');
    expect(resolveTheme({ name: 'Nonexistent' }, 7).name).toBe('Mediterranean Journal');
    expect(resolveTheme({ name: 'Nonexistent' }, 10).name).toBe('Heritage Archive');
  });

  it('falls back when active is null/undefined/empty', () => {
    expect(resolveTheme(null, 1).name).toBe('Classic Traveler');
    expect(resolveTheme(undefined, 5).name).toBe('Vintage Recipe Book');
    expect(resolveTheme({ name: '' }, 6).name).toBe('Mediterranean Journal');
  });

  it('defaults to Classic Traveler when level is missing', () => {
    expect(resolveTheme(null).name).toBe('Classic Traveler');
  });
});

describe('themeForLevel', () => {
  it('maps levels into the right bucket', () => {
    expect(themeForLevel(1).name).toBe('Classic Traveler');
    expect(themeForLevel(2).name).toBe('Classic Traveler');
    expect(themeForLevel(3).name).toBe('Vintage Recipe Book');
    expect(themeForLevel(5).name).toBe('Vintage Recipe Book');
    expect(themeForLevel(6).name).toBe('Mediterranean Journal');
    expect(themeForLevel(8).name).toBe('Mediterranean Journal');
    expect(themeForLevel(9).name).toBe('Heritage Archive');
  });

  it('treats invalid levels as level 1', () => {
    expect(themeForLevel(undefined).name).toBe('Classic Traveler');
    expect(themeForLevel(0).name).toBe('Classic Traveler');
    expect(themeForLevel(-3).name).toBe('Classic Traveler');
  });
});

describe('PASSPORT_THEMES catalogue', () => {
  it('exposes all 11 themes from the spec', () => {
    expect(Object.keys(PASSPORT_THEMES)).toHaveLength(11);
  });

  it('each theme has the required visual fields', () => {
    Object.values(PASSPORT_THEMES).forEach((t) => {
      expect(t.background).toBeTruthy();
      expect(t.accent).toBeTruthy();
      expect(t.textOnCover).toBeTruthy();
      expect(t.glyph).toBeTruthy();
      expect(t.copy).toBeTruthy();
    });
  });
});
