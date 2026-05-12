export function locatableMembers(members) {
  if (!Array.isArray(members)) return [];
  return members.filter(
    (m) => typeof m?.latitude === 'number' && typeof m?.longitude === 'number',
  );
}

export function computeHeritageMidpoint(members) {
  const located = locatableMembers(members);
  if (located.length === 0) return null;
  const sumLat = located.reduce((acc, m) => acc + m.latitude, 0);
  const sumLng = located.reduce((acc, m) => acc + m.longitude, 0);
  return [sumLat / located.length, sumLng / located.length];
}
