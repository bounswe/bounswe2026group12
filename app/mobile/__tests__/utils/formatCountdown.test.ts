import { formatCountdown } from '../../src/utils/formatCountdown';

describe('formatCountdown', () => {
  const NOW = Date.parse('2026-05-12T12:00:00Z');

  it('returns "Xd Yh" when more than a day remains', () => {
    const end = new Date(NOW + (2 * 24 * 60 + 3 * 60) * 60_000).toISOString();
    expect(formatCountdown(end, NOW)).toBe('2d 3h');
  });

  it('returns "Xh Ym" when between one and twenty-four hours remain', () => {
    const end = new Date(NOW + (5 * 60 + 12) * 60_000).toISOString();
    expect(formatCountdown(end, NOW)).toBe('5h 12m');
  });

  it('returns "Xm" when under one hour remains', () => {
    const end = new Date(NOW + 17 * 60_000).toISOString();
    expect(formatCountdown(end, NOW)).toBe('17m');
  });

  it('rounds a sub-minute remainder up to "1m"', () => {
    const end = new Date(NOW + 30_000).toISOString();
    expect(formatCountdown(end, NOW)).toBe('1m');
  });

  it('returns "Event ended" when the end has passed', () => {
    const end = new Date(NOW - 60_000).toISOString();
    expect(formatCountdown(end, NOW)).toBe('Event ended');
  });

  it('returns "Event ended" exactly at the boundary', () => {
    const end = new Date(NOW).toISOString();
    expect(formatCountdown(end, NOW)).toBe('Event ended');
  });

  it('returns "Event ended" for null, empty, or invalid input', () => {
    expect(formatCountdown(null, NOW)).toBe('Event ended');
    expect(formatCountdown(undefined, NOW)).toBe('Event ended');
    expect(formatCountdown('', NOW)).toBe('Event ended');
    expect(formatCountdown('not-a-date', NOW)).toBe('Event ended');
  });
});
