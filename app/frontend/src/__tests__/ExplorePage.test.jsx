import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ExplorePage from '../pages/ExplorePage';
import * as exploreService from '../services/exploreService';

jest.mock('../services/exploreService');

const mockEvents = [
  {
    id: 'wedding',
    name: 'Weddings',
    emoji: '💍',
    featured: [
      { type: 'recipe', id: 1, title: 'Wedding Soup', author_username: 'eren' },
      { type: 'story', id: 2, title: "Our Big Day", author_username: 'alice' },
    ],
  },
  {
    id: 'newyear',
    name: 'New Year',
    emoji: '🎉',
    featured: [
      { type: 'recipe', id: 3, title: 'Lentil Salad', author_username: 'bob' },
    ],
  },
];

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/explore']}>
      <Routes>
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/explore/:eventId" element={<div>Event detail</div>} />
        <Route path="/recipes/:id" element={<div>Recipe detail</div>} />
        <Route path="/stories/:id" element={<div>Story detail</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  exploreService.fetchExploreEvents.mockResolvedValue(mockEvents);
});

describe('ExplorePage', () => {
  it('shows a loading state while events load', () => {
    let resolve;
    exploreService.fetchExploreEvents.mockReturnValue(new Promise((r) => { resolve = r; }));
    renderPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    resolve([]);
  });

  it('renders each event section after fetch resolves', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /weddings/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /new year/i })).toBeInTheDocument();
    });
    expect(screen.getByText('Wedding Soup')).toBeInTheDocument();
    expect(screen.getByText('Our Big Day')).toBeInTheDocument();
    expect(screen.getByText('Lentil Salad')).toBeInTheDocument();
  });

  it('renders "See all" links to /explore/<eventId>', async () => {
    renderPage();
    await screen.findByText('Wedding Soup');
    const seeAllLinks = screen.getAllByRole('link', { name: /see all/i });
    expect(seeAllLinks).toHaveLength(2);
    expect(seeAllLinks[0]).toHaveAttribute('href', '/explore/wedding');
    expect(seeAllLinks[1]).toHaveAttribute('href', '/explore/newyear');
  });

  it('renders content cards pointing at /recipes/:id or /stories/:id', async () => {
    renderPage();
    await screen.findByText('Wedding Soup');
    expect(screen.getByRole('link', { name: /wedding soup/i })).toHaveAttribute(
      'href',
      '/recipes/1',
    );
    expect(screen.getByRole('link', { name: /our big day/i })).toHaveAttribute(
      'href',
      '/stories/2',
    );
  });

  it('renders no event sections when the API returns an empty list', async () => {
    exploreService.fetchExploreEvents.mockResolvedValue([]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /explore/i })).toBeInTheDocument();
    });
    expect(screen.queryAllByRole('link', { name: /see all/i })).toHaveLength(0);
  });

  it('shows an error message when fetchExploreEvents rejects', async () => {
    exploreService.fetchExploreEvents.mockRejectedValue(new Error('500'));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/could not load explore content/i)).toBeInTheDocument();
    });
  });
});
