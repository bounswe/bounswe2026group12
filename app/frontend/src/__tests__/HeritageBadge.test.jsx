import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HeritageBadge from '../components/HeritageBadge';

function renderBadge(group) {
  return render(
    <MemoryRouter>
      <HeritageBadge group={group} />
    </MemoryRouter>,
  );
}

describe('HeritageBadge', () => {
  it('renders nothing when group is null', () => {
    const { container } = renderBadge(null);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when group is undefined', () => {
    const { container } = renderBadge(undefined);
    expect(container.firstChild).toBeNull();
  });

  it('renders the heritage name with the building icon', () => {
    renderBadge({ id: 1, name: 'Sarma / Dolma' });
    expect(screen.getByText(/Sarma \/ Dolma/)).toBeInTheDocument();
    expect(screen.getByText(/🏛/)).toBeInTheDocument();
  });

  it('links to /heritage/:id', () => {
    renderBadge({ id: 7, name: 'Köfte' });
    const link = screen.getByRole('link', { name: /heritage: köfte/i });
    expect(link).toHaveAttribute('href', '/heritage/7');
  });
});
