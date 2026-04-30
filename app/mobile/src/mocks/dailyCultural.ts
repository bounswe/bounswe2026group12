export type DailyCulturalKind = 'tradition' | 'dish' | 'story' | 'fact' | 'holiday';

export type DailyCulturalLink =
  | { kind: 'story'; id: string | number }
  | { kind: 'recipe'; id: string | number };

export type DailyCulturalCard = {
  id: string;
  kind: DailyCulturalKind;
  title: string;
  body: string;
  region?: string;
  link?: DailyCulturalLink;
};

export const MOCK_DAILY_CULTURAL: DailyCulturalCard[] = [
  {
    id: 'dc-tradition-1',
    kind: 'tradition',
    title: 'Sunday Börek Mornings',
    body: 'In Aegean homes, Sunday breakfast often starts with the smell of phyllo baking before sunrise. Grandmothers roll dough by hand, layer by layer, while the rest of the family wakes to the scent.',
    region: 'Aegean',
    link: { kind: 'story', id: 2 },
  },
  {
    id: 'dc-dish-1',
    kind: 'dish',
    title: 'Dish of the Day: Mansaf',
    body: 'A Levantine festive dish — lamb slow-cooked in fermented yogurt sauce, served over saffron rice. Eaten standing, with the right hand, around a single shared platter.',
    region: 'Levantine',
    link: { kind: 'recipe', id: 12 },
  },
  {
    id: 'dc-fact-1',
    kind: 'fact',
    title: 'Why Lentil Soup is Healing',
    body: 'Across Anatolia and the Middle East, lentil soup is the first food offered to a guest with a cold or to a recovering relative. The tradition predates modern medicine by centuries.',
    region: 'Anatolian',
    link: { kind: 'recipe', id: 2 },
  },
  {
    id: 'dc-tradition-2',
    kind: 'tradition',
    title: 'The Coffee Reading',
    body: 'After Turkish coffee, the cup is flipped onto its saucer and the grounds are read. It is half ritual, half conversation starter — and almost never taken too seriously.',
    region: 'Marmara',
  },
  {
    id: 'dc-holiday-1',
    kind: 'holiday',
    title: 'Aşure Day',
    body: 'A pudding made of forty ingredients — wheat, beans, dried fruits, nuts — shared with neighbors on the 10th of Muharram. Tradition says one bowl should never be eaten alone.',
    region: 'Anatolian',
  },
];
