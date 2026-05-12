import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StepsEditor from '../components/StepsEditor';

describe('StepsEditor', () => {
  it('renders with an empty list when value is []', () => {
    render(<StepsEditor value={[]} onChange={() => {}} />);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add step/i })).toBeInTheDocument();
  });

  it('renders one numbered textarea per step', () => {
    render(<StepsEditor value={['First', 'Second', 'Third']} onChange={() => {}} />);
    expect(screen.getByLabelText('Step 1')).toHaveValue('First');
    expect(screen.getByLabelText('Step 2')).toHaveValue('Second');
    expect(screen.getByLabelText('Step 3')).toHaveValue('Third');
  });

  it('calls onChange with the new array when "Add step" is clicked', async () => {
    const onChange = jest.fn();
    render(<StepsEditor value={['First']} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /add step/i }));
    expect(onChange).toHaveBeenCalledWith(['First', '']);
  });

  it('calls onChange with the row removed when "Remove" is clicked', async () => {
    const onChange = jest.fn();
    render(<StepsEditor value={['First', 'Second', 'Third']} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /remove step 2/i }));
    expect(onChange).toHaveBeenCalledWith(['First', 'Third']);
  });

  it('moves a step up when "Move step N up" is clicked', async () => {
    const onChange = jest.fn();
    render(<StepsEditor value={['First', 'Second', 'Third']} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /move step 2 up/i }));
    expect(onChange).toHaveBeenCalledWith(['Second', 'First', 'Third']);
  });

  it('moves a step down when "Move step N down" is clicked', async () => {
    const onChange = jest.fn();
    render(<StepsEditor value={['First', 'Second', 'Third']} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /move step 2 down/i }));
    expect(onChange).toHaveBeenCalledWith(['First', 'Third', 'Second']);
  });

  it('disables "up" on the first row and "down" on the last row', () => {
    render(<StepsEditor value={['Only one', 'Two', 'Three']} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /move step 1 up/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /move step 3 down/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /move step 2 up/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /move step 2 down/i })).not.toBeDisabled();
  });

  it('calls onChange with the typed value when the textarea content changes', () => {
    const onChange = jest.fn();
    render(<StepsEditor value={['First']} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Step 1'), { target: { value: 'First updated' } });
    expect(onChange).toHaveBeenCalledWith(['First updated']);
  });

  it('treats non-array values as an empty list', () => {
    render(<StepsEditor value={null} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /add step/i })).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});
