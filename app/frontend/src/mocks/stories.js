export const MOCK_STORIES = {
  1: {
    id: 1,
    title: 'Rolling Sarma by the Black Sea',
    summary: "A grandmother's autumn ritual of rolling sarma with collard greens and butter.",
    body: "Every autumn in Trabzon, when the first Black Sea winds begin to cool the hillsides, you know the season of sarma has arrived. The collard greens have been growing fat and dark throughout the summer, and in October they are at their best — large enough to wrap generously, tender enough to yield to the tooth. This is when my grandmother would call the family to the kitchen.\n\nShe moved through the preparation with the unhurried confidence of someone who had done this hundreds of times. The leaves were blanched briefly in salted water, shocked in ice water to keep their color, then trimmed of the thick central stems. The filling was ground beef, raw rice, grated onion, salt, and black pepper — kneaded together with her hands until it held together.\n\nWe rolled for nearly an hour, talking about everything and nothing. Into the pot they went, seam-side down, topped with golden Black Sea butter and enough hot water to cover. Forty-five minutes of gentle simmering filled the house with a smell that I have never been able to replicate in any other kitchen.",
    author: { id: 1, username: 'ayse' },
    author_username: 'ayse',
    linked_recipe: 1,
    recipe_title: 'Black Sea Collard Green Sarma',
    linked_recipes: [{ recipe_id: 1, recipe_title: 'Black Sea Collard Green Sarma', order: 0 }],
    region: 1,
    region_name: 'Black Sea',
    language: 'en',
    is_published: true,
    created_at: '2024-11-01T08:00:00Z',
  },
  2: {
    id: 2,
    title: 'Summer Sarma in the Aegean',
    summary: 'The lighter, olive-oil version of sarma that marks the beginning of summer.',
    body: "In the Aegean, sarma takes a completely different form. No meat, no butter — just tender grape leaves wrapped around a filling of rice, pine nuts, and fresh herbs, all bound together with good olive oil. We make them in late spring when the grape leaves are young and pale green, before the summer heat turns them tough.\n\nThe rolling is precise: each leaf gets one teaspoon of filling because the rice will double in volume. Seam-side down into the pot, packed close, the remaining olive oil drizzled over everything, the juice of two lemons poured over the top. Low heat, forty minutes, then the most important step — letting them cool in the pot. They are not ready when they are hot. They are ready when they have had time to absorb everything, to settle into themselves.\n\nMy mother always squeezed a whole lemon over the pot before serving. It was how she marked the start of summer.",
    author: { id: 3, username: 'elif' },
    author_username: 'elif',
    linked_recipe: 2,
    recipe_title: 'Aegean Olive Oil Stuffed Grape Leaves',
    linked_recipes: [{ recipe_id: 2, recipe_title: 'Aegean Olive Oil Stuffed Grape Leaves', order: 0 }],
    region: 2,
    region_name: 'Aegean',
    language: 'en',
    is_published: true,
    created_at: '2024-05-15T09:00:00Z',
  },
  3: {
    id: 3,
    title: 'From Anatolia to Athens: The Dolma Trail',
    summary: 'Tracing how stuffed grape leaves traveled from Anatolian kitchens to Greek tavernas.',
    body: "Every Greek grandmother will tell you with absolute certainty that dolmadakia is a Greek dish. I grew up believing the same thing. It was not until I was twenty-three, traveling outside Greece for the first time, that I started to notice something.\n\nIn Istanbul I watched an elderly woman selling dolma that looked identical to what my grandmother made. In Lebanon the stuffed grape leaves at a family lunch were so close to home that I had to remind myself I was a stranger. I began reading food history, and what I found was humbling: the Ottoman culinary tradition spread the technique of stuffed vegetables across an enormous geography. The word dolma itself is Turkish.\n\nI still make dolmadakia the way my grandmother taught me. But I no longer think the pride requires exclusivity. When I traveled to Izmir a second time and made dolma alongside a Turkish cook, we compared our ratios of rice to herb and argued gently about lemon. We did not share a language, but we shared something older than language.",
    author: { id: 7, username: 'dimitris' },
    author_username: 'dimitris',
    linked_recipe: 4,
    recipe_title: 'Greek Dolmadakia',
    linked_recipes: [{ recipe_id: 4, recipe_title: 'Greek Dolmadakia', order: 0 }],
    region: 5,
    region_name: 'Balkan',
    language: 'en',
    is_published: true,
    created_at: '2024-08-10T14:00:00Z',
  },
  4: {
    id: 4,
    title: 'My Grandmother\'s Manti',
    summary: 'The painstaking art of making tiny Anatolian dumplings by hand.',
    body: "There is a saying in Kayseri that a bride's worth is measured by the size of her manti. The smaller the dumplings, the more skillful the cook. The ideal is small enough that forty fit on a single spoon — a benchmark my grandmother treated as a daily expectation.\n\nShe began with the dough: flour, an egg, salt, water. She kneaded for ten minutes, timed by the radio, then rested it in a cloth. The filling was simpler than the shells deserved: ground beef, grated onion, salt, black pepper. She seasoned it by touching a tiny pinch to her tongue.\n\nThe rolling was performance. She pushed the dough always thinner until nearly translucent, then cut it into two-centimeter squares with a wheel cutter she had used since before my mother was born. Into each square went a speck of filling the size of a large pea. Each one pinched closed with a single decisive movement.\n\nServed drowning in garlicky yogurt with red-pepper butter drizzled over the top, the contrast of temperatures and textures was unlike anything I have eaten since. No restaurant version has ever matched what she made in her small kitchen in Kayseri.",
    author: { id: 1, username: 'ayse' },
    author_username: 'ayse',
    linked_recipe: 12,
    recipe_title: 'Anatolian Manti Dumplings',
    linked_recipes: [{ recipe_id: 12, recipe_title: 'Anatolian Manti Dumplings', order: 0 }],
    region: 6,
    region_name: 'Anatolian',
    language: 'en',
    is_published: true,
    created_at: '2024-10-03T11:00:00Z',
  },
};

export const MOCK_STORIES_LIST = Object.values(MOCK_STORIES);

export function getMockStoryById(id) {
  return MOCK_STORIES[id] ?? null;
}

export function mockCreateStory(payload) {
  return {
    id: Date.now(),
    ...payload,
    is_published: true,
    author: payload.author ?? { id: 1, username: 'demo_user' },
    author_username: payload.author?.username ?? 'demo_user',
    linked_recipe: payload.linked_recipe_id ?? null,
    linked_recipes: [],
    region_name: null,
    created_at: new Date().toISOString(),
  };
}
