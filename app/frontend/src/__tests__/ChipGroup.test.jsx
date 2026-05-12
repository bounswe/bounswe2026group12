import { render, screen, fireEvent } from '@testing-library/react';
import ChipGroup from '../components/ChipGroup';

function chips(count, prefix = 'item') {
  return Array.from({ length: count }, (_, i) => (
    <button key={`${prefix}-${i}`} type="button">{`${prefix}-${i}`}</button>
  ));
}

describe('ChipGroup', () => {
  it('renders all children and no toggle when items fit within visibleCount', () => {
    render(
      <ChipGroup label="Region" visibleCount={5}>
        {chips(3)}
      </ChipGroup>,
    );
    expect(screen.getByText('Region')).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(3);
    expect(screen.queryByRole('button', { name: /more|less/i })).toBeNull();
  });

  it('hides overflow chips and shows "+ N more" toggle when items exceed visibleCount', () => {
    render(
      <ChipGroup label="Region" visibleCount={3}>
        {chips(10)}
      </ChipGroup>,
    );
    expect(screen.queryByText('item-0')).toBeInTheDocument();
    expect(screen.queryByText('item-2')).toBeInTheDocument();
    expect(screen.queryByText('item-3')).toBeNull();
    expect(screen.queryByText('item-9')).toBeNull();
    expect(
      screen.getByRole('button', { name: /Show 7 more Region/i }),
    ).toBeInTheDocument();
  });

  it('expands to show all chips when toggle is clicked, then collapses again', () => {
    render(
      <ChipGroup label="Region" visibleCount={2}>
        {chips(6)}
      </ChipGroup>,
    );
    const toggleExpand = screen.getByRole('button', { name: /Show 4 more Region/i });
    fireEvent.click(toggleExpand);

    expect(screen.getByText('item-5')).toBeInTheDocument();

    const toggleCollapse = screen.getByRole('button', { name: /Show fewer Region/i });
    expect(toggleCollapse).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(toggleCollapse);

    expect(screen.queryByText('item-5')).toBeNull();
    expect(
      screen.getByRole('button', { name: /Show 4 more Region/i }),
    ).toHaveAttribute('aria-expanded', 'false');
  });

  it('renders an optional icon next to the label', () => {
    const { container } = render(
      <ChipGroup label="Region" icon="🌍" visibleCount={5}>
        {chips(2)}
      </ChipGroup>,
    );
    expect(container.querySelector('.chip-group-icon')).not.toBeNull();
    expect(container.querySelector('.chip-group-icon')).toHaveTextContent('🌍');
  });

  it('starts collapsed once async children arrive past the visibleCount', () => {
    const { rerender } = render(
      <ChipGroup label="Region" visibleCount={3}>{chips(0)}</ChipGroup>,
    );
    // Async load lands a moment later
    rerender(
      <ChipGroup label="Region" visibleCount={3}>{chips(10)}</ChipGroup>,
    );
    expect(screen.queryByText('item-9')).toBeNull();
    expect(
      screen.getByRole('button', { name: /Show 7 more Region/i }),
    ).toBeInTheDocument();
  });
});
