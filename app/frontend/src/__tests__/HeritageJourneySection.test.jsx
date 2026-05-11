import { render, screen } from '@testing-library/react';
import HeritageJourneySection from '../components/HeritageJourneySection';

const STEPS = [
  { id: 1, order: 1, location: 'Central Asia', story: 'Nomadic Turkic ground meat.', era: 'Pre-Ottoman' },
  { id: 2, order: 2, location: 'Anatolia', story: 'Dozens of variations.', era: '' },
  { id: 3, order: 3, location: 'Sweden', story: 'Brought back as köttbullar.', era: '1700s' },
];

describe('HeritageJourneySection', () => {
  it('renders nothing when steps is empty', () => {
    const { container } = render(<HeritageJourneySection steps={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when steps is undefined', () => {
    const { container } = render(<HeritageJourneySection />);
    expect(container.firstChild).toBeNull();
  });

  it('renders one card per step with location, story, era', () => {
    render(<HeritageJourneySection steps={STEPS} />);
    expect(screen.getByRole('heading', { name: /journey/i })).toBeInTheDocument();
    expect(screen.getByText('Central Asia')).toBeInTheDocument();
    expect(screen.getByText('Anatolia')).toBeInTheDocument();
    expect(screen.getByText('Sweden')).toBeInTheDocument();
    expect(screen.getByText(/nomadic turkic/i)).toBeInTheDocument();
    expect(screen.getByText('Pre-Ottoman')).toBeInTheDocument();
    expect(screen.getByText('1700s')).toBeInTheDocument();
  });

  it('sorts steps by order ascending regardless of input order', () => {
    const shuffled = [STEPS[2], STEPS[0], STEPS[1]];
    render(<HeritageJourneySection steps={shuffled} />);
    const locations = screen.getAllByTestId('journey-step-location').map((n) => n.textContent);
    expect(locations).toEqual(['Central Asia', 'Anatolia', 'Sweden']);
  });

  it('does not render an era badge when era is empty', () => {
    render(<HeritageJourneySection steps={[STEPS[1]]} />);
    expect(screen.queryByTestId('journey-step-era')).not.toBeInTheDocument();
  });
});
