import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PassportTimeline from '../components/passport/PassportTimeline';

const events = [
  { id: 1, event_type: 'recipe_tried',    timestamp: '2025-04-20T00:00:00Z', related_recipe: 1, related_story: null },
  { id: 2, event_type: 'story_saved',     timestamp: '2025-04-18T00:00:00Z', related_recipe: null, related_story: 3 },
  { id: 3, event_type: 'stamp_earned',    timestamp: '2025-03-15T00:00:00Z', related_recipe: null, related_story: null },
  { id: 4, event_type: 'quest_completed', timestamp: '2025-02-10T00:00:00Z', related_recipe: null, related_story: null },
  { id: 5, event_type: 'heritage_shared', timestamp: '2025-01-05T00:00:00Z', related_recipe: 2, related_story: null },
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

  it('renders event type labels', () => {
    renderTimeline(events);
    expect(screen.getByText(/recipe tried/i)).toBeInTheDocument();
    expect(screen.getByText(/story saved/i)).toBeInTheDocument();
    expect(screen.getByText(/stamp earned/i)).toBeInTheDocument();
  });

  it('recipe event has link to recipe using id', () => {
    renderTimeline(events);
    const link = screen.getByRole('link', { name: /recipe #1/i });
    expect(link).toHaveAttribute('href', '/recipes/1');
  });

  it('story event has link to story using id', () => {
    renderTimeline(events);
    const link = screen.getByRole('link', { name: /story #3/i });
    expect(link).toHaveAttribute('href', '/stories/3');
  });

  it('stamp_earned event has no link', () => {
    renderTimeline([events[2]]);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('prefers the human-readable description when the backend provides one', () => {
    renderTimeline([
      {
        id: 99,
        event_type: 'stamp_earned',
        description: 'Earned a bronze stamp for Black Sea',
        timestamp: '2026-05-12T00:00:00Z',
        related_recipe: null,
        related_story: null,
      },
    ]);
    expect(screen.getByText(/earned a bronze stamp for black sea/i)).toBeInTheDocument();
    // The raw slug should not leak through when a description is present
    expect(screen.queryByText(/^stamp earned$/i)).not.toBeInTheDocument();
  });

  it('falls back to the event_type slug when description is missing', () => {
    renderTimeline([
      { id: 100, event_type: 'recipe_tried', timestamp: '2026-05-12T00:00:00Z', related_recipe: null, related_story: null },
    ]);
    expect(screen.getByText(/recipe tried/i)).toBeInTheDocument();
  });
});
