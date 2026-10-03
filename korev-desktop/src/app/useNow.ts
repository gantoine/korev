import { useCallback, useSyncExternalStore } from 'react';

export const SECOND_MS = 1000;
export const MINUTE_MS = 60 * SECOND_MS;

function floorTo(time: number, step: number): number {
  return Math.floor(time / step) * step;
}

export function useNow(intervalMs: number): number {
  const subscribe = useCallback(
    (onTick: () => void) => {
      const timer = setInterval(onTick, intervalMs);
      return () => clearInterval(timer);
    },
    [intervalMs],
  );
  return useSyncExternalStore(subscribe, () => floorTo(Date.now(), intervalMs));
}
