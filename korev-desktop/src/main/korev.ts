import { join } from 'node:path';
import type { AuthState } from '../shared/auth';
import type { InboxSnapshot } from '../shared/inbox';
import { IpcChannel } from '../shared/ipc-contract';
import type { RepoOwner, RepoPage } from '../shared/repos';
import type { InboxView, Settings, ThemePreference } from '../shared/settings';
import { buildInbox } from '../inbox/build-inbox';
import { isGithubUrl } from './app-origin';
import { createAuthService } from './auth-service';
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
import type { IpcHandlers } from './ipc';
import {
  createSettingsStore,
  notifyOnChange,
  type SettingsStore,
} from './settings-store';
import { createTokenStore, type SecretCipher } from './token-store';

const SETTINGS_FILE = 'settings.json';
const TOKEN_FILE = 'github-token.bin';

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
    publish: (snapshot) => deps.broadcast(IpcChannel.InboxUpdated, snapshot),
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
    onConnectionChange: (connection) => {
      github.clearSessionCache();
      if (connection) void inbox.restart();
      else inbox.reset();
    },
  });

  async function setRepos(repos: string[]): Promise<Settings> {
    const updated = await settings.update({ repos });
    void inbox.restart();
    return updated;
  }

  async function setTheme(theme: ThemePreference): Promise<Settings> {
    const updated = await settings.update({ theme });
    deps.applyTheme(updated.theme);
    return updated;
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
    [IpcChannel.SettingsLoad]: () => settings.current(),
    [IpcChannel.SettingsSetRepos]: setRepos,
    [IpcChannel.SettingsSetTheme]: setTheme,
    [IpcChannel.SettingsSetLastView]: (lastView: InboxView) =>
      settings.update({ lastView }),
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
    void inbox.start();
  }

  return { handlers, settings, inbox, start };
}
