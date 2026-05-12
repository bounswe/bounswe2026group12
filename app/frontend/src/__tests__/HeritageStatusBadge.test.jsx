import { render, screen } from '@testing-library/react';
import HeritageStatusBadge from '../components/HeritageStatusBadge';

describe('HeritageStatusBadge', () => {
  it.each([
    ['endangered', /endangered/i, /heritage-status-endangered/],
    ['preserved', /preserved/i, /heritage-status-preserved/],
    ['revived', /revived/i, /heritage-status-revived/],
  ])('renders the %s pill', (status, labelMatcher, classMatcher) => {
    const { container } = render(<HeritageStatusBadge status={status} />);
    expect(screen.getByText(labelMatcher)).toBeInTheDocument();
    expect(container.querySelector('.heritage-status-badge').className).toMatch(classMatcher);
  });

  it('renders nothing for "none"', () => {
    const { container } = render(<HeritageStatusBadge status="none" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing for null/undefined/unknown values', () => {
    expect(render(<HeritageStatusBadge status={null} />).container.firstChild).toBeNull();
    expect(render(<HeritageStatusBadge status={undefined} />).container.firstChild).toBeNull();
    expect(render(<HeritageStatusBadge status="something-else" />).container.firstChild).toBeNull();
  });

  it('applies the size variant class', () => {
    const { container } = render(<HeritageStatusBadge status="endangered" size="md" />);
    expect(container.querySelector('.heritage-status-md')).not.toBeNull();
  });
});
