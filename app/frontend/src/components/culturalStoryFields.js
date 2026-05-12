/**
 * Shared schema for the seven "Beyond the Recipe" narrative notes (#516).
 *
 * Field keys mirror `apps.recipes.serializers.CulturalContextSerializer`
 * (`identity_note`, `memory_note`, `migration_note`, `ritual_note`,
 * `commensality_note`, `terroir_note`, `craft_note`). Label / hint /
 * placeholder are the only user-facing strings; rename here to update both
 * the recipe-detail read view and the create/edit form in one place.
 */
export const CULTURAL_STORY_FIELDS = [
  {
    key: 'identity_note',
    label: 'Why this dish matters',
    hint: 'What this recipe means to you or your community.',
    placeholder: "e.g. This dish is how I know I'm from Trabzon.",
  },
  {
    key: 'memory_note',
    label: 'A personal memory',
    hint: 'A moment, a person, a place this dish brings back.',
    placeholder: 'e.g. My grandmother stirred this every Sunday morning.',
  },
  {
    key: 'migration_note',
    label: 'Where it came from',
    hint: 'How the dish travelled — across families, regions, or continents.',
    placeholder: 'e.g. Originally a Caucasus recipe, brought to the Aegean in the 1920s.',
  },
  {
    key: 'ritual_note',
    label: "When it's made",
    hint: 'The occasions, seasons, or rituals tied to this dish.',
    placeholder: 'e.g. Only cooked on the first Friday of Ramadan.',
  },
  {
    key: 'commensality_note',
    label: "How it's shared",
    hint: 'The serving rituals, who eats it together, the order it appears.',
    placeholder: 'e.g. Always served at the centre of the table, family-style.',
  },
  {
    key: 'terroir_note',
    label: 'Taste of place',
    hint: 'The land, water, climate, ingredients that make it taste right.',
    placeholder: 'e.g. The corn flour has to come from the Black Sea hills.',
  },
  {
    key: 'craft_note',
    label: 'The craft',
    hint: 'The techniques, tools, or knowledge passed down with this recipe.',
    placeholder: 'e.g. The dough must be slapped — never rolled — by hand.',
  },
];

/** Convert a full cultural-context object (any/none of the 7 keys filled) into
 *  an object that only contains the fields that have a non-blank trimmed
 *  value. Used at submit time so we never send a payload of empty strings
 *  that would create an empty `RecipeCulturalContext` row server-side. */
export function trimCulturalStoryForPayload(values) {
  const out = {};
  for (const { key } of CULTURAL_STORY_FIELDS) {
    const v = typeof values?.[key] === 'string' ? values[key].trim() : '';
    if (v) out[key] = v;
  }
  return out;
}

/** True if at least one of the seven fields is non-blank. Drives whether the
 *  read-only section renders at all. */
export function hasAnyCulturalStory(values) {
  if (!values || typeof values !== 'object') return false;
  return CULTURAL_STORY_FIELDS.some((f) => {
    const v = values[f.key];
    return typeof v === 'string' && v.trim().length > 0;
  });
}
