export type MockStory = {
  id: string;
  title: string;
  summary?: string;
  body: string;
  language?: 'en' | 'tr';
  author?: { username: string };
  author_username?: string;
  region_name?: string | null;
  linked_recipe?: { id: string; title: string; region?: string } | null;
  linked_recipes?: { recipe_id: number; recipe_title: string; order: number }[];
  image?: string | null;
  is_published?: boolean;
  created_at?: string;
};

const STORIES: Record<string, MockStory> = {
  '1': {
    id: '1',
    title: 'Rolling Sarma by the Black Sea',
    summary: "A grandmother's autumn ritual of rolling sarma with collard greens and butter.",
    body: "Every autumn in Trabzon, when the first Black Sea winds begin to cool the hillsides, you know the season of sarma has arrived. The collard greens are at their best in October — large enough to wrap generously, tender enough to yield to the tooth. This is when my grandmother would call the family to the kitchen.\n\nShe moved through the preparation with the unhurried confidence of someone who had done this hundreds of times. The leaves were blanched briefly, shocked in ice water, then trimmed of thick stems. The filling was ground beef, raw rice, grated onion, salt, and black pepper — kneaded together until it held.\n\nWe rolled for nearly an hour, talking about everything and nothing. Into the pot they went, seam-side down, topped with golden Black Sea butter. Forty-five minutes of gentle simmering filled the house with a smell I have never replicated anywhere else.",
    language: 'en',
    author: { username: 'ayse' },
    author_username: 'ayse',
    region_name: 'Black Sea',
    linked_recipe: { id: '1', title: 'Black Sea Collard Green Sarma', region: 'Black Sea' },
    linked_recipes: [{ recipe_id: 1, recipe_title: 'Black Sea Collard Green Sarma', order: 0 }],
    image: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?auto=format&fit=crop&w=1200&q=80',
    is_published: true,
    created_at: '2024-11-01T08:00:00Z',
  },
  '2': {
    id: '2',
    title: 'Summer Sarma in the Aegean',
    summary: 'The lighter, olive-oil version of sarma that marks the beginning of summer.',
    body: "In the Aegean, sarma takes a completely different form. No meat, no butter — just tender grape leaves wrapped around a filling of rice, pine nuts, and fresh herbs, bound together with good olive oil. We make them in late spring when the leaves are young and pale.\n\nThe rolling is precise. Each leaf gets one teaspoon of filling because the rice will double in volume. Seam-side down into the pot, packed close, the remaining olive oil drizzled over everything. Low heat, forty minutes, then the most important step: letting them cool in the pot before serving.\n\nMy mother always squeezed a whole lemon over the pot before serving. It was how she marked the start of summer.",
    language: 'en',
    author: { username: 'elif' },
    author_username: 'elif',
    region_name: 'Aegean',
    linked_recipe: { id: '2', title: 'Aegean Olive Oil Stuffed Grape Leaves', region: 'Aegean' },
    linked_recipes: [{ recipe_id: 2, recipe_title: 'Aegean Olive Oil Stuffed Grape Leaves', order: 0 }],
    image: null,
    is_published: true,
    created_at: '2024-05-15T09:00:00Z',
  },
  '3': {
    id: '3',
    title: 'My Grandmother\'s Manti',
    summary: 'The painstaking art of making tiny Anatolian dumplings by hand.',
    body: "There is a saying in Kayseri that a bride's worth is measured by the size of her manti. The smaller the dumplings, the more skillful the cook. My grandmother treated this as a daily expectation.\n\nShe began with the dough: flour, an egg, salt, water. Ten minutes of kneading, then rest. The filling was ground beef, grated onion, salt, pepper. Each two-centimeter square of rolled dough received a speck of filling and one decisive pinch to close it.\n\nServed under cold garlicky yogurt with red-pepper butter drizzled over the top, the contrast of temperatures was unlike anything I have eaten since. No restaurant version has matched what she made in her small Kayseri kitchen.",
    language: 'en',
    author: { username: 'ayse' },
    author_username: 'ayse',
    region_name: 'Anatolian',
    linked_recipe: { id: '12', title: 'Anatolian Manti Dumplings', region: 'Anatolian' },
    linked_recipes: [{ recipe_id: 12, recipe_title: 'Anatolian Manti Dumplings', order: 0 }],
    image: null,
    is_published: true,
    created_at: '2024-10-03T11:00:00Z',
  },
  '4': {
    id: '4',
    title: 'Miso: A Living Ingredient',
    summary: 'Understanding miso as a fermented, living paste central to Japanese home cooking.',
    body: "When I was a child, I thought miso was simply salty brown paste. My grandmother, who had been making her own miso for forty years, explained what I was actually eating. Miso is alive — the koji mold works over months or years inside the crock, breaking down proteins and starches into hundreds of complex flavor compounds.\n\nShe showed me her crock. Under a weighted lid, the paste was dark and dense and smelled intensely of earth and sea at once. The rules around miso soup, she told me, are not arbitrary. You must never boil it. Boiling kills the bacterial cultures. The miso is dissolved separately in a ladle, at the very end, off the heat.\n\nI now make miso soup every morning, following her rules precisely. Every morning I taste what patience and respect for a living ingredient actually mean.",
    language: 'en',
    author: { username: 'yuki' },
    author_username: 'yuki',
    region_name: 'Japanese',
    linked_recipe: { id: '20', title: 'Japanese Miso Soup', region: 'Japanese' },
    linked_recipes: [{ recipe_id: 20, recipe_title: 'Japanese Miso Soup', order: 0 }],
    image: null,
    is_published: true,
    created_at: '2024-09-20T07:00:00Z',
  },
};

export function getMockStoryById(id: string): MockStory | null {
  return STORIES[id] ?? null;
}

export function listMockStories(): MockStory[] {
  return Object.values(STORIES);
}

export function mockCreateStory(input: {
  title: string;
  body: string;
  language: 'en' | 'tr';
  linked_recipe: MockStory['linked_recipe'] | null;
  image?: string | null;
  author?: MockStory['author'];
}): MockStory {
  const id = String(Date.now());
  const story: MockStory = {
    id,
    title: input.title,
    body: input.body,
    language: input.language,
    author: input.author,
    author_username: input.author?.username,
    linked_recipe: input.linked_recipe ?? null,
    linked_recipes: [],
    region_name: null,
    image: input.image ?? null,
    is_published: true,
    created_at: new Date().toISOString(),
  };
  STORIES[id] = story;
  return story;
}
