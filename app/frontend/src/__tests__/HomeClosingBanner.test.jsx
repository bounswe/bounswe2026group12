import { render, screen } from '@testing-library/react';
import HomeClosingBanner from '../components/HomeClosingBanner';

describe('HomeClosingBanner', () => {
  it('renders a region with the brand sentence about sharing cultures', () => {
    render(<HomeClosingBanner />);
    const region = screen.getByRole('region', { name: /sharing cultures/i });
    expect(region).toBeInTheDocument();
    expect(region).toHaveTextContent(/share/i);
    expect(region).toHaveTextContent(/cultur/i);
  });
});
