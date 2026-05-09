const labels: Record<string, string> = {
  regional_match: 'From your region',
  dietary_match: 'Matches your dietary preference',
  event_match: 'For your events',
  cultural_match: 'Matches your interests',
};

export function rankReasonLabel(reason: string | null | undefined): string | null {
  if (!reason) return null;
  return labels[reason] ?? null;
}
