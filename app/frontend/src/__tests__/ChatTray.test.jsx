import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ChatContext } from '../context/ChatContext';
import ChatTray from '../components/ChatTray';
import * as messageService from '../services/messageService';

jest.mock('../services/messageService');

const mockMarkRead = jest.fn();

const baseThreads = [
  {
    id: 1,
    otherUser: { id: 2, username: 'alice' },
    lastMessage: { body: 'Hey!', createdAt: new Date().toISOString() },
    unreadCount: 2,
  },
];

function renderTray({ user = { id: 1, username: 'me' }, threads = baseThreads, totalUnread = 2 } = {}) {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={{ user, token: user ? 'tok' : null, login: jest.fn(), logout: jest.fn(), updateUser: jest.fn() }}>
        <ChatContext.Provider value={{ threads, totalUnread, loading: false, markRead: mockMarkRead, refresh: jest.fn() }}>
          <ChatTray />
        </ChatContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  messageService.fetchMessages.mockResolvedValue([]);
  messageService.sendMessage.mockResolvedValue({ id: 99, body: 'hi', sender: { id: 1 }, createdAt: new Date().toISOString() });
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
});

describe('ChatTray', () => {
  it('renders nothing when user is null', () => {
    const { container } = renderTray({ user: null });
    expect(container.firstChild).toBeNull();
  });

  it('renders the Messages tab when user is logged in', () => {
    renderTray();
    expect(screen.getByRole('button', { name: /messages/i })).toBeInTheDocument();
  });

  it('shows unread badge when totalUnread > 0', () => {
    renderTray({ totalUnread: 5 });
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('does not show badge when totalUnread is 0', () => {
    renderTray({ totalUnread: 0 });
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('opens the panel on toggle click', () => {
    renderTray();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /messages/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('closes the panel on second toggle click', () => {
    renderTray();
    fireEvent.click(screen.getByRole('button', { name: /messages/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /messages/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes the panel on click-outside', () => {
    renderTray();
    fireEvent.click(screen.getByRole('button', { name: /messages/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows thread list with username and unread count in open panel', () => {
    renderTray();
    fireEvent.click(screen.getByRole('button', { name: /messages/i }));
    expect(screen.getByText('@alice')).toBeInTheDocument();
    expect(document.querySelector('.chat-tray-unread')).toBeInTheDocument();
  });

  it('calls markRead when a thread is clicked', () => {
    renderTray();
    fireEvent.click(screen.getByRole('button', { name: /messages/i }));
    fireEvent.click(screen.getByText('@alice'));
    expect(mockMarkRead).toHaveBeenCalledWith(1);
  });

  it('shows "No conversations yet." when threads are empty', () => {
    renderTray({ threads: [], totalUnread: 0 });
    fireEvent.click(screen.getByRole('button', { name: /messages/i }));
    expect(screen.getByText('No conversations yet.')).toBeInTheDocument();
  });
});

describe('relativeTime and isRecentlyActive helpers', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-01-01T12:00:00Z').getTime());
  });
  afterEach(() => jest.restoreAllMocks());

  it('shows seconds for recent timestamps', () => {
    renderTray({
      threads: [{
        id: 1,
        otherUser: { id: 2, username: 'alice' },
        lastMessage: { body: 'Hey', createdAt: new Date('2026-01-01T11:59:30Z').toISOString() },
        unreadCount: 0,
      }],
      totalUnread: 0,
    });
    fireEvent.click(screen.getByRole('button', { name: /messages/i }));
    expect(screen.getByText('30s')).toBeInTheDocument();
  });

  it('shows minutes for older timestamps', () => {
    renderTray({
      threads: [{
        id: 1,
        otherUser: { id: 2, username: 'alice' },
        lastMessage: { body: 'Hey', createdAt: new Date('2026-01-01T11:55:00Z').toISOString() },
        unreadCount: 0,
      }],
      totalUnread: 0,
    });
    fireEvent.click(screen.getByRole('button', { name: /messages/i }));
    expect(screen.getByText('5m')).toBeInTheDocument();
  });

  it('clamps negative diff to 0s for future timestamps', () => {
    renderTray({
      threads: [{
        id: 1,
        otherUser: { id: 2, username: 'alice' },
        lastMessage: { body: 'Hey', createdAt: new Date('2026-01-01T12:00:05Z').toISOString() },
        unreadCount: 0,
      }],
      totalUnread: 0,
    });
    fireEvent.click(screen.getByRole('button', { name: /messages/i }));
    expect(screen.getByText('0s')).toBeInTheDocument();
  });

  it('shows green dot for threads active within 5 minutes', () => {
    renderTray({
      threads: [{
        id: 1,
        otherUser: { id: 2, username: 'alice' },
        lastMessage: { body: 'Hey', createdAt: new Date('2026-01-01T11:57:00Z').toISOString() },
        unreadCount: 0,
      }],
      totalUnread: 0,
    });
    fireEvent.click(screen.getByRole('button', { name: /messages/i }));
    expect(document.querySelector('.chat-tray-online')).toBeInTheDocument();
  });

  it('no green dot for threads older than 5 minutes', () => {
    renderTray({
      threads: [{
        id: 1,
        otherUser: { id: 2, username: 'alice' },
        lastMessage: { body: 'Hey', createdAt: new Date('2026-01-01T11:54:00Z').toISOString() },
        unreadCount: 0,
      }],
      totalUnread: 0,
    });
    fireEvent.click(screen.getByRole('button', { name: /messages/i }));
    expect(document.querySelector('.chat-tray-online')).not.toBeInTheDocument();
  });
});
