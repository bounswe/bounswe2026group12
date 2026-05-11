import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import StoryListPage from '../pages/StoryListPage';
import * as storyService from '../services/storyService';

jest.mock('../services/storyService');

const mockStories = [
  { id: 1, title: "Grandma's Kitchen", author: 1, author_username: 'eren', region_name: 'Aegean', image: null },
  { id: 2, title: 'Black Sea Memories', author: 2, author_username: 'ahmet', region_name: 'Black Sea', image: null },
];

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/stories']}>
      <Routes>
        <Route path="/stories" element={<StoryListPage />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => jest.clearAllMocks());

describe('StoryListPage', () => {
  it('shows loading state initially', async () => {
    let resolveStories;
    storyService.fetchStories.mockReturnValue(
      new Promise((resolve) => { resolveStories = resolve; })
    );
    renderPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    // drain pending state updates to avoid act() warnings
    resolveStories([]);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
  });

  it('renders all story titles after load', async () => {
    storyService.fetchStories.mockResolvedValue(mockStories);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Grandma's Kitchen")).toBeInTheDocument();
      expect(screen.getByText('Black Sea Memories')).toBeInTheDocument();
    });
  });

  it('each story card links to /stories/:id', async () => {
    storyService.fetchStories.mockResolvedValue(mockStories);
    renderPage();
    await waitFor(() => screen.getByText("Grandma's Kitchen"));
    const links = screen.getAllByRole('link');
    const hrefs = links.map((l) => l.getAttribute('href'));
    expect(hrefs).toContain('/stories/1');
    expect(hrefs).toContain('/stories/2');
  });

  it('shows empty message when no stories exist', async () => {
    storyService.fetchStories.mockResolvedValue([]);
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/no stories yet/i)).toBeInTheDocument()
    );
  });

  it('shows error message when API fails', async () => {
    storyService.fetchStories.mockRejectedValue(new Error('fail'));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/could not load/i)).toBeInTheDocument()
    );
  });
});
