export const MOCK_THREADS = [
  {
    id: 1,
    otherUser: { id: 2, username: 'chef_maria' },
    recipe: { id: 1, title: 'Turkish Baklava' },
    lastMessage: {
      body: 'Thanks for the kind words! Let me know how it turns out.',
      createdAt: '2026-04-28T10:00:00Z',
      senderId: 2,
    },
    unreadCount: 1,
  },
  {
    id: 2,
    otherUser: { id: 3, username: 'spice_master' },
    recipe: { id: 2, title: 'Lamb Tagine' },
    lastMessage: {
      body: 'You can substitute ras el hanout with garam masala in a pinch.',
      createdAt: '2026-04-26T15:30:00Z',
      senderId: 3,
    },
    unreadCount: 0,
  },
];

export const MOCK_MESSAGES = {
  1: [
    {
      id: 1,
      threadId: 1,
      sender: { id: 1, username: 'daglar' },
      body: 'Hi! I loved your baklava recipe — the walnut-to-pistachio ratio is perfect. Any tips on getting the syrup to soak evenly?',
      createdAt: '2026-04-27T09:00:00Z',
    },
    {
      id: 2,
      threadId: 1,
      sender: { id: 2, username: 'chef_maria' },
      body: 'Thanks for the kind words! Let me know how it turns out.',
      createdAt: '2026-04-28T10:00:00Z',
    },
  ],
  2: [
    {
      id: 3,
      threadId: 2,
      sender: { id: 1, username: 'daglar' },
      body: "Love the tagine recipe! I can't find ras el hanout locally — is there a good substitute?",
      createdAt: '2026-04-25T11:00:00Z',
    },
    {
      id: 4,
      threadId: 2,
      sender: { id: 3, username: 'spice_master' },
      body: 'You can substitute ras el hanout with garam masala in a pinch.',
      createdAt: '2026-04-26T15:30:00Z',
    },
  ],
};

let nextThreadId = 3;
let nextMessageId = 5;

export function mockCreateThread({ toUserId, toUsername, recipeId, recipeTitle, body }) {
  const newThread = {
    id: nextThreadId++,
    otherUser: { id: toUserId, username: toUsername },
    recipe: { id: recipeId, title: recipeTitle },
    lastMessage: { body, createdAt: new Date().toISOString(), senderId: 1 },
    unreadCount: 0,
  };
  MOCK_THREADS.unshift(newThread);
  MOCK_MESSAGES[newThread.id] = [
    {
      id: nextMessageId++,
      threadId: newThread.id,
      sender: { id: 1, username: 'daglar' },
      body,
      createdAt: new Date().toISOString(),
    },
  ];
  return newThread;
}

export function mockSendMessage(threadId, body) {
  const msg = {
    id: nextMessageId++,
    threadId,
    sender: { id: 1, username: 'daglar' },
    body,
    createdAt: new Date().toISOString(),
  };
  if (!MOCK_MESSAGES[threadId]) MOCK_MESSAGES[threadId] = [];
  MOCK_MESSAGES[threadId].push(msg);
  const thread = MOCK_THREADS.find((t) => t.id === threadId);
  if (thread) thread.lastMessage = { body, createdAt: msg.createdAt, senderId: 1 };
  return msg;
}
