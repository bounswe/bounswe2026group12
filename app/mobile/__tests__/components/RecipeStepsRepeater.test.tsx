import React, { useState } from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import {
  RecipeStepsRepeater,
  trimStepsForPayload,
} from '../../src/components/recipe/RecipeStepsRepeater';

/**
 * Tiny harness so we can drive the controlled repeater through React state
 * and assert what the consumer ultimately holds — closer to how the screens
 * actually use it than re-rendering with a fresh `steps` prop each tap.
 */
function Harness({
  initial,
  onCommit,
}: {
  initial: string[];
  onCommit: (steps: string[]) => void;
}) {
  const [steps, setSteps] = useState<string[]>(initial);
  return (
    <RecipeStepsRepeater
      steps={steps}
      onChange={(next) => {
        setSteps(next);
        onCommit(next);
      }}
    />
  );
}

describe('trimStepsForPayload', () => {
  it('trims whitespace and drops empty rows', () => {
    expect(trimStepsForPayload(['  one  ', '', '\n\t', 'two'])).toEqual(['one', 'two']);
  });

  it('returns an empty array when nothing survives the trim', () => {
    expect(trimStepsForPayload(['', '   ', '\n'])).toEqual([]);
  });
});

describe('RecipeStepsRepeater', () => {
  it('renders the empty hint and no rows when steps is empty', () => {
    const onCommit = jest.fn();
    const { getByText, queryByLabelText } = render(
      <Harness initial={[]} onCommit={onCommit} />,
    );
    expect(getByText(/No steps yet/i)).toBeTruthy();
    expect(queryByLabelText('Step 1 description')).toBeNull();
  });

  it('adds a step when "Add step" is pressed', () => {
    const onCommit = jest.fn();
    const { getByLabelText } = render(<Harness initial={[]} onCommit={onCommit} />);
    fireEvent.press(getByLabelText('Add step'));
    expect(onCommit).toHaveBeenLastCalledWith(['']);
    expect(getByLabelText('Step 1 description')).toBeTruthy();
  });

  it('removes the targeted row', () => {
    const onCommit = jest.fn();
    const { getByLabelText, queryByLabelText } = render(
      <Harness initial={['a', 'b', 'c']} onCommit={onCommit} />,
    );
    fireEvent.press(getByLabelText('Remove step 2'));
    expect(onCommit).toHaveBeenLastCalledWith(['a', 'c']);
    // Renumbered: there are now two rows total.
    expect(getByLabelText('Step 1 description')).toBeTruthy();
    expect(getByLabelText('Step 2 description')).toBeTruthy();
    expect(queryByLabelText('Step 3 description')).toBeNull();
  });

  it('reorders rows with the up control', () => {
    const onCommit = jest.fn();
    const { getByLabelText } = render(
      <Harness initial={['a', 'b', 'c']} onCommit={onCommit} />,
    );
    fireEvent.press(getByLabelText('Move step 3 up'));
    expect(onCommit).toHaveBeenLastCalledWith(['a', 'c', 'b']);
  });

  it('reorders rows with the down control', () => {
    const onCommit = jest.fn();
    const { getByLabelText } = render(
      <Harness initial={['a', 'b', 'c']} onCommit={onCommit} />,
    );
    fireEvent.press(getByLabelText('Move step 1 down'));
    expect(onCommit).toHaveBeenLastCalledWith(['b', 'a', 'c']);
  });

  it('disables move-up on the first row and move-down on the last row', () => {
    const { getByLabelText } = render(
      <Harness initial={['a', 'b']} onCommit={jest.fn()} />,
    );
    expect(getByLabelText('Move step 1 up').props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    );
    expect(getByLabelText('Move step 2 down').props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    );
  });

  it('forwards text edits through onChange', () => {
    const onCommit = jest.fn();
    const { getByLabelText } = render(
      <Harness initial={['initial']} onCommit={onCommit} />,
    );
    fireEvent.changeText(getByLabelText('Step 1 description'), 'updated');
    expect(onCommit).toHaveBeenLastCalledWith(['updated']);
  });
});
