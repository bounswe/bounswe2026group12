export const MOCK_EXPLORE_EVENTS = [
  {
    id: 'wedding',
    name: 'Wedding',
    emoji: '💍',
    description: 'Traditional and modern dishes served at weddings across Turkey and the wider region.',
    featured: [
      { type: 'recipe', id: 1, title: 'Düğün Çorbası', author_username: 'chef_ayse', region: 'Anatolia', religion: 'Muslim' },
      { type: 'recipe', id: 2, title: 'Etli Pilav', author_username: 'demo_chef', region: 'Marmara', religion: 'Muslim' },
      { type: 'story', id: 1, title: 'My grandmother\'s wedding feast', author_username: 'demo_chef', region: 'Anatolia', religion: 'Universal' },
      { type: 'recipe', id: 3, title: 'Baklava', author_username: 'chef_ayse', region: 'Southeast Anatolia', religion: 'Muslim' },
      { type: 'recipe', id: 20, title: 'Wedding Kourabiedes', author_username: 'chef_nikos', region: 'Aegean', religion: 'Christian' },
      { type: 'story', id: 10, title: 'A Jewish wedding in Istanbul', author_username: 'chef_rachel', region: 'Marmara', religion: 'Jewish' },
    ],
  },
  {
    id: 'ramadan',
    name: 'Ramadan',
    emoji: '🌙',
    description: 'Iftar and suhoor recipes to share and celebrate the holy month.',
    featured: [
      { type: 'recipe', id: 4, title: 'Iftar Çorbası', author_username: 'chef_musa', region: 'Marmara', religion: 'Muslim' },
      { type: 'story', id: 2, title: 'Breaking fast at the Bosphorus', author_username: 'demo_chef', region: 'Marmara', religion: 'Muslim' },
      { type: 'recipe', id: 5, title: 'Güllaç', author_username: 'demo_chef', region: 'Marmara', religion: 'Muslim' },
      { type: 'recipe', id: 6, title: 'Pide', author_username: 'chef_musa', region: 'Anatolia', religion: 'Muslim' },
    ],
  },
  {
    id: 'new-year',
    name: 'New Year',
    emoji: '🎉',
    description: 'Festive recipes to ring in the new year with family and friends.',
    featured: [
      { type: 'recipe', id: 7, title: 'New Year\'s Roast', author_username: 'demo_chef', region: 'Marmara', religion: 'Secular' },
      { type: 'story', id: 3, title: 'How we celebrate the new year in our village', author_username: 'chef_ayse', region: 'Aegean', religion: 'Universal' },
      { type: 'recipe', id: 8, title: 'Champagne Cake', author_username: 'demo_chef', region: 'Marmara', religion: 'Secular' },
      { type: 'recipe', id: 21, title: 'Vasilopita Bread', author_username: 'chef_nikos', region: 'Aegean', religion: 'Christian' },
    ],
  },
  {
    id: 'eid',
    name: 'Eid',
    emoji: '☪️',
    description: 'Classic sweets, cookies, and festive dishes for Eid al-Fitr and Eid al-Adha.',
    featured: [
      { type: 'recipe', id: 9, title: 'Kurabiye', author_username: 'chef_ayse', region: 'Anatolia', religion: 'Muslim' },
      { type: 'recipe', id: 10, title: 'Kurban Kavurma', author_username: 'chef_musa', region: 'Southeast Anatolia', religion: 'Muslim' },
      { type: 'story', id: 4, title: 'Eid morning in our neighborhood', author_username: 'chef_musa', region: 'Marmara', religion: 'Muslim' },
      { type: 'recipe', id: 11, title: 'Lokma', author_username: 'demo_chef', region: 'Aegean', religion: 'Muslim' },
    ],
  },
  {
    id: 'graduation',
    name: 'Graduation',
    emoji: '🎓',
    description: 'Celebration foods and party recipes for graduations and academic milestones.',
    featured: [
      { type: 'recipe', id: 12, title: 'Celebration Pilaf', author_username: 'demo_chef', region: 'Marmara', religion: 'Universal' },
      { type: 'story', id: 5, title: 'The dinner my family made for my graduation', author_username: 'chef_ayse', region: 'Aegean', religion: 'Universal' },
      { type: 'recipe', id: 22, title: 'Graduation Börek', author_username: 'chef_musa', region: 'Black Sea', religion: 'Muslim' },
    ],
  },
  {
    id: 'baby-shower',
    name: 'Baby Shower',
    emoji: '👶',
    description: 'Sweet treats and sharing dishes for welcoming a new life.',
    featured: [
      { type: 'recipe', id: 13, title: 'Lohusa Şerbeti', author_username: 'chef_ayse', region: 'Anatolia', religion: 'Muslim' },
      { type: 'recipe', id: 14, title: 'Hediye Helvası', author_username: 'demo_chef', region: 'Anatolia', religion: 'Muslim' },
      { type: 'story', id: 6, title: 'Sweet traditions for a new baby', author_username: 'demo_chef', region: 'Anatolia', religion: 'Universal' },
    ],
  },
];

export function getMockEventById(id) {
  return MOCK_EXPLORE_EVENTS.find((e) => e.id === id) ?? null;
}
