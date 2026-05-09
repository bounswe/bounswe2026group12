import { render, screen, fireEvent } from '@testing-library/react';
import DraftRestoreBanner from '../components/DraftRestoreBanner';

describe('DraftRestoreBanner', () => {
  it('renders nothing when draft is null', () => {
    const { container } = render(
      <DraftRestoreBanner draft={null} onRestore={jest.fn()} onDiscard={jest.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the banner when draft is provided', () => {
    render(
      <DraftRestoreBanner
        draft={{ title: 'Saved' }}
        onRestore={jest.fn()}
        onDiscard={jest.fn()}
      />
    );
    expect(screen.getByText(/unsaved draft found/i)).toBeInTheDocument();
  });

  it('calls onRestore with the draft when Restore is clicked', () => {
    const onRestore = jest.fn();
    const draft = { title: 'Saved' };
    render(
      <DraftRestoreBanner draft={draft} onRestore={onRestore} onDiscard={jest.fn()} />
    );
    fireEvent.click(screen.getByRole('button', { name: /restore/i }));
    expect(onRestore).toHaveBeenCalledWith(draft);
  });

  it('calls onDiscard when Discard is clicked', () => {
    const onDiscard = jest.fn();
    render(
      <DraftRestoreBanner
        draft={{ title: 'x' }}
        onRestore={jest.fn()}
        onDiscard={onDiscard}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /discard/i }));
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });
});
