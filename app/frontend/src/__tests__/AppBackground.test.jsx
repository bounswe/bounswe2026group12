import { render } from '@testing-library/react';
import AppBackground from '../components/AppBackground';

// GridMotion uses GSAP which JSDOM can't fully simulate; mock to a passthrough
// since this test just verifies the two background layers mount.
jest.mock('../components/GridMotion', () => () => <div data-testid="grid-motion" />);

describe('AppBackground', () => {
  it('renders the grid layer and the overlay layer', () => {
    const { container } = render(<AppBackground />);
    expect(container.querySelector('.app-bg')).toBeInTheDocument();
    expect(container.querySelector('.app-bg-filter')).toBeInTheDocument();
  });

  it('marks both layers as aria-hidden so the grid does not pollute the a11y tree', () => {
    const { container } = render(<AppBackground />);
    expect(container.querySelector('.app-bg')).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('.app-bg-filter')).toHaveAttribute('aria-hidden', 'true');
  });
});
