import { renderHook } from '@testing-library/react';
import useKeyboardShortcuts from '../hooks/useKeyboardShortcuts';

function dispatchKey(key) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

describe('useKeyboardShortcuts', () => {
  it('invokes the registered handler when its key is pressed', () => {
    const slash = jest.fn();
    renderHook(() => useKeyboardShortcuts({ '/': slash }));
    dispatchKey('/');
    expect(slash).toHaveBeenCalledTimes(1);
  });

  it('does not call any handler for an unregistered key', () => {
    const slash = jest.fn();
    renderHook(() => useKeyboardShortcuts({ '/': slash }));
    dispatchKey('a');
    expect(slash).not.toHaveBeenCalled();
  });

  it('ignores keydown events while focus is inside an input', () => {
    const slash = jest.fn();
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    renderHook(() => useKeyboardShortcuts({ '/': slash }));
    dispatchKey('/');
    expect(slash).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it('removes the keydown listener on unmount', () => {
    const slash = jest.fn();
    const { unmount } = renderHook(() => useKeyboardShortcuts({ '/': slash }));
    unmount();
    dispatchKey('/');
    expect(slash).not.toHaveBeenCalled();
  });

  it('routes different keys to their respective handlers', () => {
    const slash = jest.fn();
    const esc = jest.fn();
    renderHook(() => useKeyboardShortcuts({ '/': slash, Escape: esc }));
    dispatchKey('/');
    dispatchKey('Escape');
    expect(slash).toHaveBeenCalledTimes(1);
    expect(esc).toHaveBeenCalledTimes(1);
  });
});
