import React from 'react';
import { render } from '@testing-library/react-native';
import { DidYouKnowSection } from '../../src/components/cultural/DidYouKnowSection';
import type { CulturalFact } from '../../src/services/culturalFactService';

const makeFact = (over: Partial<CulturalFact> = {}): CulturalFact => ({
  id: 1,
  text: 'Saffron once cost more than gold by weight.',
  source_url: 'https://example.com/saffron',
  heritage_group: null,
  region: null,
  ...over,
});

describe('DidYouKnowSection', () => {
  it('returns null when there are no facts', () => {
    const { toJSON } = render(<DidYouKnowSection facts={[]} />);
    expect(toJSON()).toBeNull();
  });

  it('renders the heading and each fact text', () => {
    const facts = [
      makeFact({ id: 1, text: 'Fact one' }),
      makeFact({ id: 2, text: 'Fact two', source_url: '' }),
    ];
    const { getByText, getAllByText } = render(<DidYouKnowSection facts={facts} />);
    expect(getByText('Did you know')).toBeTruthy();
    expect(getByText('Fact one')).toBeTruthy();
    expect(getByText('Fact two')).toBeTruthy();
    // Only the fact with a source_url shows a Source pill.
    expect(getAllByText('Source ↗')).toHaveLength(1);
  });

  it('exposes a recognisable accessibility label on the section', () => {
    const { getByLabelText } = render(
      <DidYouKnowSection facts={[makeFact()]} />,
    );
    expect(getByLabelText('Cultural context facts')).toBeTruthy();
  });
});
