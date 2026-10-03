import type { AuthState, LoginState, TokenResult } from './auth';
import type { InboxSnapshot } from './inbox';
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
  ShellOpenGithub = 'shell:open-github',
}

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
  };
  shell: {
    openGithub(url: string): Promise<void>;
  };
}
