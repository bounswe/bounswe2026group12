import { apiClient } from './api';

const USE_MOCK = process.env.REACT_APP_USE_MOCK === 'true';

// Lunar event dates resolved to Gregorian, keyed by year then event name.
// Keep in sync with mobile calendarService.ts — update both together each year.
export const LUNAR_YEARLY = {
  2024: { ramadan: { month: 2, day: 10 }, 'eid-fitr': { month: 3, day: 10 }, 'eid-adha': { month: 5, day: 16 }, mevlid: { month: 9, day: 15 }, ashura: { month: 7, day: 17 } },
  2025: { ramadan: { month: 2, day: 28 }, 'eid-fitr': { month: 3, day: 30 }, 'eid-adha': { month: 5, day: 6 }, mevlid: { month: 9, day: 4 }, ashura: { month: 7, day: 5 } },
  2026: { ramadan: { month: 2, day: 17 }, 'eid-fitr': { month: 3, day: 19 }, 'eid-adha': { month: 4, day: 26 }, mevlid: { month: 8, day: 24 }, ashura: { month: 6, day: 24 } },
};


// Extracts month index (0-based) and day from a date_rule string.
// date_rule formats: "YYYY-MM-DD", "MM-DD", "lunar:ramadan", etc.
export function parseEventDate(rule) {
  if (!rule) return null;

  if (rule.startsWith('lunar:')) {
    const lunarName = rule.replace('lunar:', '');
    const year = new Date().getFullYear();
    const yearTable = LUNAR_YEARLY[year];
    if (yearTable && yearTable[lunarName]) {
      const { month, day } = yearTable[lunarName];
      return { monthIndex: month - 1, day, isLunar: true, lunarName, lunarUnresolved: false };
    }
    return { monthIndex: null, day: null, isLunar: true, lunarName, lunarUnresolved: true };
  }

  // "YYYY-MM-DD" or "MM-DD"
  const parts = rule.split('-');
  if (parts.length === 3) {
    return { monthIndex: parseInt(parts[1], 10) - 1, day: parseInt(parts[2], 10), isLunar: false };
  }
  if (parts.length === 2) {
    return { monthIndex: parseInt(parts[0], 10) - 1, day: parseInt(parts[1], 10), isLunar: false };
  }
  return null;
}

const MOCK_EVENTS = [
  { id: 1, name: 'Ramadan', date_rule: 'lunar:ramadan', region: { id: 1, name: 'All Regions' }, description: 'Month of fasting and special foods.', recipes: [{ id: 1, title: 'Iftar Soup' }], created_at: '' },
  { id: 2, name: 'Hıdırellez', date_rule: '05-06', region: { id: 2, name: 'Aegean' }, description: 'Spring festival marking the start of summer.', recipes: [], created_at: '' },
  { id: 3, name: 'Eid al-Adha', date_rule: 'lunar:eid-adha', region: { id: 1, name: 'All Regions' }, description: 'Feast of sacrifice — special meats and sweets.', recipes: [{ id: 2, title: 'Kavurma' }], created_at: '' },
];

export async function fetchCulturalEvents({ region } = {}) {
  if (USE_MOCK) return MOCK_EVENTS;
  const params = region ? `?region=${region}` : '';
  const res = await apiClient.get(`/api/cultural-events/${params}`);
  return Array.isArray(res.data) ? res.data : (res.data.results ?? []);
}
