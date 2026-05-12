jest.mock('../../src/services/httpClient', () => ({
  apiGetJson: jest.fn(),
}));

import { parseEventDate, MONTH_LABELS } from '../../src/services/calendarService';

describe('parseEventDate', () => {
  it('parses a fixed:MM-DD rule into a Gregorian label', () => {
    const parsed = parseEventDate('fixed:03-21');
    expect(parsed.monthIndex).toBe(2);
    expect(parsed.day).toBe(21);
    expect(parsed.label).toBe('March 21');
    expect(parsed.isLunar).toBe(false);
  });

  it('clamps an out-of-range fixed month to a valid index', () => {
    const parsed = parseEventDate('fixed:13-05');
    expect(parsed.monthIndex).toBe(11);
    expect(parsed.day).toBe(5);
    expect(parsed.label).toBe('December 5');
  });

  it('returns a passthrough label when the fixed parts are not numeric', () => {
    const parsed = parseEventDate('fixed:bad-date');
    expect(parsed.monthIndex).toBeNull();
    expect(parsed.day).toBeNull();
    expect(parsed.label).toBe('fixed:bad-date');
    expect(parsed.isLunar).toBe(false);
  });

  it('resolves a known lunar rule for the current year (Ramadan 2026)', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-15T00:00:00Z'));
    try {
      const parsed = parseEventDate('lunar:ramadan');
      expect(parsed.isLunar).toBe(true);
      expect(parsed.monthIndex).toBe(1);
      expect(parsed.day).toBe(18);
      expect(parsed.label).toBe('February 18');
      expect(parsed.lunarName).toBe('Ramadan');
    } finally {
      jest.useRealTimers();
    }
  });

  it('returns lunarUnresolved when the year has no entry', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('1999-01-01T00:00:00Z'));
    try {
      const parsed = parseEventDate('lunar:ramadan');
      expect(parsed.isLunar).toBe(true);
      expect(parsed.lunarUnresolved).toBe(true);
      expect(parsed.monthIndex).toBeNull();
      expect(parsed.label).toContain('Lunar');
      expect(parsed.lunarName).toBe('Ramadan');
    } finally {
      jest.useRealTimers();
    }
  });

  it('prettifies multi-word lunar keys', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    try {
      const parsed = parseEventDate('lunar:eid-fitr');
      expect(parsed.lunarName).toBe('Eid Fitr');
      expect(parsed.monthIndex).toBe(2);
      expect(parsed.day).toBe(20);
    } finally {
      jest.useRealTimers();
    }
  });

  it('returns the trimmed rule for unrecognised prefixes', () => {
    const parsed = parseEventDate('something-else');
    expect(parsed.monthIndex).toBeNull();
    expect(parsed.day).toBeNull();
    expect(parsed.label).toBe('something-else');
  });

  it('exports 12 month labels in order', () => {
    expect(MONTH_LABELS).toHaveLength(12);
    expect(MONTH_LABELS[0]).toBe('January');
    expect(MONTH_LABELS[11]).toBe('December');
  });
});
