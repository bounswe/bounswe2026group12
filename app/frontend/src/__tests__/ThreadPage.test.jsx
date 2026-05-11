import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import ThreadPage from '../pages/ThreadPage';
import * as messageService from '../services/messageService';

jest.mock('../services/messageService');

// jsdom doesn't implement scrollIntoView; stub it so the effect doesn't blow up
beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn();
});

const authedUser = { id: 1, username: 'me' };

const baseTime = new Date('2026-01-01T12:00:00Z').toISOString();

const mockMessages = [
  {
    id: 1,
    body: 'Hi from Alice',
    createdAt: baseTime,
    sender: { id: 2, username: 'alice' },
  },
  {
    id: 2,
    body: 'Hi back from me',
    createdAt: new Date('2026-01-01T12:05:00Z').toISOString(),
    sender: { id: 1, username: 'me' },
  },
];

function renderPage(threadId = '10', user = authedUser) {
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
      <MemoryRouter initialEntries={[`/inbox/${threadId}`]}>
        <Routes>
          <Route path="/inbox/:threadId" element={<ThreadPage />} />
          <Route path="/inbox" element={<div>Inbox</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  messageService.fetchMessages.mockResolvedValue(mockMessages);
});

describe('ThreadPage', () => {
  it('shows a loading state while messages are loading', () => {
    let resolve;
    messageService.fetchMessages.mockReturnValue(new Promise((r) => { resolve = r; }));
    renderPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    resolve([]);
  });

  it('renders messages returned by fetchMessages, in order', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Hi from Alice')).toBeInTheDocument();
      expect(screen.getByText('Hi back from me')).toBeInTheDocument();
    });
    const bubbles = screen.getAllByText(/^Hi/);
    expect(bubbles[0]).toHaveTextContent('Hi from Alice');
    expect(bubbles[1]).toHaveTextContent('Hi back from me');
  });

  it('typing and clicking Send calls sendMessage(threadId, body) and appends the message', async () => {
    const newMsg = {
      id: 3,
      body: 'A new reply',
      createdAt: new Date('2026-01-01T12:10:00Z').toISOString(),
      sender: { id: 1, username: 'me' },
    };
    messageService.sendMessage.mockResolvedValue(newMsg);
    renderPage('77');

    await screen.findByText('Hi from Alice');
    const textarea = screen.getByPlaceholderText(/write a message/i);
    await userEvent.type(textarea, 'A new reply');
    await userEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(messageService.sendMessage).toHaveBeenCalledWith('77', 'A new reply');
    });
    await waitFor(() => {
      expect(screen.getByText('A new reply')).toBeInTheDocument();
    });
  });

  it('disables the Send button while a send is in flight', async () => {
    let resolveSend;
    messageService.sendMessage.mockReturnValue(
      new Promise((res) => { resolveSend = res; }),
    );
    renderPage();

    await screen.findByText('Hi from Alice');
    const textarea = screen.getByPlaceholderText(/write a message/i);
    await userEvent.type(textarea, 'In flight');
    const sendBtn = screen.getByRole('button', { name: /send/i });
    await userEvent.click(sendBtn);

    await waitFor(() => {
      expect(sendBtn).toBeDisabled();
    });

    resolveSend({
      id: 99,
      body: 'In flight',
      createdAt: new Date().toISOString(),
      sender: { id: 1, username: 'me' },
    });

    await waitFor(() => {
      expect(screen.getByText('In flight')).toBeInTheDocument();
    });
  });

  it('does not call sendMessage when the body is empty or whitespace', async () => {
    renderPage();

    await screen.findByText('Hi from Alice');
    const sendBtn = screen.getByRole('button', { name: /send/i });
    // Empty: button is disabled
    expect(sendBtn).toBeDisabled();

    const textarea = screen.getByPlaceholderText(/write a message/i);
    await userEvent.type(textarea, '    ');
    // Still effectively empty after trim — button should remain disabled
    expect(sendBtn).toBeDisabled();
    expect(messageService.sendMessage).not.toHaveBeenCalled();
  });

  it('shows an error state when fetchMessages rejects', async () => {
    messageService.fetchMessages.mockRejectedValue(new Error('boom'));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/could not load messages/i)).toBeInTheDocument();
    });
  });

  it('calls scrollIntoView after messages render (auto scroll-to-bottom)', async () => {
    renderPage();
    await screen.findByText('Hi back from me');
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });
});
