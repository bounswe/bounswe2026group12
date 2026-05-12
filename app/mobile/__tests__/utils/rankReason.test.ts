import { rankReasonLabel } from '../../src/utils/rankReason';

describe('rankReasonLabel', () => {
  it('maps known reason codes to user-facing labels', () => {
    expect(rankReasonLabel('regional_match')).toBe('From your region');
    expect(rankReasonLabel('dietary_match')).toBe('Matches your dietary preference');
    expect(rankReasonLabel('event_match')).toBe('For your events');
    expect(rankReasonLabel('cultural_match')).toBe('Matches your interests');
  });

  it('returns null for unknown codes', () => {
    expect(rankReasonLabel('made_up_reason')).toBeNull();
  });

  it('returns null for null, undefined, and empty string', () => {
    expect(rankReasonLabel(null)).toBeNull();
    expect(rankReasonLabel(undefined)).toBeNull();
    expect(rankReasonLabel('')).toBeNull();
  });
});
