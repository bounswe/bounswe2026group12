import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ExplorePage from '../pages/ExplorePage';
import * as exploreService from '../services/exploreService';
import { AuthContext } from '../context/AuthContext';

jest.mock('../services/exploreService');
jest.mock('../services/recipeService', () => ({
  toggleBookmark: jest.fn().mockResolvedValue({ is_bookmarked: true }),
}));

const mockEvents = [
  {
    id: 'featured',
    name: 'Today on Genipe',
    emoji: '⭐',
    featuredRail: true,
    featured: [
      { type: 'recipe', id: 1, title: 'Wedding Soup', author_username: 'eren', region: 'Aegean' },
    ],
  },
  {
    id: 'region-aegean',
    name: 'Aegean',
    emoji: '🫒',
    featured: [
      { type: 'recipe', id: 1, title: 'Wedding Soup', author_username: 'eren', region: 'Aegean' },
      { type: 'story', id: 2, title: "Our Big Day", author_username: 'alice', region: 'Aegean' },
    ],
  },
  {
    id: 'region-marmara',
    name: 'Marmara',
    emoji: '🌊',
    featured: [
      { type: 'recipe', id: 3, title: 'Lentil Salad', author_username: 'bob', region: 'Marmara' },
    ],
  },
];

function renderPage({ user = { id: 1, username: 'me' } } = {}) {
  return render(
    <AuthContext.Provider value={{ user, token: 't', login: jest.fn(), logout: jest.fn(), loading: false }}>
      <MemoryRouter initialEntries={['/explore']}>
        <Routes>
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/explore/:eventId" element={<div>Event detail</div>} />
          <Route path="/recipes/:id" element={<div>Recipe detail</div>} />
          <Route path="/stories/:id" element={<div>Story detail</div>} />
          <Route path="/login" element={<div>Login</div>} />
          <Route path="/map" element={<div>Map</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  exploreService.fetchExploreEvents.mockResolvedValue(mockEvents);
});

describe('ExplorePage', () => {
  it('shows skeleton rails while events load', () => {
    let resolve;
    exploreService.fetchExploreEvents.mockReturnValue(new Promise((r) => { resolve = r; }));
    const { container } = renderPage();
    expect(container.querySelectorAll('.explore-card-skeleton').length).toBeGreaterThan(0);
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    resolve([]);
  });

  it('renders the featured rail + region rails after fetch resolves', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /today on genipe/i })).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: /^aegean$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^marmara$/i })).toBeInTheDocument();
    expect(screen.getAllByText('Wedding Soup').length).toBeGreaterThan(0);
    expect(screen.getByText('Lentil Salad')).toBeInTheDocument();
  });

  it('renders the region jump-nav with one chip per region rail', async () => {
    renderPage();
    await screen.findByRole('heading', { name: /^aegean$/i });
    const nav = screen.getByRole('navigation', { name: /jump to region/i });
    expect(nav).toBeInTheDocument();
    expect(nav.querySelectorAll('a').length).toBeGreaterThanOrEqual(2);
  });

  it('renders "See all" only on non-featured rails', async () => {
    renderPage();
    await screen.findByRole('heading', { name: /^aegean$/i });
    const seeAllLinks = screen.getAllByRole('link', { name: /see all/i });
    expect(seeAllLinks.map((a) => a.getAttribute('href'))).toEqual(
      expect.arrayContaining(['/explore/region-aegean', '/explore/region-marmara']),
    );
    expect(seeAllLinks.some((a) => a.getAttribute('href') === '/explore/featured')).toBe(false);
  });

  it('renders an empty state with CTAs when no rails have items', async () => {
    exploreService.fetchExploreEvents.mockResolvedValue([]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/no recipes or stories yet/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: /open the map/i })).toHaveAttribute('href', '/map');
    expect(screen.getByRole('link', { name: /share a recipe/i })).toHaveAttribute('href', '/recipes/new');
  });

  it('shows the sign-in banner only when not authenticated', async () => {
    renderPage({ user: null });
    await screen.findByRole('heading', { name: /^aegean$/i });
    expect(screen.getByText(/sign in/i)).toBeInTheDocument();
  });

  it('hides the sign-in banner when authenticated', async () => {
    renderPage();
    await screen.findByRole('heading', { name: /^aegean$/i });
    expect(screen.queryByText(/sign in to see recipes/i)).not.toBeInTheDocument();
  });

  it('shows the bookmark button on recipe cards only when signed in', async () => {
    renderPage();
    await screen.findByRole('heading', { name: /^aegean$/i });
    expect(screen.getAllByRole('button', { name: /save recipe/i }).length).toBeGreaterThan(0);
  });

  it('shows an error message when fetchExploreEvents rejects', async () => {
    exploreService.fetchExploreEvents.mockRejectedValue(new Error('500'));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/could not load explore content/i)).toBeInTheDocument();
    });
  });
});
