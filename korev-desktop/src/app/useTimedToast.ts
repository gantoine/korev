import { useEffect, useState } from 'react';

export interface TimedToast<T> {
  toast: T | null;
  show: (toast: T) => void;
  dismiss: () => void;
}

export function useTimedToast<T>(durationMs: number): TimedToast<T> {
  const [toast, setToast] = useState<T | null>(null);
  useEffect(() => {
    if (toast === null) return;
    const timer = setTimeout(() => setToast(null), durationMs);
    return () => clearTimeout(timer);
  }, [toast, durationMs]);
  return { toast, show: setToast, dismiss: () => setToast(null) };
}
