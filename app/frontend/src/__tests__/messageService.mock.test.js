jest.mock('../services/api', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const ORIGINAL_USE_MOCK = process.env.REACT_APP_USE_MOCK;

function loadMockModules() {
  jest.resetModules();
  process.env.REACT_APP_USE_MOCK = 'true';
  const mockState = require('../mocks/messages');
  const messageService = require('../services/messageService');
  return { ...mockState, ...messageService };
}

afterEach(() => {
  process.env.REACT_APP_USE_MOCK = ORIGINAL_USE_MOCK;
  jest.resetModules();
});

describe('messageService mock mode', () => {
  it('returns richer deterministic thread scenarios with consistent previews', async () => {
    const {
      fetchThreads,
      fetchMessages,
      resetMockMessagingState,
    } = loadMockModules();

    resetMockMessagingState();

    const threads = await fetchThreads();
    expect(threads.map((thread) => thread.id)).toEqual([1, 2, 3, 4]);

    const baklavaMessages = await fetchMessages(1);
    expect(baklavaMessages).toHaveLength(4);
    expect(threads[0].unreadCount).toBe(2);
    expect(threads[0].lastMessage.body).toBe(
      baklavaMessages[baklavaMessages.length - 1].body,
    );
    expect(new Set(baklavaMessages.map((message) => message.sender.id))).toEqual(new Set([1, 2]));

    const grapeLeafMessages = await fetchMessages(3);
    expect(grapeLeafMessages).toHaveLength(5);
    expect(threads[2].recipe).toEqual({ id: 7, title: 'Stuffed Grape Leaves' });

    expect(await fetchMessages(4)).toEqual([]);
    expect(threads[3].lastMessage).toBeNull();
  });

  it('creates a new thread with a deterministic first message and matching preview', async () => {
    const {
      createThread,
      fetchMessages,
      fetchThreads,
      resetMockMessagingState,
    } = loadMockModules();

    resetMockMessagingState();

    const createdThread = await createThread({
      toUserId: 9,
      toUsername: 'olive_grove',
      recipeId: 11,
      recipeTitle: 'Menemen',
      body: 'Hi! I want to ask about the pepper-to-egg ratio.',
    });

    expect(createdThread.lastMessage.createdAt).toBe('2026-05-09T08:00:00.000Z');

    const threads = await fetchThreads();
    expect(threads[0]).toEqual(expect.objectContaining({
      id: createdThread.id,
      otherUser: { id: 9, username: 'olive_grove' },
      recipe: { id: 11, title: 'Menemen' },
      unreadCount: 0,
    }));

    const createdMessages = await fetchMessages(createdThread.id);
    expect(createdMessages).toHaveLength(1);
    expect(createdMessages[0]).toEqual(expect.objectContaining({
      body: 'Hi! I want to ask about the pepper-to-egg ratio.',
      createdAt: '2026-05-09T08:00:00.000Z',
      sender: { id: 1, username: 'daglar' },
    }));
    expect(threads[0].lastMessage.body).toBe(createdMessages[0].body);
    expect(threads[0].lastMessage.createdAt).toBe(createdMessages[0].createdAt);
  });

  it('appends sent messages, updates the preview, and bumps the thread to the top', async () => {
    const {
      fetchMessages,
      fetchThreads,
      resetMockMessagingState,
      sendMessage,
    } = loadMockModules();

    resetMockMessagingState();

    const beforeThreads = await fetchThreads();
    expect(beforeThreads[0].id).toBe(1);

    const sentMessage = await sendMessage(3, 'Could I use dill instead of mint if I keep the parsley high?');
    expect(sentMessage.createdAt).toBe('2026-05-09T08:00:00.000Z');

    const afterThreads = await fetchThreads();
    expect(afterThreads[0].id).toBe(3);
    expect(afterThreads[0].lastMessage).toEqual({
      body: 'Could I use dill instead of mint if I keep the parsley high?',
      createdAt: '2026-05-09T08:00:00.000Z',
      senderId: 1,
    });
    expect(afterThreads[0].unreadCount).toBe(0);

    const updatedMessages = await fetchMessages(3);
    expect(updatedMessages).toHaveLength(6);
    expect(updatedMessages[updatedMessages.length - 1]).toEqual(expect.objectContaining({
      body: 'Could I use dill instead of mint if I keep the parsley high?',
      sender: { id: 1, username: 'daglar' },
    }));
  });
});
