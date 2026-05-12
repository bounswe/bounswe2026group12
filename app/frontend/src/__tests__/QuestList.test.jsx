import { render, screen } from '@testing-library/react';
import QuestList from '../components/passport/QuestList';

const quests = [
  { id: 1, name: 'Spice Trader',  description: 'Try 5 saffron recipes', progress: 3, target_count: 5, reward_type: 'badge', reward_value: 'Spice badge',   deadline: null,                    completed_at: null },
  { id: 2, name: 'Ramadan Table', description: 'Try 3 Ramadan recipes', progress: 3, target_count: 3, reward_type: 'stamp', reward_value: 'Gold Crescent', deadline: '2025-04-10T00:00:00Z', completed_at: '2025-04-09T00:00:00Z' },
  { id: 3, name: 'Timed Quest',   description: 'Limited time quest',    progress: 1, target_count: 5, reward_type: 'badge', reward_value: 'Badge',          deadline: '2025-12-31T00:00:00Z', completed_at: null },
];

describe('QuestList', () => {
  it('shows empty state when quests is null', () => {
    render(<QuestList quests={null} />);
    expect(screen.getByText(/no quests yet/i)).toBeInTheDocument();
  });

  it('shows empty state when quests is empty', () => {
    render(<QuestList quests={[]} />);
    expect(screen.getByText(/no quests yet/i)).toBeInTheDocument();
  });

  it('renders active quest name and description', () => {
    render(<QuestList quests={[quests[0]]} />);
    expect(screen.getByText('Spice Trader')).toBeInTheDocument();
    expect(screen.getByText(/try 5 saffron recipes/i)).toBeInTheDocument();
  });

  it('active quest shows progress bar', () => {
    const { container } = render(<QuestList quests={[quests[0]]} />);
    expect(container.querySelector('.quest-progress-bar')).toBeInTheDocument();
  });

  it('completed quest (completed_at set) appears in Completed section', () => {
    render(<QuestList quests={quests} />);
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Ramadan Table')).toBeInTheDocument();
  });

  it('time-limited quest shows deadline', () => {
    render(<QuestList quests={[quests[2]]} />);
    expect(screen.getByText(/31 Dec 2025/i)).toBeInTheDocument();
  });

  it('completed quest shows Done badge', () => {
    render(<QuestList quests={[quests[1]]} />);
    expect(screen.getByText(/✓ done/i)).toBeInTheDocument();
  });

  it('accepts the backend event_end field for event quest deadlines', () => {
    // Backend ships `event_end` for time-limited quests; older mock data
    // used `deadline`. The component should accept either.
    render(<QuestList quests={[
      {
        id: 99,
        name: 'Event Quest',
        description: 'Limited time',
        progress: 0,
        target_count: 1,
        reward_type: 'badge',
        reward_value: 'Event',
        event_end: '2026-12-31T00:00:00Z',
        completed_at: null,
      },
    ]} />);
    expect(screen.getByText(/31 Dec 2026/i)).toBeInTheDocument();
  });
});
