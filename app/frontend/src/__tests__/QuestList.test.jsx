import { render, screen } from '@testing-library/react';
import QuestList from '../components/passport/QuestList';

const quests = [
  { id: 1, name: 'Spice Trader',  description: 'Try 5 saffron recipes', progress: 3, max_progress: 5,  reward: 'Spice badge',  deadline: null,                    completed: false },
  { id: 2, name: 'Ramadan Table', description: 'Try 3 Ramadan recipes', progress: 3, max_progress: 3,  reward: 'Gold Crescent', deadline: '2025-04-10T00:00:00Z', completed: true  },
  { id: 3, name: 'Timed Quest',   description: 'Limited time quest',    progress: 1, max_progress: 5,  reward: 'Badge',         deadline: '2025-12-31T00:00:00Z', completed: false },
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

  it('completed quest appears in Completed section', () => {
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
});
