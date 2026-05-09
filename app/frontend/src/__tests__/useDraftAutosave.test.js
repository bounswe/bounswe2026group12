import { renderHook, act } from '@testing-library/react';
import useDraftAutosave from '../hooks/useDraftAutosave';

beforeEach(() => {
  localStorage.clear();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

describe('useDraftAutosave', () => {
  it('writes state to localStorage after 1500ms debounce when enabled', () => {
    const state = { title: 'My Recipe', description: 'Tasty' };
    renderHook(() => useDraftAutosave('draft:recipe:new', state, { enabled: true }));
    expect(localStorage.getItem('draft:recipe:new')).toBeNull();
    act(() => jest.advanceTimersByTime(1500));
    expect(JSON.parse(localStorage.getItem('draft:recipe:new'))).toEqual(state);
  });

  it('does not write to localStorage when enabled is false', () => {
    const state = { title: 'Draft' };
    renderHook(() => useDraftAutosave('draft:recipe:new', state, { enabled: false }));
    act(() => jest.advanceTimersByTime(2000));
    expect(localStorage.getItem('draft:recipe:new')).toBeNull();
  });

  it('returns savedDraft when a draft exists in localStorage on mount', () => {
    const existing = { title: 'Old Draft', description: 'Saved' };
    localStorage.setItem('draft:recipe:new', JSON.stringify(existing));
    const { result } = renderHook(() =>
      useDraftAutosave('draft:recipe:new', {}, { enabled: true })
    );
    expect(result.current.savedDraft).toEqual(existing);
  });

  it('returns null savedDraft when no draft exists in localStorage', () => {
    const { result } = renderHook(() =>
      useDraftAutosave('draft:story:new', {}, { enabled: true })
    );
    expect(result.current.savedDraft).toBeNull();
  });

  it('clearDraft removes the key from localStorage', () => {
    localStorage.setItem('draft:recipe:new', JSON.stringify({ title: 'x' }));
    const { result } = renderHook(() =>
      useDraftAutosave('draft:recipe:new', {}, { enabled: true })
    );
    act(() => result.current.clearDraft());
    expect(localStorage.getItem('draft:recipe:new')).toBeNull();
  });

  it('clearDraft sets savedDraft to null', () => {
    localStorage.setItem('draft:recipe:new', JSON.stringify({ title: 'x' }));
    const { result } = renderHook(() =>
      useDraftAutosave('draft:recipe:new', {}, { enabled: true })
    );
    act(() => result.current.clearDraft());
    expect(result.current.savedDraft).toBeNull();
  });

  it('debounces: multiple rapid state changes result in one write', () => {
    let state = { title: 'v1' };
    const { rerender } = renderHook(
      ({ s }) => useDraftAutosave('draft:recipe:new', s, { enabled: true }),
      { initialProps: { s: state } }
    );
    rerender({ s: { title: 'v2' } });
    rerender({ s: { title: 'v3' } });
    act(() => jest.advanceTimersByTime(1500));
    expect(JSON.parse(localStorage.getItem('draft:recipe:new'))).toEqual({ title: 'v3' });
  });
});
