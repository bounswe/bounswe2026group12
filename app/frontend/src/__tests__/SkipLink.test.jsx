import { render, screen } from '@testing-library/react';
import SkipLink from '../components/SkipLink';

describe('SkipLink', () => {
  it('renders an anchor with href="#main-content"', () => {
    render(<SkipLink />);
    const link = screen.getByRole('link', { name: /skip to main content/i });
    expect(link).toHaveAttribute('href', '#main-content');
  });

  it('shows the accessible "Skip to main content" text', () => {
    render(<SkipLink />);
    expect(screen.getByText(/skip to main content/i)).toBeInTheDocument();
  });

  it('has the skip-link class for off-screen styling', () => {
    render(<SkipLink />);
    expect(screen.getByRole('link', { name: /skip to main content/i })).toHaveClass('skip-link');
  });
});
