import { useEffect, useRef } from 'react';

export default function useKeyboardShortcuts(shortcuts) {
  const shortcutsRef = useRef(shortcuts);
  useEffect(() => { shortcutsRef.current = shortcuts; });

  useEffect(() => {
    function handler(e) {
      const tag = document.activeElement?.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
      const fn = shortcutsRef.current[e.key];
      if (fn) { e.preventDefault(); fn(e); }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []); // registered once; shortcutsRef always holds the latest map
}
