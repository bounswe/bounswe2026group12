import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
  linked_recipe: { id: 5, title: 'Baklava', region: 'Aegean' },
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

  it('shows Edit Story button when user is authenticated (non-author)', async () => {
    renderPage('1', { id: 99, username: 'other' });
    await waitFor(() => screen.getByText("Grandma's Sunday Kitchen"));
    expect(screen.getByRole('button', { name: /edit story/i })).toBeInTheDocument();
  });

  it('shows ownership error when non-author clicks Edit Story', async () => {
    renderPage('1', { id: 99, username: 'other' });
    await waitFor(() => screen.getByRole('button', { name: /edit story/i }));
    fireEvent.click(screen.getByRole('button', { name: /edit story/i }));
    expect(screen.getByText(/you can only edit your own stories/i)).toBeInTheDocument();
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
});
