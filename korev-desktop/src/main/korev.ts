import { join } from 'node:path';
import type { AuthState } from '../shared/auth';
import type { InboxSnapshot } from '../shared/inbox';
import { IpcChannel } from '../shared/ipc-contract';
import type { InboxView, Settings, ThemePreference } from '../shared/settings';
import { buildInbox } from '../inbox/build-inbox';
import { isGithubUrl } from './app-origin';
import { createAuthService } from './auth-service';
import type { FileSystem } from './file-system';
import { DeviceFlowLogin } from './github/auth';
import { createGithubClient } from './github/client';
import {
  GITHUB_API_URL,
  GITHUB_OAUTH_CLIENT_ID,
  GITHUB_OAUTH_SCOPES,
  GITHUB_WEB_URL,
} from './github/config';
import { createInboxService } from './inbox-service';
import type { IpcHandlers } from './ipc';
import { createSettingsStore, type SettingsStore } from './settings-store';
import { createTokenStore, type SecretCipher } from './token-store';

const SETTINGS_FILE = 'settings.json';
const TOKEN_FILE = 'github-token.bin';

export interface KorevDeps {
  userDataPath: string;
  fs: FileSystem;
  cipher: SecretCipher;
  fetch: typeof fetch;
  sleep(milliseconds: number, signal: AbortSignal): Promise<void>;
  openExternal(url: string): Promise<void>;
  applyTheme(theme: ThemePreference): void;
  broadcast(channel: IpcChannel, payload: InboxSnapshot | AuthState): void;
  warn(message: string): void;
}

export interface Korev {
  handlers: IpcHandlers;
  settings: SettingsStore;
  start(): Promise<void>;
}

export function createKorev(deps: KorevDeps): Korev {
  const settings = createSettingsStore({
    fs: deps.fs,
    path: join(deps.userDataPath, SETTINGS_FILE),
  });
  const tokenStore = createTokenStore({
    cipher: deps.cipher,
    fs: deps.fs,
    path: join(deps.userDataPath, TOKEN_FILE),
  });
  const github = createGithubClient({
    fetch: deps.fetch,
    apiUrl: GITHUB_API_URL,
  });

  const inbox = createInboxService({
    fetchInbox: (token, repos, signal) =>
      github.fetchInbox(token, repos, signal),
    buildInbox,
    token: () => auth.token(),
    repos: () => settings.current().repos,
    now: () => new Date(),
    publish: (snapshot) => deps.broadcast(IpcChannel.InboxUpdated, snapshot),
  });

  const auth = createAuthService({
    tokenStore,
    fetchViewer: (token) => github.fetchViewer(token),
    createDeviceFlow: (onToken) =>
      new DeviceFlowLogin({
        fetch: deps.fetch,
        webUrl: GITHUB_WEB_URL,
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

  async function suggestedRepos(): Promise<string[]> {
    const token = auth.token();
    return token ? github.fetchSuggestedRepos(token) : [];
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
    [IpcChannel.InboxRefresh]: () => inbox.refresh(),
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
    [IpcChannel.ShellOpenGithub]: openGithub,
  };

  async function start(): Promise<void> {
    const { settings: loaded, problem } = await settings.load();
    if (problem) deps.warn(problem);
    deps.applyTheme(loaded.theme);
    await auth.init();
    void inbox.refresh();
  }

  return { handlers, settings, start };
}
