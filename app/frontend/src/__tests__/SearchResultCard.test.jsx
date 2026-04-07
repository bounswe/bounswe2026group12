import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SearchResultCard from '../components/SearchResultCard';

const recipeResult = { type: 'recipe', id: 1, title: 'Baklava', region: 'Aegean', thumbnail: null };
const storyResult  = { type: 'story',  id: 2, title: "Grandma's Kitchen", region: 'Mediterranean', thumbnail: null };

function renderCard(result) {
  return render(
    <MemoryRouter>
      <SearchResultCard result={result} />
    </MemoryRouter>
  );
}

describe('SearchResultCard', () => {
  it('renders the result title', () => {
    renderCard(recipeResult);
    expect(screen.getByText('Baklava')).toBeInTheDocument();
  });

  it('renders the region tag', () => {
    renderCard(recipeResult);
    expect(screen.getByText('Aegean')).toBeInTheDocument();
  });

  it('renders a type badge for recipe', () => {
    renderCard(recipeResult);
    expect(screen.getByText(/recipe/i)).toBeInTheDocument();
  });

  it('renders a type badge for story', () => {
    renderCard(storyResult);
    expect(screen.getByText(/story/i)).toBeInTheDocument();
  });

  it('links to /recipes/:id for recipe results', () => {
    renderCard(recipeResult);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/recipes/1');
  });

  it('links to /stories/:id for story results', () => {
    renderCard(storyResult);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/stories/2');
  });

  it('renders without thumbnail when thumbnail is null', () => {
    renderCard(recipeResult);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('renders an img when thumbnail is a URL', () => {
    renderCard({ ...recipeResult, thumbnail: 'http://example.com/img.jpg' });
    expect(screen.getByRole('img')).toHaveAttribute('src', 'http://example.com/img.jpg');
  });

  it('does not render region when region is absent', () => {
    renderCard({ type: 'recipe', id: 3, title: 'Soup', region: null, thumbnail: null });
    expect(screen.queryByText('Aegean')).not.toBeInTheDocument();
  });
});
