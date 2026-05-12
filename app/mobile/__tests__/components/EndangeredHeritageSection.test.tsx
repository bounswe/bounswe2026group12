import React from 'react';
import { render } from '@testing-library/react-native';
import { EndangeredHeritageSection } from '../../src/components/heritage/EndangeredHeritageSection';

describe('EndangeredHeritageSection', () => {
  it("renders nothing when status is 'none' and notes are empty", () => {
    const { toJSON } = render(<EndangeredHeritageSection status="none" notes={[]} />);
    expect(toJSON()).toBeNull();
  });

  it('renders nothing when status is null/undefined and there are no notes', () => {
    const { toJSON } = render(
      <EndangeredHeritageSection status={null as any} notes={[]} />,
    );
    expect(toJSON()).toBeNull();
  });

  it('renders the endangered badge and blurb for status=endangered', () => {
    const { getByText } = render(
      <EndangeredHeritageSection status="endangered" notes={[]} />,
    );
    expect(getByText('ENDANGERED')).toBeTruthy();
    expect(getByText(/at risk of being lost/i)).toBeTruthy();
  });

  it('renders sourced notes even when status is none', () => {
    const notes = [
      { id: 1, text: 'Historic kebab references in 1453.', source_url: 'https://example.com/1' },
      { id: 2, text: 'Another sourced fact.', source_url: '' },
    ];
    const { getByText, getAllByText } = render(
      <EndangeredHeritageSection status="none" notes={notes} />,
    );
    expect(getByText('Sourced notes')).toBeTruthy();
    expect(getByText('Historic kebab references in 1453.')).toBeTruthy();
    expect(getByText('Another sourced fact.')).toBeTruthy();
    // Only the note with a source_url gets a Source pill.
    expect(getAllByText('Source ↗')).toHaveLength(1);
  });
});
