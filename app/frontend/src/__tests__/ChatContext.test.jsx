import { act, render, screen, waitFor } from '@testing-library/react';
import { useContext } from 'react';
import { ChatContext, ChatProvider } from '../context/ChatContext';
import { AuthContext } from '../context/AuthContext';
import * as messageService from '../services/messageService';

jest.mock('../services/messageService');
jest.useFakeTimers();

const mockThreads = [
  { id: 1, otherUser: { id: 2, username: 'alice' }, lastMessage: null, unreadCount: 3 },
  { id: 2, otherUser: { id: 3, username: 'bob' }, lastMessage: null, unreadCount: 0 },
];

function Spy() {
  const ctx = useContext(ChatContext);
  return (
    <div>
      <span data-testid="count">{ctx.threads.length}</span>
      <span data-testid="unread">{ctx.totalUnread}</span>
      <span data-testid="loading">{String(ctx.loading)}</span>
      <button onClick={() => ctx.markRead(1)}>markRead</button>
      <button onClick={() => ctx.refresh()}>refresh</button>
    </div>
  );
}

function renderWithUser(user) {
  return render(
    <AuthContext.Provider value={{ user, token: user ? 'tok' : null, login: jest.fn(), logout: jest.fn(), updateUser: jest.fn() }}>
      <ChatProvider>
        <Spy />
      </ChatProvider>
    </AuthContext.Provider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  messageService.fetchThreads.mockResolvedValue(mockThreads);
  messageService.markThreadRead.mockResolvedValue({});
});

describe('ChatContext', () => {
  it('starts with empty threads when user is null', () => {
    renderWithUser(null);
    expect(screen.getByTestId('count').textContent).toBe('0');
    expect(messageService.fetchThreads).not.toHaveBeenCalled();
  });

  it('fetches threads on mount when user is set', async () => {
    renderWithUser({ id: 1, username: 'me' });
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('2'));
    expect(messageService.fetchThreads).toHaveBeenCalledTimes(1);
  });

  it('computes totalUnread from threads', async () => {
    renderWithUser({ id: 1, username: 'me' });
    await waitFor(() => expect(screen.getByTestId('unread').textContent).toBe('3'));
  });

  it('polls again after 30s', async () => {
    renderWithUser({ id: 1, username: 'me' });
    await waitFor(() => expect(messageService.fetchThreads).toHaveBeenCalledTimes(1));
    act(() => jest.advanceTimersByTime(30000));
    await waitFor(() => expect(messageService.fetchThreads).toHaveBeenCalledTimes(2));
  });

  it('markRead zeroes unreadCount locally and calls markThreadRead service', async () => {
    renderWithUser({ id: 1, username: 'me' });
    await waitFor(() => expect(screen.getByTestId('unread').textContent).toBe('3'));
    act(() => screen.getByText('markRead').click());
    await waitFor(() => expect(screen.getByTestId('unread').textContent).toBe('0'));
    expect(messageService.markThreadRead).toHaveBeenCalledWith(1);
  });

  it('clears threads when user becomes null', async () => {
    const { rerender } = renderWithUser({ id: 1, username: 'me' });
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('2'));
    rerender(
      <AuthContext.Provider value={{ user: null, token: null, login: jest.fn(), logout: jest.fn(), updateUser: jest.fn() }}>
        <ChatProvider>
          <Spy />
        </ChatProvider>
      </AuthContext.Provider>
    );
    expect(screen.getByTestId('count').textContent).toBe('0');
  });
});
