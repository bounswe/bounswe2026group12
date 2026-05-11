import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import InboxPage from '../pages/InboxPage';
import * as messageService from '../services/messageService';

jest.mock('../services/messageService');

const mockThreads = [
  {
    id: 10,
    otherUser: { id: 2, username: 'alice' },
    lastMessage: {
      senderId: 2,
      body: 'Hello there!',
      createdAt: new Date().toISOString(),
    },
    recipe: { id: 5, title: 'Baklava' },
    unreadCount: 2,
  },
  {
    id: 11,
    otherUser: { id: 3, username: 'bob' },
    lastMessage: {
      senderId: 1,
      body: 'See you soon',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    recipe: null,
    unreadCount: 0,
  },
  {
    id: 12,
    otherUser: { id: 4, username: 'carol' },
    lastMessage: null,
    recipe: null,
    unreadCount: 0,
  },
];

const authedUser = { id: 1, username: 'me' };

function renderPage(search = '', user = authedUser) {
  return render(
    <AuthContext.Provider
      value={{
        user,
        token: user ? 'tok' : null,
        login: jest.fn(),
        logout: jest.fn(),
        updateUser: jest.fn(),
      }}
    >
      <MemoryRouter initialEntries={[`/inbox${search}`]}>
        <Routes>
          <Route path="/inbox" element={<InboxPage />} />
          <Route path="/inbox/:threadId" element={<div>Thread page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  messageService.fetchThreads.mockResolvedValue(mockThreads);
});

describe('InboxPage', () => {
  it('shows a loading state while threads are loading', () => {
    let resolve;
    messageService.fetchThreads.mockReturnValue(new Promise((r) => { resolve = r; }));
    renderPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    resolve([]);
  });

  it('renders thread rows after fetch resolves', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('@alice')).toBeInTheDocument();
      expect(screen.getByText('@bob')).toBeInTheDocument();
      expect(screen.getByText('@carol')).toBeInTheDocument();
    });
    expect(screen.getByText('Hello there!')).toBeInTheDocument();
    expect(screen.getByText(/Re: Baklava/i)).toBeInTheDocument();
    // own messages prefixed with "You: "
    expect(screen.getByText(/You: See you soon/)).toBeInTheDocument();
  });

  it('shows the empty-state message when there are no threads', async () => {
    messageService.fetchThreads.mockResolvedValue([]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/no messages yet/i)).toBeInTheDocument();
    });
  });

  it('renders the compose form when ?compose=true&to=...&toUsername=... is in the URL', async () => {
    messageService.fetchThreads.mockResolvedValue([]);
    renderPage('?compose=true&to=2&toUsername=alice&recipeId=5&recipeTitle=Baklava');
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/write your message/i)).toBeInTheDocument();
    });
    expect(screen.getByText('@alice')).toBeInTheDocument();
    expect(screen.getByText('Baklava')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('compose: typing and clicking Send calls createThread with the right args and navigates', async () => {
    messageService.fetchThreads.mockResolvedValue([]);
    messageService.createThread.mockResolvedValue({ id: 42 });
    renderPage('?compose=true&to=2&toUsername=alice&recipeId=5&recipeTitle=Baklava');

    const textarea = await screen.findByPlaceholderText(/write your message/i);
    await userEvent.type(textarea, 'Hello Alice');
    await userEvent.click(screen.getByRole('button', { name: /^send$/i }));

    await waitFor(() => {
      expect(messageService.createThread).toHaveBeenCalledWith({
        toUserId: 2,
        toUsername: 'alice',
        recipeId: 5,
        recipeTitle: 'Baklava',
        body: 'Hello Alice',
      });
    });
    await waitFor(() => {
      expect(screen.getByText('Thread page')).toBeInTheDocument();
    });
  });

  it('compose: Cancel button navigates back to /inbox without compose form', async () => {
    messageService.fetchThreads.mockResolvedValue([]);
    renderPage('?compose=true&to=2&toUsername=alice');

    await screen.findByPlaceholderText(/write your message/i);
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/write your message/i)).not.toBeInTheDocument();
    });
    expect(screen.getByText(/no messages yet/i)).toBeInTheDocument();
  });

  it('shows an error message when fetchThreads rejects', async () => {
    messageService.fetchThreads.mockRejectedValue(new Error('network'));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/could not load inbox/i)).toBeInTheDocument();
    });
  });
});
