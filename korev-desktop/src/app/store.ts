import type { Unsubscribe } from '../shared/ipc-contract';

export interface BridgeSource<T> {
  load(): Promise<T>;
  watch?(listener: (value: T) => void): Unsubscribe;
}

export interface BridgeStore<T> {
  subscribe(listener: () => void): Unsubscribe;
  getSnapshot(): T | null;
  set(value: T): void;
}

export function createBridgeStore<T>(
  source: () => BridgeSource<T>,
): BridgeStore<T> {
  const listeners = new Set<() => void>();
  let value: T | null = null;
  let generation = 0;
  let lastWriteGeneration = -1;
  let stopWatching: Unsubscribe | null = null;

  function publish(next: T) {
    value = next;
    listeners.forEach((listener) => listener());
  }

  function set(next: T) {
    lastWriteGeneration = generation;
    publish(next);
  }

  function isStale(startedAt: number): boolean {
    return startedAt !== generation || lastWriteGeneration === generation;
  }

  function start() {
    const startedAt = ++generation;
    const { load, watch } = source();
    stopWatching = watch?.(set) ?? null;
    void load().then((loaded) => {
      if (isStale(startedAt)) return;
      publish(loaded);
    });
  }

  function stop() {
    generation++;
    stopWatching?.();
    stopWatching = null;
    value = null;
  }

  function subscribe(listener: () => void): Unsubscribe {
    listeners.add(listener);
    if (listeners.size === 1) start();
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) stop();
    };
  }

  return { subscribe, getSnapshot: () => value, set };
}
