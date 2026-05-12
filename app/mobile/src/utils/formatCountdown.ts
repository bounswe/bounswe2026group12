/**
 * Render the remaining time until an ISO timestamp as a short, mobile-friendly
 * label. The granularity intentionally drops to whichever unit is most
 * informative:
 *   - More than a day left → "Xd Yh"
 *   - Between 1h and 24h    → "Xh Ym"
 *   - Under an hour         → "Xm" (rounded up so "59s left" still reads "1m")
 *   - Past / invalid date   → "Event ended"
 *
 * Pure function with an injectable `now` so the component can tick once per
 * minute via `Date.now()` without touching wall clock state in tests.
 */
export function formatCountdown(endIso: string | null | undefined, now: number = Date.now()): string {
  if (!endIso) return 'Event ended';
  const end = Date.parse(endIso);
  if (!Number.isFinite(end)) return 'Event ended';
  const diffMs = end - now;
  if (diffMs <= 0) return 'Event ended';

  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes - days * 60 * 24) / 60);
  const minutes = totalMinutes - days * 60 * 24 - hours * 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  // Round any sub-minute remainder up to 1m so a freshly-loaded view never
  // shows the disconcerting "0m" right before flipping to "Event ended".
  if (totalMinutes <= 0) return '1m';
  return `${totalMinutes}m`;
}
