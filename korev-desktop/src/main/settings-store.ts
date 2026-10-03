import {
  DEFAULT_SETTINGS,
  type InboxView,
  type Settings,
  type ThemePreference,
  type WindowBounds,
} from '../shared/settings';
import type { FileSystem } from './file-system';

const THEMES: readonly ThemePreference[] = ['system', 'light', 'dark'];
const VIEWS: readonly InboxView[] = ['review', 'mine'];
const REPO_PATTERN = /^[\w.-]+\/[\w.-]+$/;
const CORRUPT_SETTINGS_PROBLEM = 'Settings were reset';

export interface SettingsLoadResult {
  settings: Settings;
  problem: string | null;
}

export interface SettingsStore {
  load(): Promise<SettingsLoadResult>;
  current(): Settings;
  update(patch: Partial<Settings>): Promise<Settings>;
}

export function isRepoName(value: unknown): value is string {
  return typeof value === 'string' && REPO_PATTERN.test(value);
}

function pickRepos(value: unknown): string[] {
  if (!Array.isArray(value)) return DEFAULT_SETTINGS.repos;
  return [...new Set(value.filter(isRepoName))];
}

function pickOneOf<T>(options: readonly T[], value: unknown, fallback: T): T {
  return options.includes(value as T) ? (value as T) : fallback;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function pickBounds(value: unknown): WindowBounds | null {
  if (!value || typeof value !== 'object') return null;
  const { x, y, width, height } = value as Record<string, unknown>;
  if (![x, y, width, height].every(isFiniteNumber)) return null;
  return { x, y, width, height } as WindowBounds;
}

function sanitize(raw: Record<string, unknown>): Settings {
  return {
    repos: pickRepos(raw.repos),
    theme: pickOneOf(THEMES, raw.theme, DEFAULT_SETTINGS.theme),
    lastView: pickOneOf(VIEWS, raw.lastView, DEFAULT_SETTINGS.lastView),
    windowBounds: pickBounds(raw.windowBounds),
  };
}

function parseSettings(text: string): Settings | null {
  try {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object') return null;
    return sanitize(parsed as Record<string, unknown>);
  } catch {
    return null;
  }
}

export function createSettingsStore(deps: {
  fs: FileSystem;
  path: string;
}): SettingsStore {
  let settings: Settings = DEFAULT_SETTINGS;

  async function load(): Promise<SettingsLoadResult> {
    const contents = await deps.fs.read(deps.path);
    if (!contents)
      return { settings: (settings = DEFAULT_SETTINGS), problem: null };
    const parsed = parseSettings(contents.toString('utf8'));
    settings = parsed ?? DEFAULT_SETTINGS;
    return { settings, problem: parsed ? null : CORRUPT_SETTINGS_PROBLEM };
  }

  async function update(patch: Partial<Settings>): Promise<Settings> {
    settings = sanitize({ ...settings, ...patch });
    await deps.fs.writeAtomic(deps.path, JSON.stringify(settings, null, 2));
    return settings;
  }

  return { load, update, current: () => settings };
}
