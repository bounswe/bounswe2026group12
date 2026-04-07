import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import StoryDetailPage from '../pages/StoryDetailPage';
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

function renderPage(storyId = '1') {
  return render(
    <MemoryRouter initialEntries={[`/stories/${storyId}`]}>
      <Routes>
        <Route path="/stories/:id" element={<StoryDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  storyService.fetchStory.mockResolvedValue(mockStory);
});

describe('StoryDetailPage', () => {
  it('shows loading state initially', () => {
    renderPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
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

  it('shows error message when API fails', async () => {
    storyService.fetchStory.mockRejectedValue(new Error('Not found'));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/could not load/i)).toBeInTheDocument()
    );
  });
});
