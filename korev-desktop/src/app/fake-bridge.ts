import { vi } from 'vitest';
import type { AuthState } from '../shared/auth';
import type { InboxSnapshot } from '../shared/inbox';
import type { AppCommand, KorevBridge } from '../shared/ipc-contract';
import type { Settings } from '../shared/settings';
import {
  CONNECTED_AUTH,
  WATCHING_SETTINGS,
  makeSnapshot,
} from './test-fixtures';

export interface FakeBridgeOptions {
  snapshot?: InboxSnapshot;
  auth?: AuthState;
  settings?: Settings;
  suggestedRepos?: string[];
}

export interface FakeBridge {
  bridge: KorevBridge;
  emitInbox: (snapshot: InboxSnapshot) => void;
  emitCommand: (command: AppCommand) => void;
  stopInbox: ReturnType<typeof vi.fn>;
}

export function installFakeBridge({
  snapshot = makeSnapshot(),
  auth = CONNECTED_AUTH,
  settings = WATCHING_SETTINGS,
  suggestedRepos = [],
}: FakeBridgeOptions = {}): FakeBridge {
  const inboxListeners = new Set<(next: InboxSnapshot) => void>();
  const stopInbox = vi.fn();
  const commandListeners = new Set<(command: AppCommand) => void>();
  const bridge: KorevBridge = {
    inbox: {
      load: vi.fn(async () => snapshot),
      refresh: vi.fn(async () => undefined),
      onUpdated: vi.fn((listener) => {
        inboxListeners.add(listener);
        return () => {
          inboxListeners.delete(listener);
          stopInbox();
        };
      }),
    },
    auth: {
      getState: vi.fn(async () => auth),
      startDeviceFlow: vi.fn(async () => auth.login),
      cancelDeviceFlow: vi.fn(async () => undefined),
      useToken: vi.fn(async () => ({ ok: false as const, message: 'nope' })),
      disconnect: vi.fn(async () => undefined),
      onChanged: vi.fn(() => () => undefined),
    },
    settings: {
      load: vi.fn(async () => settings),
      setRepos: vi.fn(async (repos: string[]) => ({ ...settings, repos })),
      setTheme: vi.fn(async (theme) => ({ ...settings, theme })),
      setLastView: vi.fn(async (lastView) => ({ ...settings, lastView })),
      suggestedRepos: vi.fn(async () => suggestedRepos),
    },
    shell: { openGithub: vi.fn(async () => undefined) },
    app: {
      onCommand: vi.fn((listener) => {
        commandListeners.add(listener);
        return () => commandListeners.delete(listener);
      }),
    },
  };
  window.korev = bridge;
  return {
    bridge,
    emitInbox: (next) => inboxListeners.forEach((listener) => listener(next)),
    emitCommand: (command) =>
      commandListeners.forEach((listener) => listener(command)),
    stopInbox,
  };
}

export function installMatchMedia(matches = false) {
  window.matchMedia = vi.fn((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(() => false),
  }));
}
