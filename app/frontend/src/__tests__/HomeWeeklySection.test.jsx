import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HomeWeeklySection from '../components/HomeWeeklySection';
import * as recipeService from '../services/recipeService';
import * as storyService from '../services/storyService';

jest.mock('../services/recipeService');
jest.mock('../services/storyService');

function renderSection() {
  return render(
    <MemoryRouter>
      <HomeWeeklySection />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  recipeService.fetchFeaturedRecipes = jest.fn().mockResolvedValue([]);
  storyService.fetchFeaturedStories  = jest.fn().mockResolvedValue([]);
});

describe('HomeWeeklySection', () => {
  it('renders both rail titles and Wires the right More → targets', async () => {
    renderSection();
    expect(await screen.findByRole('heading', { name: /this week's recipes/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /this week's stories/i })).toBeInTheDocument();
    const moreLinks = screen.getAllByRole('link', { name: /more/i });
    const hrefs = moreLinks.map((l) => l.getAttribute('href'));
    expect(hrefs).toEqual(expect.arrayContaining(['/recipes', '/stories']));
  });

  it('fetches both featured lists on mount with limit=6', async () => {
    renderSection();
    await waitFor(() => {
      expect(recipeService.fetchFeaturedRecipes).toHaveBeenCalledWith(6);
      expect(storyService.fetchFeaturedStories).toHaveBeenCalledWith(6);
    });
  });

  it('renders a recipe card per item and routes via /recipes/:id', async () => {
    recipeService.fetchFeaturedRecipes.mockResolvedValue([
      { id: 1, title: 'Sarma',  image: null, author_username: 'eren' },
      { id: 2, title: 'Pilav',  image: null, author_username: 'eren' },
    ]);
    storyService.fetchFeaturedStories.mockResolvedValue([
      { id: 3, title: 'My memory', image: null, author_username: 'eren' },
    ]);
    renderSection();
    const sarma  = await screen.findByRole('link', { name: /sarma/i });
    const memory = await screen.findByRole('link', { name: /my memory/i });
    expect(sarma).toHaveAttribute('href', '/recipes/1');
    expect(memory).toHaveAttribute('href', '/stories/3');
  });

  it('surfaces a per-rail error if only one fetch fails', async () => {
    recipeService.fetchFeaturedRecipes.mockResolvedValue([
      { id: 1, title: 'Sarma', image: null, author_username: 'eren' },
    ]);
    storyService.fetchFeaturedStories.mockRejectedValue(new Error('boom'));
    renderSection();
    expect(await screen.findByRole('link', { name: /sarma/i })).toBeInTheDocument();
    // The story rail should show an alert.
    const alerts = await screen.findAllByRole('alert');
    expect(alerts.some((a) => /stor/i.test(a.textContent))).toBe(true);
  });
});
