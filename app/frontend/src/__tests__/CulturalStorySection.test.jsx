import { render, screen } from '@testing-library/react';
import CulturalStorySection from '../components/CulturalStorySection';

describe('CulturalStorySection', () => {
  it('renders only the filled fields', () => {
    render(
      <CulturalStorySection
        culturalContext={{
          identity_note: 'This dish is how I know home.',
          memory_note: '',
          migration_note: 'Brought from the Black Sea in the 1920s.',
          ritual_note: '',
          commensality_note: '',
          terroir_note: '',
          craft_note: '',
        }}
      />,
    );
    expect(screen.getByRole('heading', { name: /beyond the recipe/i })).toBeInTheDocument();
    expect(screen.getByText(/this dish is how i know home/i)).toBeInTheDocument();
    expect(screen.getByText(/brought from the black sea/i)).toBeInTheDocument();
    // Empty fields don't render labels.
    expect(screen.queryByText(/a personal memory/i)).toBeNull();
    expect(screen.queryByText(/the craft/i)).toBeNull();
  });

  it('renders nothing when every field is blank or whitespace-only', () => {
    const { container } = render(
      <CulturalStorySection
        culturalContext={{
          identity_note: '   ',
          memory_note: '',
          migration_note: '',
        }}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing for null / undefined cultural context', () => {
    expect(render(<CulturalStorySection culturalContext={null} />).container.firstChild).toBeNull();
    expect(render(<CulturalStorySection culturalContext={undefined} />).container.firstChild).toBeNull();
  });

  it('preserves embedded newlines inside a single field', () => {
    render(
      <CulturalStorySection
        culturalContext={{
          memory_note: 'Line one.\nLine two.',
        }}
      />,
    );
    expect(screen.getByText(/line one\.\s+line two\./i)).toBeInTheDocument();
  });
});
