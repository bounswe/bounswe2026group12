import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HomeRail from '../components/HomeRail';

function renderRail(props = {}) {
  return render(
    <MemoryRouter>
      <HomeRail
        title="This week's recipes"
        items={[]}
        loading={false}
        moreHref="/recipes"
        getHref={(it) => `/recipes/${it.id}`}
        {...props}
      />
    </MemoryRouter>,
  );
}

describe('HomeRail', () => {
  it('renders the title and the More → link to moreHref', () => {
    renderRail();
    expect(screen.getByRole('heading', { name: /this week's recipes/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /more/i })).toHaveAttribute('href', '/recipes');
  });

  it('renders one Link per item with the per-item href from getHref', () => {
    const items = Array.from({ length: 4 }, (_, i) => ({
      id: i + 1, title: `Recipe ${i + 1}`, image: null, author_username: 'eren',
    }));
    renderRail({ items });
    expect(screen.getByRole('link', { name: /recipe 1/i })).toHaveAttribute('href', '/recipes/1');
    expect(screen.getByRole('link', { name: /recipe 4/i })).toHaveAttribute('href', '/recipes/4');
  });

  it('renders 6 skeleton cards when loading=true', () => {
    const { container } = renderRail({ loading: true });
    const skeletons = container.querySelectorAll('.home-rail-skeleton');
    expect(skeletons.length).toBe(6);
  });

  it('renders an alert with the error text instead of cards when error is set', () => {
    renderRail({ error: 'Could not load.' });
    expect(screen.getByRole('alert')).toHaveTextContent(/could not load/i);
    expect(screen.queryByRole('link', { name: /recipe/i })).not.toBeInTheDocument();
  });

  it('renders the emptyHint when items is empty and not loading and not error', () => {
    renderRail({ emptyHint: 'No recipes yet.' });
    expect(screen.getByText(/no recipes yet/i)).toBeInTheDocument();
  });

  it('renders the optional subtitle when provided', () => {
    renderRail({ subtitle: 'Fresh picks from the community' });
    expect(screen.getByText(/fresh picks/i)).toBeInTheDocument();
  });

  it('renders the image when item.image is truthy and a placeholder otherwise', () => {
    const items = [
      { id: 1, title: 'With image', image: '/img.jpg' },
      { id: 2, title: 'Without image', image: null },
    ];
    const { container } = renderRail({ items });
    expect(screen.getByRole('img', { name: /with image/i })).toHaveAttribute('src', '/img.jpg');
    // The placeholder card should not have an <img>
    const cards = container.querySelectorAll('.home-rail-card');
    const placeholder = within(cards[1]).queryByRole('img');
    expect(placeholder).toBeNull();
  });
});
