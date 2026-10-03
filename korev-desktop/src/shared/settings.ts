export type ThemePreference = 'system' | 'light' | 'dark';

export type InboxView = 'review' | 'mine';

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Settings {
  repos: string[];
  theme: ThemePreference;
  lastView: InboxView;
  windowBounds: WindowBounds | null;
}

export const DEFAULT_SETTINGS: Settings = {
  repos: [],
  theme: 'system',
  lastView: 'review',
  windowBounds: null,
};
