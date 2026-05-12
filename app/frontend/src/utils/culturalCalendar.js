// Returns [month, day] pairs as [MM, DD] (1-indexed)
const CALENDAR_EVENTS = [
  // Each entry: { name, windows: [[startMonth, startDay, endMonth, endDay], ...] }
  // Windows use approximate Gregorian dates; multi-year floating holidays use fixed representative windows
  { name: 'ramadan',        windows: [[3, 1,  3, 30]] },   // approximate; shifts yearly
  { name: 'eid_al_fitr',   windows: [[3, 31, 4, 4]]  },
  { name: 'eid_al_adha',   windows: [[6, 6,  6, 10]] },
  { name: 'lunar_new_year',windows: [[1, 22, 2, 5]]  },
  { name: 'nowruz',        windows: [[3, 20, 3, 26]] },
  { name: 'diwali',        windows: [[10,24,11, 3]]  },
  { name: 'hanukkah',      windows: [[12,14,12,22]] },
  { name: 'christmas',     windows: [[12,24,12,26]] },
  { name: 'easter',        windows: [[3, 29, 4, 2]]  },
];

const LEVEL_THEMES = [
  null,                      // 0 — unused
  'classic_traveler',        // 1
  'vintage_recipe_book',     // 2
  'street_food_explorer',    // 3
  'grandmothers_kitchen',    // 4
  'heritage_archive',        // 5
  'world_kitchen_explorer',  // 6
];

const DEFAULT_THEME = 'classic_traveler';

function isInWindow(month, day, startM, startD, endM, endD) {
  const cur  = month * 100 + day;
  const start = startM * 100 + startD;
  const end   = endM   * 100 + endD;
  return cur >= start && cur <= end;
}

export function resolveTheme(profile, level, date = new Date()) {
  const month = date.getMonth() + 1;
  const day   = date.getDate();

  for (const event of CALENDAR_EVENTS) {
    for (const [sm, sd, em, ed] of event.windows) {
      if (isInWindow(month, day, sm, sd, em, ed)) {
        return event.name;
      }
    }
  }

  if (level && level >= 1 && level < LEVEL_THEMES.length) {
    return LEVEL_THEMES[level] ?? DEFAULT_THEME;
  }

  return DEFAULT_THEME;
}
