import { render, screen } from '@testing-library/react';
import Toast from '../components/Toast';

describe('Toast', () => {
  it('renders success message', () => {
    render(<Toast message="Recipe saved!" type="success" />);
    expect(screen.getByText('Recipe saved!')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('toast-success');
  });

  it('renders error message', () => {
    render(<Toast message="Something went wrong." type="error" />);
    expect(screen.getByText('Something went wrong.')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('toast-error');
  });

  it('renders nothing when message is empty', () => {
    const { container } = render(<Toast message="" type="success" />);
    expect(container.firstChild).toBeNull();
  });
});
