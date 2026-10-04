import { useEffect, useRef } from 'react';

export type ShortcutMap = Partial<Record<string, () => void>>;

const TEXT_ENTRY_SELECTOR = 'input, textarea, select, [contenteditable="true"]';

export function isTextEntry(target: EventTarget | null): boolean {
  return (
    target instanceof Element && target.closest(TEXT_ENTRY_SELECTOR) !== null
  );
}

export function hasCommandModifier(event: {
  metaKey: boolean;
  ctrlKey: boolean;
}): boolean {
  return event.metaKey || event.ctrlKey;
}

function isPlainKey(event: KeyboardEvent): boolean {
  return !hasCommandModifier(event) && !event.altKey;
}

export function useKeyShortcuts(shortcuts: ShortcutMap) {
  const latest = useRef(shortcuts);
  useEffect(() => {
    latest.current = shortcuts;
  });
  useEffect(() => {
    const runShortcut = (event: KeyboardEvent) => {
      if (event.defaultPrevented || !isPlainKey(event)) return;
      if (isTextEntry(event.target)) return;
      const shortcut = latest.current[event.key];
      if (!shortcut) return;
      event.preventDefault();
      shortcut();
    };
    window.addEventListener('keydown', runShortcut);
    return () => window.removeEventListener('keydown', runShortcut);
  }, []);
}
