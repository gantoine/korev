import { join } from 'node:path';
import type { AuthState, Connection } from '../shared/auth';
import type { InboxSnapshot } from '../shared/inbox';
import { IpcChannel } from '../shared/ipc-contract';
import type { RepoOwner, RepoPage } from '../shared/repos';
import type { InboxView, Settings, ThemePreference } from '../shared/settings';
import { buildInbox } from '../inbox/build-inbox';
import { isGithubUrl } from './app-origin';
import { createAuthService } from './auth-service';
import type { SecretCipher } from './encrypted-file';
import type { FileSystem } from './file-system';
import { DeviceFlowLogin } from './github/auth';
import { createGithubClient } from './github/client';
import { createInboxPoller, type InboxPoller } from './github/inbox-poller';
import {
  GITHUB_OAUTH_CLIENT_ID,
  GITHUB_OAUTH_SCOPES,
  type GithubEndpoints,
} from './github/config';
import { applyRenames, type RepoRename } from './github/repo-access';
import { emptyRepoPage } from './github/repo-picker';
import type { FetchLike } from './github/request';
import { createInboxCache } from './inbox-cache';
import type { IpcHandlers } from './ipc';
import {
  createSettingsStore,
  notifyOnChange,
  type SettingsStore,
} from './settings-store';
import { createTokenStore } from './token-store';

const SETTINGS_FILE = 'settings.json';
const TOKEN_FILE = 'github-token.bin';
const INBOX_CACHE_FILE = 'inbox-cache.bin';

export interface KorevDeps {
  userDataPath: string;
  fs: FileSystem;
  cipher: SecretCipher;
  fetch: FetchLike;
  github: GithubEndpoints;
  sleep(milliseconds: number, signal: AbortSignal): Promise<void>;
  openExternal(url: string): Promise<void>;
  applyTheme(theme: ThemePreference): void;
  broadcast(
    channel: IpcChannel,
    payload: InboxSnapshot | AuthState | Settings,
  ): void;
  warn(message: string): void;
}

export interface Korev {
  handlers: IpcHandlers;
  settings: SettingsStore;
  inbox: Pick<InboxPoller, 'trigger' | 'suspend' | 'resume' | 'stop'>;
  start(): Promise<void>;
}

function sameRepoSet(left: string[], right: string[]): boolean {
  const rightSet = new Set(right);
  return (
    left.length === right.length && left.every((repo) => rightSet.has(repo))
  );
}

export function createKorev(deps: KorevDeps): Korev {
  const settings = notifyOnChange(
    createSettingsStore({
      fs: deps.fs,
      path: join(deps.userDataPath, SETTINGS_FILE),
    }),
    (changed) => deps.broadcast(IpcChannel.SettingsChanged, changed),
  );
  const tokenStore = createTokenStore({
    cipher: deps.cipher,
    fs: deps.fs,
    path: join(deps.userDataPath, TOKEN_FILE),
  });
  const inboxCache = createInboxCache({
    cipher: deps.cipher,
    fs: deps.fs,
    path: join(deps.userDataPath, INBOX_CACHE_FILE),
  });
  const github = createGithubClient({
    fetch: deps.fetch,
    apiUrl: deps.github.apiUrl,
  });

  const inbox = createInboxPoller({
    client: github,
    buildInbox,
    token: () => auth.token(),
    repos: () => settings.current().repos,
    renameRepos: followRepoRenames,
    now: () => new Date(),
    scheduler: {
      setTimeout: (callback, milliseconds) =>
        setTimeout(callback, milliseconds),
      clearTimeout: (handle) => clearTimeout(handle),
    },
    publish: publishInbox,
  });

  const auth = createAuthService({
    tokenStore,
    fetchViewer: (token) => github.fetchViewer(token),
    createDeviceFlow: (onToken) =>
      new DeviceFlowLogin({
        fetch: deps.fetch,
        webUrl: deps.github.webUrl,
        clientId: GITHUB_OAUTH_CLIENT_ID,
        scopes: GITHUB_OAUTH_SCOPES,
        now: () => Date.now(),
        sleep: deps.sleep,
        onToken,
      }),
    onStateChange: (state) => deps.broadcast(IpcChannel.AuthChanged, state),
    onConnectionChange: followConnection,
    warn: deps.warn,
  });

  function publishInbox(snapshot: InboxSnapshot): void {
    deps.broadcast(IpcChannel.InboxUpdated, snapshot);
    if (snapshot.status !== 'live') return;
    inboxCache.save(snapshot).catch((error: unknown) => {
      deps.warn(`Could not cache the inbox: ${String(error)}`);
    });
  }

  async function restoreCachedInbox(): Promise<void> {
    const login = auth.state().connection?.login;
    if (!login) return;
    const cached = await inboxCache.load(login).catch((error: unknown) => {
      deps.warn(`Could not read the cached inbox: ${String(error)}`);
      return null;
    });
    if (cached) inbox.restore(cached);
  }

  async function followConnection(connection: Connection | null) {
    github.clearSessionCache();
    if (!connection) {
      inbox.reset();
      await inboxCache.clear();
      return;
    }
    await restoreCachedInbox();
    void inbox.restart();
  }

  async function setRepos(repos: string[]): Promise<Settings> {
    const previous = settings.current().repos;
    const updated = await settings.update({ repos });
    if (sameRepoSet(previous, updated.repos)) inbox.reorder();
    else void inbox.restart();
    return updated;
  }

  async function setTheme(theme: ThemePreference): Promise<Settings> {
    const updated = await settings.update({ theme });
    deps.applyTheme(updated.theme);
    return updated;
  }

  function setCollapsedRepos(view: InboxView, repos: string[]) {
    const { collapsedRepos } = settings.current();
    return settings.update({
      collapsedRepos: { ...collapsedRepos, [view]: repos },
    });
  }

  async function followRepoRenames(renames: RepoRename[]): Promise<void> {
    const repos = applyRenames(settings.current().repos, renames);
    await settings.update({ repos });
  }

  function withToken<T>(
    disconnected: T,
    run: (token: string) => Promise<T>,
  ): Promise<T> {
    const token = auth.token();
    return token ? run(token) : Promise.resolve(disconnected);
  }

  function suggestedRepos(): Promise<string[]> {
    return withToken([], (token) => github.fetchSuggestedRepos(token));
  }

  function repoOwners(): Promise<RepoOwner[]> {
    return withToken([], (token) => github.fetchRepoOwners(token));
  }

  function repoPage(owner: string, cursor: unknown): Promise<RepoPage> {
    const pageCursor = typeof cursor === 'string' ? cursor : null;
    return withToken(emptyRepoPage(owner), (token) =>
      github.fetchRepoPage(token, owner, pageCursor),
    );
  }

  function searchRepos(owner: string, term: unknown): Promise<string[]> {
    const searchTerm = typeof term === 'string' ? term : '';
    return withToken([], (token) =>
      github.searchRepos(token, owner, searchTerm),
    );
  }

  async function openGithub(url: string): Promise<void> {
    if (isGithubUrl(url)) await deps.openExternal(url);
  }

  async function useToken(token: unknown) {
    if (typeof token !== 'string') {
      return { ok: false as const, message: 'Paste a GitHub token.' };
    }
    return auth.useToken(token);
  }

  const handlers: IpcHandlers = {
    [IpcChannel.InboxLoad]: () => inbox.snapshot(),
    [IpcChannel.InboxRefresh]: () => inbox.trigger('manual'),
    [IpcChannel.AuthGetState]: () => auth.state(),
    [IpcChannel.AuthStartDeviceFlow]: () => auth.startDeviceFlow(),
    [IpcChannel.AuthCancelDeviceFlow]: () => auth.cancelDeviceFlow(),
    [IpcChannel.AuthUseToken]: useToken,
    [IpcChannel.AuthDisconnect]: () => auth.disconnect(),
    [IpcChannel.AuthRetryUnlock]: () => auth.retryUnlock(),
    [IpcChannel.SettingsLoad]: () => settings.current(),
    [IpcChannel.SettingsSetRepos]: setRepos,
    [IpcChannel.SettingsSetTheme]: setTheme,
    [IpcChannel.SettingsSetLastView]: (lastView: InboxView) =>
      settings.update({ lastView }),
    [IpcChannel.SettingsSetCollapsedRepos]: setCollapsedRepos,
    [IpcChannel.SettingsSuggestedRepos]: suggestedRepos,
    [IpcChannel.ReposOwners]: repoOwners,
    [IpcChannel.ReposPage]: repoPage,
    [IpcChannel.ReposSearch]: searchRepos,
    [IpcChannel.ShellOpenGithub]: openGithub,
  };

  async function start(): Promise<void> {
    const { settings: loaded, problem } = await settings.load();
    if (problem) deps.warn(problem);
    deps.applyTheme(loaded.theme);
    await auth.init();
    await restoreCachedInbox();
    void inbox.start();
  }

  return { handlers, settings, inbox, start };
}
