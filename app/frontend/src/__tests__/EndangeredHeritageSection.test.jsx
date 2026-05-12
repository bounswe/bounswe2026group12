import { render, screen } from '@testing-library/react';
import EndangeredHeritageSection from '../components/EndangeredHeritageSection';

describe('EndangeredHeritageSection', () => {
  it('renders the status info box with blurb for an endangered recipe', () => {
    render(<EndangeredHeritageSection status="endangered" notes={[]} />);
    expect(screen.getByText(/endangered/i)).toBeInTheDocument();
    expect(screen.getByText(/at risk of being lost/i)).toBeInTheDocument();
  });

  it('renders sourced notes as a list with source links', () => {
    const notes = [
      { id: 1, text: 'Recipe almost lost after 1923.', source_url: 'https://example.com/ref' },
      { id: 2, text: 'Recovered through oral history.', source_url: '' },
    ];
    render(<EndangeredHeritageSection status="endangered" notes={notes} />);
    expect(screen.getByText(/recipe almost lost after 1923/i)).toBeInTheDocument();
    expect(screen.getByText(/recovered through oral history/i)).toBeInTheDocument();
    const sourceLink = screen.getByRole('link', { name: /source ↗/i });
    expect(sourceLink).toHaveAttribute('href', 'https://example.com/ref');
    expect(sourceLink).toHaveAttribute('target', '_blank');
  });

  it('renders nothing when status is "none" and no notes', () => {
    const { container } = render(<EndangeredHeritageSection status="none" notes={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing for missing status and missing notes', () => {
    const { container } = render(<EndangeredHeritageSection status={null} notes={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('still renders notes when status is "none"', () => {
    const notes = [{ id: 3, text: 'A standalone heritage note.', source_url: '' }];
    render(<EndangeredHeritageSection status="none" notes={notes} />);
    expect(screen.getByText(/standalone heritage note/i)).toBeInTheDocument();
  });
});
