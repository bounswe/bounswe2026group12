import { render, screen } from '@testing-library/react';
import CulturalFactCard from '../components/CulturalFactCard';

const FULL = {
  id: 1,
  text: 'Dolma comes from the Turkish verb doldurmak.',
  source_url: 'https://example.com/dolma',
  heritage_group: { id: 1, name: 'Sarma / Dolma' },
  region: { id: 2, name: 'Anatolia' },
};

describe('CulturalFactCard', () => {
  it('renders the fact text and the bulb header', () => {
    render(<CulturalFactCard fact={FULL} />);
    expect(screen.getByText(/did you know/i)).toBeInTheDocument();
    expect(screen.getByText(/dolma comes from the turkish verb/i)).toBeInTheDocument();
  });

  it('renders a source link with the source URL', () => {
    render(<CulturalFactCard fact={FULL} />);
    const link = screen.getByRole('link', { name: /source/i });
    expect(link).toHaveAttribute('href', 'https://example.com/dolma');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('omits the source link when source_url is empty', () => {
    render(<CulturalFactCard fact={{ ...FULL, source_url: '' }} />);
    expect(screen.queryByRole('link', { name: /source/i })).not.toBeInTheDocument();
  });

  it('renders nothing when fact is falsy', () => {
    const { container } = render(<CulturalFactCard fact={null} />);
    expect(container.firstChild).toBeNull();
  });
});
