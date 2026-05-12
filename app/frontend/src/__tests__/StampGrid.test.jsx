import { render, screen } from '@testing-library/react';
import StampGrid from '../components/passport/StampGrid';

const stamps = [
  { id: 1, culture: 'First Recipe',     category: 'Recipe',    rarity: 'bronze',    earned_at: '2025-01-01T00:00:00Z' },
  { id: 2, culture: 'Ottoman Explorer', category: 'Heritage',  rarity: 'gold',      earned_at: '2025-02-01T00:00:00Z' },
  { id: 3, culture: 'Community Pillar', category: 'Community', rarity: 'legendary', earned_at: null },
];

describe('StampGrid', () => {
  it('shows empty state when stamps array is empty', () => {
    render(<StampGrid stamps={[]} />);
    expect(screen.getByText(/no stamps yet/i)).toBeInTheDocument();
  });

  it('shows empty state when stamps is null', () => {
    render(<StampGrid stamps={null} />);
    expect(screen.getByText(/no stamps yet/i)).toBeInTheDocument();
  });

  it('renders stamp culture names', () => {
    render(<StampGrid stamps={stamps} />);
    expect(screen.getByText('First Recipe')).toBeInTheDocument();
    expect(screen.getByText('Ottoman Explorer')).toBeInTheDocument();
    expect(screen.getByText('Community Pillar')).toBeInTheDocument();
  });

  it('renders category headers', () => {
    render(<StampGrid stamps={stamps} />);
    expect(screen.getByText('Recipe')).toBeInTheDocument();
    expect(screen.getByText('Heritage')).toBeInTheDocument();
    expect(screen.getByText('Community')).toBeInTheDocument();
  });

  it('unearned stamp (earned_at null) has locked CSS class', () => {
    const { container } = render(<StampGrid stamps={stamps} />);
    const locked = container.querySelector('.stamp-card--locked');
    expect(locked).toBeInTheDocument();
  });

  it('earned stamps do not have locked class', () => {
    render(<StampGrid stamps={stamps} />);
    const cards = document.querySelectorAll('.stamp-card:not(.stamp-card--locked)');
    expect(cards.length).toBe(2);
  });

  it('earned stamp shows formatted date', () => {
    render(<StampGrid stamps={[stamps[0]]} />);
    expect(screen.getByText(/Jan 2025/i)).toBeInTheDocument();
  });

  it('unearned stamp shows lock icon', () => {
    render(<StampGrid stamps={[stamps[2]]} />);
    expect(screen.getByText('🔒')).toBeInTheDocument();
  });
});
