import { render, screen } from '@testing-library/react';
import StampGrid from '../components/passport/StampGrid';

const stamps = [
  { id: 1, name: 'First Recipe',     category: 'Recipe',    rarity: 'bronze',    earned_at: '2025-01-01T00:00:00Z', locked: false, progress: 1,  max_progress: 1  },
  { id: 2, name: 'Ottoman Explorer', category: 'Heritage',  rarity: 'gold',      earned_at: '2025-02-01T00:00:00Z', locked: false, progress: 10, max_progress: 10 },
  { id: 3, name: 'Community Pillar', category: 'Community', rarity: 'legendary', earned_at: null,                    locked: true,  progress: 2,  max_progress: 20 },
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

  it('renders stamp names', () => {
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

  it('locked stamp has locked CSS class', () => {
    const { container } = render(<StampGrid stamps={stamps} />);
    const locked = container.querySelector('.stamp-card--locked');
    expect(locked).toBeInTheDocument();
  });

  it('unlocked stamp does not have locked class', () => {
    render(<StampGrid stamps={stamps} />);
    const cards = document.querySelectorAll('.stamp-card:not(.stamp-card--locked)');
    expect(cards.length).toBe(2);
  });

  it('progress bar fill width is 100% for complete stamp', () => {
    const { container } = render(<StampGrid stamps={[stamps[0]]} />);
    const fill = container.querySelector('.stamp-card-progress-fill');
    expect(fill.style.width).toBe('100%');
  });

  it('progress bar fill is proportional for partial stamp', () => {
    const { container } = render(<StampGrid stamps={[stamps[2]]} />);
    const fill = container.querySelector('.stamp-card-progress-fill');
    expect(fill.style.width).toBe('10%');
  });
});
