import React from 'react';
import { render } from '@testing-library/react-native';
import { RecipeStepsSection } from '../../src/components/recipe/RecipeStepsSection';

describe('RecipeStepsSection', () => {
  it('renders nothing when steps is empty', () => {
    const { toJSON } = render(<RecipeStepsSection steps={[]} />);
    expect(toJSON()).toBeNull();
  });

  it('renders nothing when steps is undefined (defensive)', () => {
    const { toJSON } = render(<RecipeStepsSection steps={undefined as unknown as string[]} />);
    expect(toJSON()).toBeNull();
  });

  it('renders the heading and a numbered list when steps are present', () => {
    const { getByText } = render(
      <RecipeStepsSection steps={['Chop onions.', 'Sauté until golden.', 'Add tomatoes.']} />,
    );
    expect(getByText('Steps')).toBeTruthy();
    expect(getByText('1')).toBeTruthy();
    expect(getByText('2')).toBeTruthy();
    expect(getByText('3')).toBeTruthy();
    expect(getByText('Chop onions.')).toBeTruthy();
    expect(getByText('Sauté until golden.')).toBeTruthy();
    expect(getByText('Add tomatoes.')).toBeTruthy();
  });

  it('preserves embedded newlines inside a single step', () => {
    const stepWithBreaks = 'Line one.\nLine two.';
    const { getByText } = render(<RecipeStepsSection steps={[stepWithBreaks]} />);
    expect(getByText(stepWithBreaks)).toBeTruthy();
  });
});
