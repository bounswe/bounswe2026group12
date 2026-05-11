import React from 'react';
import { render } from '@testing-library/react-native';
import { InlineFieldError } from '../src/components/recipe/InlineFieldError';

describe('Mobile test harness smoke test', () => {
  it('renders the error message when one is provided', () => {
    const { getByText } = render(<InlineFieldError message="Required field" />);
    expect(getByText('Required field')).toBeTruthy();
  });

  it('renders nothing when message is undefined', () => {
    const { queryByText, toJSON } = render(<InlineFieldError />);
    expect(queryByText('Required field')).toBeNull();
    expect(toJSON()).toBeNull();
  });
});
