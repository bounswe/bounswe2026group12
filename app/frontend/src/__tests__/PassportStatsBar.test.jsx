import { render, screen } from '@testing-library/react';
import PassportStatsBar from '../components/passport/PassportStatsBar';

const mockStats = {
  level: 3,
  level_name: 'Street Food Explorer',
  cultures_count: 7,
  recipes_tried: 24,
  stories_saved: 11,
  heritage_shared: 3,
};

describe('PassportStatsBar', () => {
  it('renders skeleton without crashing when stats is null', () => {
    const { container } = render(<PassportStatsBar stats={null} />);
    expect(container.querySelector('.passport-stats-bar--skeleton')).toBeInTheDocument();
  });

  it('renders all 4 metric values from stats', () => {
    render(<PassportStatsBar stats={mockStats} />);
    expect(screen.getByText('7')).toBeInTheDocument();  // cultures
    expect(screen.getByText('24')).toBeInTheDocument(); // recipes_tried
    expect(screen.getByText('11')).toBeInTheDocument(); // stories_saved
    expect(screen.getByText('3')).toBeInTheDocument();  // heritage_shared
  });

  it('renders level badge with correct level class', () => {
    const { container } = render(<PassportStatsBar stats={mockStats} />);
    expect(container.querySelector('.level-gold')).toBeInTheDocument();
  });

  it('renders level 1 badge with bronze class', () => {
    const { container } = render(<PassportStatsBar stats={{ ...mockStats, level: 1 }} />);
    expect(container.querySelector('.level-bronze')).toBeInTheDocument();
  });

  it('renders zero values without crashing', () => {
    render(<PassportStatsBar stats={{ level: 1, cultures_count: 0, recipes_tried: 0, stories_saved: 0, heritage_shared: 0 }} />);
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(4);
  });
});
