import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import StoryDetailPage from '../pages/StoryDetailPage';
import { AuthContext } from '../context/AuthContext';
import * as storyService from '../services/storyService';

jest.mock('../services/storyService');

const mockStory = {
  id: 1,
  title: "Grandma's Sunday Kitchen",
  body: 'Every Sunday morning the smell of fresh bread...',
  author: 3,
  author_username: 'eren',
  linked_recipe: 5,
  recipe_title: 'Baklava',
  language: 'en',
  is_published: true,
};

const mockStoryNoRecipe = { ...mockStory, linked_recipe: null };

function renderPage(storyId = '1', authUser = null) {
  return render(
    <AuthContext.Provider value={{ user: authUser, token: authUser ? 'tok' : null, login: jest.fn(), logout: jest.fn() }}>
      <MemoryRouter initialEntries={[`/stories/${storyId}`]}>
        <Routes>
          <Route path="/stories/:id" element={<StoryDetailPage />} />
          <Route path="/stories/:id/edit" element={<div>Edit Page</div>} />
          <Route path="/stories" element={<div>Story List Page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

beforeEach(() => {
  storyService.fetchStory.mockResolvedValue(mockStory);
});

describe('StoryDetailPage', () => {
  it('shows loading state initially', async () => {
    let resolve;
    storyService.fetchStory.mockReturnValue(new Promise(r => { resolve = r; }));
    renderPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    resolve(mockStory);
    await waitFor(() => screen.getByText("Grandma's Sunday Kitchen"));
  });

  it('displays story title after load', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("Grandma's Sunday Kitchen")).toBeInTheDocument()
    );
  });

  it('displays story body after load', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/every sunday morning/i)).toBeInTheDocument()
    );
  });

  it('displays author username', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/eren/i)).toBeInTheDocument()
    );
  });

  it('shows linked recipe title when recipe is attached', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Baklava')).toBeInTheDocument()
    );
  });

  it('linked recipe element links to /recipes/:id', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Baklava'));
    expect(screen.getByRole('link', { name: /baklava/i })).toHaveAttribute('href', '/recipes/5');
  });

  it('does NOT show linked recipe section when no recipe is attached', async () => {
    storyService.fetchStory.mockResolvedValue(mockStoryNoRecipe);
    renderPage();
    await waitFor(() => screen.getByText("Grandma's Sunday Kitchen"));
    expect(screen.queryByText('Baklava')).not.toBeInTheDocument();
  });

  it('does NOT show Edit Story button when user is not authenticated', async () => {
    renderPage('1', null);
    await waitFor(() => screen.getByText("Grandma's Sunday Kitchen"));
    expect(screen.queryByRole('button', { name: /edit story/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /edit story/i })).not.toBeInTheDocument();
  });

  it('does not render any Edit Story control for non-authors', async () => {
    renderPage('1', { id: 99, username: 'visitor' });
    await waitFor(() => screen.getByRole('heading', { level: 1 }));
    expect(screen.queryByRole('button', { name: /edit story/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /edit story/i })).not.toBeInTheDocument();
  });

  it('shows Edit Story as a link to /stories/:id/edit when user is the author', async () => {
    renderPage('1', { id: 3, username: 'eren' });
    await waitFor(() => screen.getByRole('link', { name: /edit story/i }));
    expect(screen.getByRole('link', { name: /edit story/i })).toHaveAttribute('href', '/stories/1/edit');
  });

  it('shows error message when API fails', async () => {
    storyService.fetchStory.mockRejectedValue(new Error('Not found'));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/could not load/i)).toBeInTheDocument()
    );
  });

  describe('delete flow', () => {
    beforeEach(() => {
      storyService.deleteStory = jest.fn().mockResolvedValue({ status: 204 });
    });

    it('shows Delete only to the author', async () => {
      renderPage('1', { id: 3, username: 'eren' });
      await waitFor(() => screen.getByRole('heading', { level: 1 }));
      expect(screen.getByRole('button', { name: /^delete$/i })).toBeInTheDocument();
    });

    it('does not show Delete to non-authors', async () => {
      renderPage('1', { id: 99, username: 'visitor' });
      await waitFor(() => screen.getByRole('heading', { level: 1 }));
      expect(screen.queryByRole('button', { name: /^delete$/i })).not.toBeInTheDocument();
    });

    it('confirms, deletes, and navigates to /stories', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
      renderPage('1', { id: 3, username: 'eren' });
      await waitFor(() => screen.getByRole('heading', { level: 1 }));
      await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));
      await waitFor(() => {
        expect(storyService.deleteStory).toHaveBeenCalledWith(1);
      });
      await waitFor(() => {
        expect(screen.getByText(/story list page/i)).toBeInTheDocument();
      });
      confirmSpy.mockRestore();
    });

    it('disables the Delete button while a delete request is in flight', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
      let resolveDelete;
      storyService.deleteStory = jest.fn(
        () => new Promise((resolve) => { resolveDelete = resolve; })
      );
      renderPage('1', { id: 3, username: 'eren' });
      await waitFor(() => screen.getByRole('heading', { level: 1 }));
      const deleteBtn = screen.getByRole('button', { name: /^delete$/i });
      await userEvent.click(deleteBtn);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /deleting/i })).toBeDisabled();
      });
      resolveDelete({ status: 204 });
      confirmSpy.mockRestore();
    });

    it('does nothing when the user cancels the confirm', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
      renderPage('1', { id: 3, username: 'eren' });
      await waitFor(() => screen.getByRole('heading', { level: 1 }));
      await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));
      expect(storyService.deleteStory).not.toHaveBeenCalled();
      confirmSpy.mockRestore();
    });

    it('shows an inline error if delete fails and keeps the story rendered', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
      storyService.deleteStory = jest.fn().mockRejectedValue(new Error('boom'));
      renderPage('1', { id: 3, username: 'eren' });
      await waitFor(() => screen.getByRole('heading', { level: 1 }));
      await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));
      await waitFor(() => {
        expect(screen.getByText(/could not delete story/i)).toBeInTheDocument();
      });
      expect(screen.getByText("Grandma's Sunday Kitchen")).toBeInTheDocument();
      confirmSpy.mockRestore();
    });
  });

  describe('publish/unpublish flow', () => {
    beforeEach(() => {
      storyService.publishStory = jest.fn();
      storyService.unpublishStory = jest.fn();
    });

    it('shows "Unpublish" for the author when the story is published', async () => {
      renderPage('1', { id: 3, username: 'eren' });
      await waitFor(() => screen.getByRole('heading', { level: 1 }));
      expect(screen.getByRole('button', { name: /^unpublish$/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^publish$/i })).not.toBeInTheDocument();
    });

    it('shows "Publish" for the author when the story is a draft', async () => {
      storyService.fetchStory.mockResolvedValue({ ...mockStory, is_published: false });
      renderPage('1', { id: 3, username: 'eren' });
      await waitFor(() => screen.getByRole('heading', { level: 1 }));
      expect(screen.getByRole('button', { name: /^publish$/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^unpublish$/i })).not.toBeInTheDocument();
    });

    it('does NOT show publish/unpublish control to non-authors', async () => {
      renderPage('1', { id: 99, username: 'visitor' });
      await waitFor(() => screen.getByRole('heading', { level: 1 }));
      expect(screen.queryByRole('button', { name: /^unpublish$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^publish$/i })).not.toBeInTheDocument();
    });

    it('does NOT show publish/unpublish control when unauthenticated', async () => {
      renderPage('1', null);
      await waitFor(() => screen.getByRole('heading', { level: 1 }));
      expect(screen.queryByRole('button', { name: /^unpublish$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^publish$/i })).not.toBeInTheDocument();
    });

    it('clicking "Unpublish" calls unpublishStory and flips the control to "Publish"', async () => {
      storyService.unpublishStory.mockResolvedValue({ ...mockStory, is_published: false });
      renderPage('1', { id: 3, username: 'eren' });
      await waitFor(() => screen.getByRole('button', { name: /^unpublish$/i }));
      await userEvent.click(screen.getByRole('button', { name: /^unpublish$/i }));
      await waitFor(() => {
        expect(storyService.unpublishStory).toHaveBeenCalledWith(1);
      });
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^publish$/i })).toBeInTheDocument();
      });
    });

    it('clicking "Publish" calls publishStory and flips the control to "Unpublish"', async () => {
      storyService.fetchStory.mockResolvedValue({ ...mockStory, is_published: false });
      storyService.publishStory.mockResolvedValue({ ...mockStory, is_published: true });
      renderPage('1', { id: 3, username: 'eren' });
      await waitFor(() => screen.getByRole('button', { name: /^publish$/i }));
      await userEvent.click(screen.getByRole('button', { name: /^publish$/i }));
      await waitFor(() => {
        expect(storyService.publishStory).toHaveBeenCalledWith(1);
      });
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^unpublish$/i })).toBeInTheDocument();
      });
    });

    it('shows an inline error if publish fails', async () => {
      storyService.fetchStory.mockResolvedValue({ ...mockStory, is_published: false });
      storyService.publishStory.mockRejectedValue(new Error('boom'));
      renderPage('1', { id: 3, username: 'eren' });
      await waitFor(() => screen.getByRole('button', { name: /^publish$/i }));
      await userEvent.click(screen.getByRole('button', { name: /^publish$/i }));
      await waitFor(() => {
        expect(screen.getByText(/could not publish story/i)).toBeInTheDocument();
      });
    });
  });
});

// — Heritage badge (#500) —
describe('StoryDetailPage heritage badge', () => {
  it('renders the heritage badge when story.heritage_group is present', async () => {
    storyService.fetchStory.mockResolvedValueOnce({
      ...mockStory,
      heritage_group: { id: 4, name: 'Dolmadakia' },
    });
    renderPage();
    const link = await screen.findByRole('link', { name: /heritage: dolmadakia/i });
    expect(link).toHaveAttribute('href', '/heritage/4');
  });

  it('renders no heritage badge when story.heritage_group is null', async () => {
    storyService.fetchStory.mockResolvedValueOnce({
      ...mockStory,
      heritage_group: null,
    });
    renderPage();
    await screen.findByText("Grandma's Sunday Kitchen");
    expect(screen.queryByText(/heritage:/i)).not.toBeInTheDocument();
  });
});
