import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StarRating from '../components/StarRating';

describe('StarRating — read-only mode (no onChange)', () => {
  it('shows the average + count summary when given a numeric average', () => {
    render(<StarRating average={4.2} count={17} />);
    expect(screen.getByText('4.2 (17)')).toBeInTheDocument();
  });

  it('renders a "Not rated" hint when no average and no count', () => {
    render(<StarRating average={null} count={0} />);
    expect(screen.getByText(/not rated/i)).toBeInTheDocument();
  });

  it('accepts a string average (DRF DecimalField shape) and renders it as a number', () => {
    render(<StarRating average={'3.7'} count={3} />);
    expect(screen.getByText('3.7 (3)')).toBeInTheDocument();
  });

  it('does NOT render interactive star buttons when onChange is missing', () => {
    render(<StarRating average={3} count={2} />);
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });
});

describe('StarRating — interactive mode (onChange provided)', () => {
  it('renders five radio buttons for stars', () => {
    render(<StarRating average={null} count={0} onChange={() => {}} />);
    expect(screen.getAllByRole('radio')).toHaveLength(5);
  });

  it('calls onChange(score) when a star is clicked', async () => {
    const onChange = jest.fn();
    render(<StarRating userScore={null} average={null} count={0} onChange={onChange} />);
    await userEvent.click(screen.getByRole('radio', { name: /4 stars/i }));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('calls onChange(null) when the user re-clicks their current score (unrate)', async () => {
    const onChange = jest.fn();
    render(<StarRating userScore={3} average={3} count={1} onChange={onChange} />);
    await userEvent.click(screen.getByRole('radio', { name: /3 stars/i }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('still renders interactive when disabledReason is empty', () => {
    render(<StarRating average={null} count={0} onChange={() => {}} disabledReason="" />);
    expect(screen.getAllByRole('radio')).toHaveLength(5);
  });

  it('falls back to read-only when disabledReason is non-empty', async () => {
    const onChange = jest.fn();
    render(<StarRating average={null} count={0} onChange={onChange} disabledReason="Log in to rate." />);
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: /log in to rate/i })).toBeInTheDocument();
  });
});
