import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import ProfilePage from '../pages/ProfilePage';
import * as recipeService from '../services/recipeService';
import * as storyService from '../services/storyService';

jest.mock('../services/recipeService');
jest.mock('../services/storyService');

function renderPage({ user = { id: 1, username: 'eren', email: 'e@x.com', is_contactable: true }, logout = jest.fn(), updateUser = jest.fn() } = {}) {
  return render(
    <AuthContext.Provider value={{ user, token: 'tok', login: jest.fn(), logout, updateUser, loading: false }}>
      <MemoryRouter initialEntries={['/profile']}>
        <Routes>
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

beforeEach(() => {
  recipeService.fetchMyRecipes = jest.fn().mockResolvedValue([]);
  recipeService.fetchMyBookmarks = jest.fn().mockResolvedValue([]);
  storyService.fetchMyStories = jest.fn().mockResolvedValue([]);
});

describe('ProfilePage', () => {
  it('displays the current user info', () => {
    renderPage();
    expect(screen.getByText('@eren')).toBeInTheDocument();
    expect(screen.getByText('e@x.com')).toBeInTheDocument();
  });

  it('renders the ContactabilityToggle', () => {
    renderPage();
    expect(screen.getByRole('checkbox', { name: /allow new threads|block new threads/i })).toBeInTheDocument();
  });

  it('logs the user out when Log Out is clicked', async () => {
    const logout = jest.fn();
    renderPage({ logout });
    await userEvent.click(screen.getByRole('button', { name: /log out/i }));
    expect(logout).toHaveBeenCalled();
  });

  it('has a link back to onboarding to edit cultural preferences', () => {
    renderPage();
    const link = screen.getByRole('link', { name: /edit cultural preferences/i });
    expect(link).toHaveAttribute('href', '/onboarding');
  });
});

describe('ProfilePage — my recipes / stories / bookmarks', () => {
  it('renders three section headings (My recipes, My stories, Saved recipes)', async () => {
    recipeService.fetchMyRecipes.mockResolvedValue([]);
    storyService.fetchMyStories.mockResolvedValue([]);
    recipeService.fetchMyBookmarks.mockResolvedValue([]);
    renderPage({ user: { id: 7, username: 'me', email: 'me@x.com', is_contactable: true } });
    expect(await screen.findByRole('heading', { name: /my recipes/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /my stories/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /saved recipes/i })).toBeInTheDocument();
  });

  it('renders one card per recipe / story / bookmark with a link to detail', async () => {
    recipeService.fetchMyRecipes.mockResolvedValue([
      { id: 1, title: 'My Sarma', region_name: 'Black Sea' },
    ]);
    storyService.fetchMyStories.mockResolvedValue([
      { id: 2, title: 'My Memory' },
    ]);
    recipeService.fetchMyBookmarks.mockResolvedValue([
      { id: 3, title: 'Saved Pasta' },
    ]);
    renderPage({ user: { id: 7, username: 'me', email: 'me@x.com', is_contactable: true } });
    expect(await screen.findByRole('link', { name: /my sarma/i }))
      .toHaveAttribute('href', '/recipes/1');
    expect(screen.getByRole('link', { name: /my memory/i }))
      .toHaveAttribute('href', '/stories/2');
    expect(screen.getByRole('link', { name: /saved pasta/i }))
      .toHaveAttribute('href', '/recipes/3');
  });

  it('shows an empty-state hint when a section has no items', async () => {
    recipeService.fetchMyRecipes.mockResolvedValue([]);
    storyService.fetchMyStories.mockResolvedValue([]);
    recipeService.fetchMyBookmarks.mockResolvedValue([]);
    renderPage({ user: { id: 7, username: 'me', email: 'me@x.com', is_contactable: true } });
    await screen.findByRole('heading', { name: /my recipes/i });
    expect(screen.getByText(/no recipes yet/i)).toBeInTheDocument();
    expect(screen.getByText(/no stories yet/i)).toBeInTheDocument();
    expect(screen.getByText(/no saved recipes yet/i)).toBeInTheDocument();
  });

  it('handles per-section fetch failures gracefully (other sections still render)', async () => {
    recipeService.fetchMyRecipes.mockResolvedValue([{ id: 1, title: 'Mine' }]);
    storyService.fetchMyStories.mockRejectedValue(new Error('boom'));
    recipeService.fetchMyBookmarks.mockResolvedValue([]);
    renderPage({ user: { id: 7, username: 'me', email: 'me@x.com', is_contactable: true } });
    expect(await screen.findByRole('link', { name: /mine/i })).toBeInTheDocument();
    expect(screen.getByText(/could not load stories/i)).toBeInTheDocument();
    expect(screen.getByText(/no saved recipes yet/i)).toBeInTheDocument();
  });
});
