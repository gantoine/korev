import { afterEach, describe, expect, it, vi } from 'vitest';
import { IpcChannel } from '../shared/ipc-contract';
import { createMemoryFileSystem } from './file-system';
import { githubEndpoints } from './github/config';
import { type CannedResponse, createFakeFetch } from './github/test-fetch';
import { createKorev, type Korev } from './korev';
import type { SecretCipher } from './token-store';

const VIEWER = { login: 'maria', avatarUrl: 'https://example.test/maria.png' };
const EMPTY_SEARCH = {
  pageInfo: { hasNextPage: false, endCursor: null },
  nodes: [],
};

const plainCipher: SecretCipher = {
  isAvailable: async () => true,
  storageBackend: () => 'keychain',
  encrypt: async (plainText) => Buffer.from(plainText),
  decrypt: async (encrypted) => ({
    result: encrypted.toString(),
    shouldReEncrypt: false,
  }),
};

const viewerResponse: CannedResponse = {
  headers: { 'X-OAuth-Scopes': 'repo, read:org' },
  body: { data: { viewer: VIEWER } },
};

const teamsResponse: CannedResponse = {
  body: { data: { viewer: { organizations: { nodes: [] } } } },
};

function inboxResponse(nameWithOwner: string): CannedResponse {
  return {
    body: {
      data: {
        viewer: VIEWER,
        repo0: { nameWithOwner, viewerPermission: 'WRITE', isArchived: false },
        mine: EMPTY_SEARCH,
        reviews: EMPTY_SEARCH,
      },
    },
  };
}

let running: Korev | null = null;

function setup(...replies: CannedResponse[]) {
  const fake = createFakeFetch(...replies);
  const broadcast = vi.fn();
  const korev = createKorev({
    userDataPath: '/user-data',
    fs: createMemoryFileSystem(),
    cipher: plainCipher,
    fetch: fake.fetch,
    github: githubEndpoints(true, {}),
    sleep: async () => undefined,
    openExternal: async () => undefined,
    applyTheme: () => undefined,
    broadcast,
    warn: () => undefined,
  });
  const invoke = (channel: IpcChannel, ...args: unknown[]) =>
    (korev.handlers[channel] as (...values: unknown[]) => unknown)(...args);
  const settingsBroadcasts = () =>
    broadcast.mock.calls
      .filter(([channel]) => channel === IpcChannel.SettingsChanged)
      .map(([, settings]) => settings);
  running = korev;
  return { korev, invoke, settingsBroadcasts };
}

afterEach(() => {
  running?.inbox.stop();
  running = null;
});

describe('korev', () => {
  it('broadcasts the settings after a setter changes them', async () => {
    const { korev, invoke, settingsBroadcasts } = setup();
    await korev.start();

    await invoke(IpcChannel.SettingsSetTheme, 'dark');

    expect(settingsBroadcasts()).toEqual([
      expect.objectContaining({ theme: 'dark' }),
    ]);
  });

  it('saves and broadcasts the new name when a selected repo was renamed', async () => {
    const { korev, invoke, settingsBroadcasts } = setup(
      viewerResponse,
      inboxResponse('acme/api-v2'),
      teamsResponse,
      inboxResponse('acme/api-v2'),
    );
    await korev.start();
    await invoke(IpcChannel.AuthUseToken, 'ghp_token');

    await invoke(IpcChannel.SettingsSetRepos, ['acme/api']);

    await vi.waitFor(() =>
      expect(korev.settings.current().repos).toEqual(['acme/api-v2']),
    );
    expect(settingsBroadcasts().map((settings) => settings.repos)).toEqual([
      ['acme/api'],
      ['acme/api-v2'],
    ]);
  });
});
