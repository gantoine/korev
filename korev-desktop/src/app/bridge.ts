import type { KorevBridge } from '../shared/ipc-contract';

declare global {
  interface Window {
    korev: KorevBridge;
  }
}

export function korev(): KorevBridge {
  return window.korev;
}
