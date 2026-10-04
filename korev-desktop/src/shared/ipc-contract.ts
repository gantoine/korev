import type { AuthState, LoginState, TokenResult } from './auth';
import type { InboxSnapshot } from './inbox';
import type { RepoOwner, RepoPage } from './repos';
import type { InboxView, Settings, ThemePreference } from './settings';

export enum IpcChannel {
  InboxLoad = 'inbox:load',
  InboxRefresh = 'inbox:refresh',
  InboxUpdated = 'inbox:updated',
  AuthGetState = 'auth:get-state',
  AuthChanged = 'auth:changed',
  AuthStartDeviceFlow = 'auth:start-device-flow',
  AuthCancelDeviceFlow = 'auth:cancel-device-flow',
  AuthUseToken = 'auth:use-token',
  AuthDisconnect = 'auth:disconnect',
  SettingsLoad = 'settings:load',
  SettingsSetRepos = 'settings:set-repos',
  SettingsSetTheme = 'settings:set-theme',
  SettingsSetLastView = 'settings:set-last-view',
  SettingsSuggestedRepos = 'settings:suggested-repos',
  SettingsChanged = 'settings:changed',
  ReposOwners = 'repos:owners',
  ReposPage = 'repos:page',
  ReposSearch = 'repos:search',
  ShellOpenGithub = 'shell:open-github',
  AppCommand = 'app:command',
}

export type AppCommand =
  | 'show-review'
  | 'show-mine'
  | 'show-settings'
  | 'refresh'
  | 'show-shortcuts';

export type Unsubscribe = () => void;

export interface KorevBridge {
  inbox: {
    load(): Promise<InboxSnapshot>;
    refresh(): Promise<void>;
    onUpdated(listener: (snapshot: InboxSnapshot) => void): Unsubscribe;
  };
  auth: {
    getState(): Promise<AuthState>;
    startDeviceFlow(): Promise<LoginState>;
    cancelDeviceFlow(): Promise<void>;
    useToken(token: string): Promise<TokenResult>;
    disconnect(): Promise<void>;
    onChanged(listener: (state: AuthState) => void): Unsubscribe;
  };
  settings: {
    load(): Promise<Settings>;
    setRepos(repos: string[]): Promise<Settings>;
    setTheme(theme: ThemePreference): Promise<Settings>;
    setLastView(view: InboxView): Promise<Settings>;
    suggestedRepos(): Promise<string[]>;
    onChanged(listener: (settings: Settings) => void): Unsubscribe;
  };
  repos: {
    owners(): Promise<RepoOwner[]>;
    page(owner: string, cursor: string | null): Promise<RepoPage>;
    search(owner: string, term: string): Promise<string[]>;
  };
  shell: {
    openGithub(url: string): Promise<void>;
  };
  app: {
    onCommand(listener: (command: AppCommand) => void): Unsubscribe;
  };
}
