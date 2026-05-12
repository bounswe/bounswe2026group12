import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CultureGrid from '../components/passport/CultureGrid';

const cultures = [
  { culture: 'Ottoman', rarity: 'gold',   recipes_tried: 5, stories_saved: 2, interactions: 10 },
  { culture: 'Aegean',  rarity: 'silver', recipes_tried: 3, stories_saved: 1, interactions: 6  },
];

describe('CultureGrid', () => {
  it('shows empty state when cultures is null', () => {
    render(<CultureGrid cultures={null} />);
    expect(screen.getByText(/no cultures discovered yet/i)).toBeInTheDocument();
  });

  it('shows empty state when cultures is empty', () => {
    render(<CultureGrid cultures={[]} />);
    expect(screen.getByText(/no cultures discovered yet/i)).toBeInTheDocument();
  });

  it('renders culture card names', () => {
    render(<CultureGrid cultures={cultures} />);
    expect(screen.getByText('Ottoman')).toBeInTheDocument();
    expect(screen.getByText('Aegean')).toBeInTheDocument();
  });

  it('clicking a card opens the detail panel', async () => {
    render(<CultureGrid cultures={cultures} />);
    await userEvent.click(screen.getByRole('button', { name: /ottoman/i }));
    expect(screen.getByRole('region', { name: /ottoman details/i })).toBeInTheDocument();
  });

  it('detail panel shows recipes_tried value', async () => {
    render(<CultureGrid cultures={cultures} />);
    await userEvent.click(screen.getByRole('button', { name: /ottoman/i }));
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('close button hides the detail panel', async () => {
    render(<CultureGrid cultures={cultures} />);
    await userEvent.click(screen.getByRole('button', { name: /ottoman/i }));
    await userEvent.click(screen.getByRole('button', { name: /close culture details/i }));
    expect(screen.queryByRole('region', { name: /ottoman details/i })).not.toBeInTheDocument();
  });

  it('clicking same card twice closes the panel', async () => {
    render(<CultureGrid cultures={cultures} />);
    await userEvent.click(screen.getByRole('button', { name: /ottoman/i }));
    await userEvent.click(screen.getByRole('button', { name: /ottoman/i }));
    expect(screen.queryByRole('region', { name: /ottoman details/i })).not.toBeInTheDocument();
  });
});
