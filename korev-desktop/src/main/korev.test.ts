import { afterEach, describe, expect, it, vi } from 'vitest';
import { IpcChannel } from '../shared/ipc-contract';
import { createMemoryFileSystem } from './file-system';
import { githubEndpoints } from './github/config';
import { emptySnapshot } from './github/inbox-poller';
import {
  type CannedReply,
  type CannedResponse,
  createFakeFetch,
} from './github/test-fetch';
import { createKorev, type Korev } from './korev';
import type { SecretCipher } from './encrypted-file';

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

const USER_DATA = '/user-data';
const CACHED_PR_TITLE = 'Cached from the last session';

const neverAnswers: CannedReply = () => new Promise(() => undefined);

function previousSession(): Record<string, string> {
  const snapshot = {
    ...emptySnapshot(1),
    status: 'live',
    syncedAt: '2026-10-02T18:40:00.000Z',
    viewerLogin: VIEWER.login,
    reviews: [
      {
        kind: 'pr',
        item: { pr: { title: CACHED_PR_TITLE } },
      },
    ],
  };
  return {
    [`${USER_DATA}/settings.json`]: JSON.stringify({ repos: ['acme/api'] }),
    [`${USER_DATA}/github-token.bin`]: JSON.stringify({
      token: 'gho_saved',
      method: 'oauth',
      login: VIEWER.login,
      avatarUrl: null,
    }),
    [`${USER_DATA}/inbox-cache.bin`]: JSON.stringify({ version: 1, snapshot }),
  };
}

let running: Korev | null = null;

function setup(
  replies: CannedReply[] = [],
  files: Record<string, string> = {},
) {
  const fake = createFakeFetch(...replies);
  const broadcast = vi.fn();
  const fs = createMemoryFileSystem(files);
  const korev = createKorev({
    userDataPath: USER_DATA,
    fs,
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
  return { korev, fs, invoke, settingsBroadcasts };
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
    const { korev, invoke, settingsBroadcasts } = setup([
      viewerResponse,
      inboxResponse('acme/api-v2'),
      teamsResponse,
      inboxResponse('acme/api-v2'),
    ]);
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

  it('shows the cached inbox from the last session while the first sync runs', async () => {
    const { korev, invoke } = setup([neverAnswers], previousSession());

    await korev.start();

    expect(await invoke(IpcChannel.AuthGetState)).toMatchObject({
      connection: { login: VIEWER.login },
    });
    expect(await invoke(IpcChannel.InboxLoad)).toMatchObject({
      status: 'syncing',
      fromCache: true,
      reviews: [{ item: { pr: { title: CACHED_PR_TITLE } } }],
    });
  });

  it('deletes the cached inbox on disconnect', async () => {
    const { korev, fs, invoke } = setup([neverAnswers], previousSession());
    await korev.start();

    await invoke(IpcChannel.AuthDisconnect);

    await vi.waitFor(() =>
      expect(fs.files.has(`${USER_DATA}/inbox-cache.bin`)).toBe(false),
    );
  });
});
