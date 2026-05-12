export function locatableMembers(members) {
  if (!Array.isArray(members)) return [];
  return members.filter(
    (m) => typeof m?.latitude === 'number' && typeof m?.longitude === 'number',
  );
}

export function groupByRegion(members) {
  const located = locatableMembers(members);
  const map = new Map();
  for (const m of located) {
    const key = m.region ?? '';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(m);
  }
  return Array.from(map.entries()).map(([region, ms]) => {
    const lat = ms.reduce((s, m) => s + m.latitude, 0) / ms.length;
    const lng = ms.reduce((s, m) => s + m.longitude, 0) / ms.length;
    return { region, coords: [lat, lng], members: ms };
  });
}

export function topRegion(regionGroups) {
  if (regionGroups.length === 0) return null;
  return regionGroups.reduce((best, rg) => {
    const count = rg.members.filter((m) => m.content_type === 'recipe').length;
    const bestCount = best.members.filter((m) => m.content_type === 'recipe').length;
    return count > bestCount ? rg : best;
  }, regionGroups[0]);
}
