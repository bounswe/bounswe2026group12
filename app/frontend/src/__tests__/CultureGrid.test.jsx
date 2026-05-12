import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CultureGrid from '../components/passport/CultureGrid';

const cultures = [
  { id: 1, name: 'Ottoman',   emblem: '🕌', stamp_rarity: 'gold',   recipe_count: 5, story_count: 2, heritage_count: 1, ingredients_count: 10, favorite_dish: 'Baklava', upgrade_progress: 70, upgrade_max: 100 },
  { id: 2, name: 'Aegean',    emblem: '🫒', stamp_rarity: 'silver', recipe_count: 3, story_count: 1, heritage_count: 0, ingredients_count: 6,  favorite_dish: 'Zeytinyağlı', upgrade_progress: 40, upgrade_max: 100 },
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
    expect(screen.getByText('Baklava')).toBeInTheDocument();
  });

  it('detail panel shows stat values', async () => {
    render(<CultureGrid cultures={cultures} />);
    await userEvent.click(screen.getByRole('button', { name: /ottoman/i }));
    expect(screen.getByText('5')).toBeInTheDocument(); // recipe_count
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
