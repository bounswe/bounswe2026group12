import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { NotificationContext } from '../context/NotificationContext';
import NotificationTray from '../components/NotificationTray';

function renderTray(overrides = {}) {
  const value = {
    notifications: [],
    unreadCount: 0,
    loading: false,
    error: '',
    refreshNotifications: jest.fn(),
    markRead: jest.fn(),
    markAllRead: jest.fn(),
    ...overrides,
  };
  const utils = render(
    <MemoryRouter>
      <NotificationContext.Provider value={value}>
        <NotificationTray />
      </NotificationContext.Provider>
    </MemoryRouter>
  );
  return { ...utils, value };
}

describe('NotificationTray', () => {
  it('renders the bell toggle with aria-label "Notifications"', () => {
    renderTray();
    expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
  });

  it('renders a badge with the unread count when unreadCount > 0', () => {
    renderTray({ unreadCount: 3 });
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('does not render a badge when unreadCount is 0', () => {
    const { container } = renderTray({ unreadCount: 0 });
    expect(container.querySelector('.notification-badge')).toBeNull();
  });

  it('toggles aria-expanded when the bell is clicked', () => {
    renderTray();
    const button = screen.getByRole('button', { name: /notifications/i });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('shows the loading state inside the open panel', () => {
    renderTray({ loading: true });
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows the empty state when there are no notifications', () => {
    renderTray();
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    expect(screen.getByText(/no notifications yet/i)).toBeInTheDocument();
  });

  it('renders a notification with a link to /recipes/<recipeId> when recipeId is present', () => {
    renderTray({
      notifications: [
        {
          id: 10,
          message: 'New comment on your recipe',
          recipeId: 42,
          isRead: false,
          createdAt: new Date().toISOString(),
        },
      ],
      unreadCount: 1,
    });
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    const link = screen.getByRole('link', { name: /new comment on your recipe/i });
    expect(link).toHaveAttribute('href', '/recipes/42');
  });

  it('falls back to /inbox when notification has no recipeId', () => {
    renderTray({
      notifications: [
        {
          id: 11,
          message: 'System notice',
          isRead: false,
          createdAt: new Date().toISOString(),
        },
      ],
      unreadCount: 1,
    });
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    expect(screen.getByRole('link', { name: /system notice/i })).toHaveAttribute('href', '/inbox');
  });

  it('renders a "Mark all read" button when unreadCount > 0 and invokes context.markAllRead on click', () => {
    const markAllRead = jest.fn();
    renderTray({
      notifications: [
        {
          id: 1,
          message: 'unread one',
          isRead: false,
          createdAt: new Date().toISOString(),
        },
      ],
      unreadCount: 1,
      markAllRead,
    });
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    const markAllBtn = screen.getByRole('button', { name: /mark all read/i });
    expect(markAllBtn).toBeInTheDocument();
    fireEvent.click(markAllBtn);
    expect(markAllRead).toHaveBeenCalledTimes(1);
  });

  it('does not render the "Mark all read" button when unreadCount is 0', () => {
    renderTray({ unreadCount: 0 });
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    expect(screen.queryByRole('button', { name: /mark all read/i })).toBeNull();
  });

  it('calls markRead(id) and closes the panel when a notification is clicked', () => {
    const markRead = jest.fn();
    renderTray({
      notifications: [
        {
          id: 99,
          message: 'click me',
          recipeId: 5,
          isRead: false,
          createdAt: new Date().toISOString(),
        },
      ],
      unreadCount: 1,
      markRead,
    });
    const toggle = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole('link', { name: /click me/i }));
    expect(markRead).toHaveBeenCalledWith(99);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('NotificationTray — rating notifications (#739)', () => {
  it('renders a star icon for type === "rating"', async () => {
    renderTray({
      notifications: [
        {
          id: 99,
          type: 'rating',
          message: 'alice rated your recipe.',
          recipeId: 5,
          recipeTitle: 'Mercimek',
          actorUsername: 'alice',
          isRead: false,
          createdAt: new Date().toISOString(),
        },
      ],
    });
    await userEvent.click(screen.getByRole('button', { name: /notifications/i }));
    expect(screen.getByText('★')).toBeInTheDocument();
  });

  it('links a rating notification to /recipes/<recipeId>', async () => {
    renderTray({
      notifications: [
        {
          id: 100,
          type: 'rating',
          message: 'bob rated your recipe.',
          recipeId: 12,
          recipeTitle: 'Pilav',
          isRead: false,
          createdAt: new Date().toISOString(),
        },
      ],
    });
    await userEvent.click(screen.getByRole('button', { name: /notifications/i }));
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/recipes/12');
  });

  it('keeps question / reply icons unchanged', async () => {
    renderTray({
      notifications: [
        { id: 1, type: 'question', message: 'q', recipeId: 1, isRead: false, createdAt: new Date().toISOString() },
        { id: 2, type: 'reply',    message: 'r', recipeId: 1, isRead: false, createdAt: new Date().toISOString() },
        { id: 3, type: 'rating',   message: 't', recipeId: 1, isRead: false, createdAt: new Date().toISOString() },
      ],
    });
    await userEvent.click(screen.getByRole('button', { name: /notifications/i }));
    expect(screen.getByText('💬')).toBeInTheDocument();
    expect(screen.getByText('↪')).toBeInTheDocument();
    expect(screen.getByText('★')).toBeInTheDocument();
  });
});
