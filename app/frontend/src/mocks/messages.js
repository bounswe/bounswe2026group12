const CURRENT_USER = { id: 1, username: 'daglar' };
const NEXT_MESSAGE_STEP_MS = 3 * 60 * 1000;
const NEXT_MESSAGE_START = Date.parse('2026-05-09T08:00:00Z');

function createInitialThreads() {
  return [
    {
      id: 1,
      otherUser: { id: 2, username: 'chef_maria' },
      recipe: { id: 1, title: 'Turkish Baklava' },
      lastMessage: {
        body: 'Let the syrup cool first, then pour it over the hot pastry in three passes.',
        createdAt: '2026-05-08T09:45:00Z',
        senderId: 2,
      },
      unreadCount: 2,
    },
    {
      id: 2,
      otherUser: { id: 3, username: 'spice_master' },
      recipe: { id: 2, title: 'Lamb Tagine' },
      lastMessage: {
        body: 'Perfect, I already have both cumin and cinnamon at home.',
        createdAt: '2026-05-07T18:10:00Z',
        senderId: 1,
      },
      unreadCount: 0,
    },
    {
      id: 3,
      otherUser: { id: 4, username: 'anatolia_kitchen' },
      recipe: { id: 7, title: 'Stuffed Grape Leaves' },
      lastMessage: {
        body: 'A little dill works, but keep most of the filling mint-based for the traditional balance.',
        createdAt: '2026-05-06T16:25:00Z',
        senderId: 4,
      },
      unreadCount: 0,
    },
    {
      id: 4,
      otherUser: { id: 5, username: 'coffee_nomad' },
      recipe: null,
      lastMessage: null,
      unreadCount: 0,
    },
  ];
}

function createInitialMessages() {
  return {
    1: [
      {
        id: 1,
        threadId: 1,
        sender: { ...CURRENT_USER },
        body: 'Hi! I loved your baklava recipe. Do you add the syrup while the tray is still hot?',
        createdAt: '2026-05-08T08:55:00Z',
      },
      {
        id: 2,
        threadId: 1,
        sender: { id: 2, username: 'chef_maria' },
        body: 'Yes, I bake the tray until deep golden, then rest it for about five minutes first.',
        createdAt: '2026-05-08T09:10:00Z',
      },
      {
        id: 3,
        threadId: 1,
        sender: { ...CURRENT_USER },
        body: 'That makes sense. I usually rush the syrup step and the bottom layer turns soft.',
        createdAt: '2026-05-08T09:23:00Z',
      },
      {
        id: 4,
        threadId: 1,
        sender: { id: 2, username: 'chef_maria' },
        body: 'Let the syrup cool first, then pour it over the hot pastry in three passes.',
        createdAt: '2026-05-08T09:45:00Z',
      },
    ],
    2: [
      {
        id: 5,
        threadId: 2,
        sender: { ...CURRENT_USER },
        body: "Love the tagine recipe. I can't find ras el hanout locally. Is there a substitute?",
        createdAt: '2026-05-07T17:20:00Z',
      },
      {
        id: 6,
        threadId: 2,
        sender: { id: 3, username: 'spice_master' },
        body: 'Try a mix of cumin, coriander, cinnamon, allspice, and a pinch of paprika.',
        createdAt: '2026-05-07T17:42:00Z',
      },
      {
        id: 7,
        threadId: 2,
        sender: { ...CURRENT_USER },
        body: 'Perfect, I already have both cumin and cinnamon at home.',
        createdAt: '2026-05-07T18:10:00Z',
      },
    ],
    3: [
      {
        id: 8,
        threadId: 3,
        sender: { id: 4, username: 'anatolia_kitchen' },
        body: 'Thanks for asking about the grape leaves recipe. Are you making it as an appetizer or a main dish?',
        createdAt: '2026-05-05T18:00:00Z',
      },
      {
        id: 9,
        threadId: 3,
        sender: { ...CURRENT_USER },
        body: 'Mostly as a side dish, but I may bring it to a family lunch so I want the filling to stay bright.',
        createdAt: '2026-05-05T18:14:00Z',
      },
      {
        id: 10,
        threadId: 3,
        sender: { id: 4, username: 'anatolia_kitchen' },
        body: 'Use plenty of parsley and mint, and let the rice cool before you start rolling so the leaves stay tender.',
        createdAt: '2026-05-05T18:30:00Z',
      },
      {
        id: 11,
        threadId: 3,
        sender: { ...CURRENT_USER },
        body: 'Good tip. One more question: could I swap some mint for dill without making it taste too different?',
        createdAt: '2026-05-06T16:02:00Z',
      },
      {
        id: 12,
        threadId: 3,
        sender: { id: 4, username: 'anatolia_kitchen' },
        body: 'A little dill works, but keep most of the filling mint-based for the traditional balance.',
        createdAt: '2026-05-06T16:25:00Z',
      },
    ],
    4: [],
  };
}

function cloneThread(thread) {
  return {
    ...thread,
    otherUser: { ...thread.otherUser },
    recipe: thread.recipe ? { ...thread.recipe } : null,
    lastMessage: thread.lastMessage ? { ...thread.lastMessage } : null,
  };
}

function cloneMessage(message) {
  return {
    ...message,
    sender: { ...message.sender },
  };
}

let mockThreads;
let mockMessages;
let nextThreadId;
let nextMessageId;
let nextTimestampMs;

export function resetMockMessagingState() {
  mockThreads = createInitialThreads();
  mockMessages = createInitialMessages();
  nextThreadId = Math.max(...mockThreads.map((thread) => thread.id)) + 1;
  nextMessageId = Math.max(
    ...Object.values(mockMessages).flat().map((message) => message.id),
    0,
  ) + 1;
  nextTimestampMs = NEXT_MESSAGE_START;
}

function nextMockTimestamp() {
  const createdAt = new Date(nextTimestampMs).toISOString();
  nextTimestampMs += NEXT_MESSAGE_STEP_MS;
  return createdAt;
}

function moveThreadToTop(threadId) {
  const index = mockThreads.findIndex((thread) => thread.id === threadId);
  if (index <= 0) return;
  const [thread] = mockThreads.splice(index, 1);
  mockThreads.unshift(thread);
}

resetMockMessagingState();

export function getMockThreads() {
  return mockThreads.map(cloneThread);
}

export function getMockMessages(threadId) {
  return (mockMessages[Number(threadId)] || []).map(cloneMessage);
}

export function mockCreateThread({ toUserId, toUsername, recipeId, recipeTitle, body }) {
  const createdAt = nextMockTimestamp();
  const newThread = {
    id: nextThreadId++,
    otherUser: { id: toUserId, username: toUsername },
    recipe: recipeId ? { id: recipeId, title: recipeTitle } : null,
    lastMessage: { body, createdAt, senderId: CURRENT_USER.id },
    unreadCount: 0,
  };
  const firstMessage = {
    id: nextMessageId++,
    threadId: newThread.id,
    sender: { ...CURRENT_USER },
    body,
    createdAt,
  };

  mockThreads.unshift(newThread);
  mockMessages[newThread.id] = [firstMessage];

  return cloneThread(newThread);
}

export function mockSendMessage(threadId, body) {
  const normalizedThreadId = Number(threadId);
  const createdAt = nextMockTimestamp();
  const msg = {
    id: nextMessageId++,
    threadId: normalizedThreadId,
    sender: { ...CURRENT_USER },
    body,
    createdAt,
  };

  if (!mockMessages[normalizedThreadId]) mockMessages[normalizedThreadId] = [];
  mockMessages[normalizedThreadId].push(msg);

  const thread = mockThreads.find((item) => item.id === normalizedThreadId);
  if (thread) {
    thread.lastMessage = { body, createdAt, senderId: CURRENT_USER.id };
    thread.unreadCount = 0;
    moveThreadToTop(normalizedThreadId);
  }

  return cloneMessage(msg);
}
