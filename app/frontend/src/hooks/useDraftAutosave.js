import { useState, useEffect, useRef } from 'react';

export default function useDraftAutosave(key, state, { enabled }) {
  const [savedDraft, setSavedDraft] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const timerRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(state));
      } catch {
        // localStorage quota exceeded — silently skip
      }
    }, 1500);
    return () => clearTimeout(timerRef.current);
  }, [key, state, enabled]);

  function clearDraft() {
    localStorage.removeItem(key);
    setSavedDraft(null);
  }

  return { savedDraft, clearDraft };
}
