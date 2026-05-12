import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PassportTimeline from '../components/passport/PassportTimeline';

const events = [
  { id: 1, type: 'recipe_tried',    date: '2025-04-20T00:00:00Z', description: 'Tried Baklava',      recipe_id: 1, recipe_title: 'Baklava', story_id: null },
  { id: 2, type: 'story_saved',     date: '2025-04-18T00:00:00Z', description: 'Saved a story',      recipe_id: null, story_id: 3, story_title: "Grandma's Kitchen" },
  { id: 3, type: 'stamp_earned',    date: '2025-03-15T00:00:00Z', description: 'Earned a stamp',     recipe_id: null, story_id: null },
  { id: 4, type: 'quest_completed', date: '2025-02-10T00:00:00Z', description: 'Quest done',         recipe_id: null, story_id: null },
  { id: 5, type: 'heritage_shared', date: '2025-01-05T00:00:00Z', description: 'Shared heritage',    recipe_id: 2, recipe_title: 'Pilaf', story_id: null },
];

function renderTimeline(evts) {
  return render(<MemoryRouter><PassportTimeline events={evts} /></MemoryRouter>);
}

describe('PassportTimeline', () => {
  it('shows empty state when events is null', () => {
    renderTimeline(null);
    expect(screen.getByText(/no passport events yet/i)).toBeInTheDocument();
  });

  it('shows empty state when events is empty', () => {
    renderTimeline([]);
    expect(screen.getByText(/no passport events yet/i)).toBeInTheDocument();
  });

  it('renders all event descriptions', () => {
    renderTimeline(events);
    expect(screen.getByText(/tried baklava/i)).toBeInTheDocument();
    expect(screen.getByText(/saved a story/i)).toBeInTheDocument();
    expect(screen.getByText(/earned a stamp/i)).toBeInTheDocument();
  });

  it('recipe_tried event has link to recipe', () => {
    renderTimeline(events);
    const link = screen.getByRole('link', { name: /baklava/i });
    expect(link).toHaveAttribute('href', '/recipes/1');
  });

  it('story_saved event has link to story', () => {
    renderTimeline(events);
    const link = screen.getByRole('link', { name: /grandma/i });
    expect(link).toHaveAttribute('href', '/stories/3');
  });

  it('stamp_earned event has no link', () => {
    renderTimeline([events[2]]);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
