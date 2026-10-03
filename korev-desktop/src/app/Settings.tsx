import { useState } from 'react';
import { Avatar, Button, Card, Tabs } from '../design-system';
import type { AuthState, Connection, ConnectionMethod } from '../shared/auth';
import type { InboxSnapshot } from '../shared/inbox';
import type { Settings, ThemePreference } from '../shared/settings';
import { korev } from './bridge';
import { pluralize } from './format';
import { AddRepoInput } from './repos/AddRepoInput';
import { RepoChecklist } from './repos/RepoChecklist';
import { uniqueRepos } from './repos/repo-name';
import { useSuggestedRepos } from './repos/useSuggestedRepos';
import { disconnect } from './useAuthState';
import { saveRepos, saveTheme } from './useSettings';

const GITHUB_APPLICATIONS_URL = 'https://github.com/settings/applications';

const METHOD_LABELS: Record<ConnectionMethod, string> = {
  oauth: 'Connected with GitHub',
  token: 'Connected with a token',
};

const THEME_TABS: { id: ThemePreference; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

function themeById(id: string): ThemePreference | undefined {
  return THEME_TABS.find((tab) => tab.id === id)?.id;
}

interface AccountCardProps {
  connection: Connection;
  authLost: boolean;
}

function AccountCard({ connection, authLost }: AccountCardProps) {
  return (
    <Card title="Account">
      <div className="flex flex-wrap items-center gap-3">
        <Avatar
          name={connection.login}
          src={connection.avatarUrl ?? undefined}
          size={36}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate type-h3 text-fg-1">@{connection.login}</div>
          <div className="text-xs text-fg-3">
            {METHOD_LABELS[connection.method]}
          </div>
        </div>
        <Button
          variant="ghost"
          iconRight="external-link"
          onClick={() => void korev().shell.openGithub(GITHUB_APPLICATIONS_URL)}
        >
          Manage access on GitHub
        </Button>
        <Button variant="danger" onClick={() => void disconnect()}>
          Disconnect
        </Button>
      </div>
      {authLost ? (
        <p className="mt-3 mb-0 text-xs text-danger-text">
          GitHub no longer accepts the saved sign-in. Disconnect, then connect
          again.
        </p>
      ) : null}
    </Card>
  );
}

function RepositoriesCard({ repos }: { repos: string[] }) {
  const suggested = useSuggestedRepos();
  const [unwatched, setUnwatched] = useState<string[]>([]);
  const listed = uniqueRepos(repos, unwatched, suggested);

  function toggle(repo: string, checked: boolean) {
    if (checked) {
      void saveRepos(uniqueRepos(repos, [repo]));
      return;
    }
    setUnwatched((current) => uniqueRepos(current, [repo]));
    void saveRepos(repos.filter((watched) => watched !== repo));
  }

  return (
    <Card title={`Watching ${pluralize(repos.length, 'repo')}`}>
      <div className="flex flex-col gap-4">
        <RepoChecklist repos={listed} selected={repos} onToggle={toggle} />
        <AddRepoInput onAdd={(repo) => toggle(repo, true)} />
      </div>
    </Card>
  );
}

function AppearanceCard({ theme }: { theme: ThemePreference }) {
  function select(id: string) {
    const next = themeById(id);
    if (next) void saveTheme(next);
  }
  return (
    <Card title="Appearance">
      <Tabs variant="pill" value={theme} onChange={select} tabs={THEME_TABS} />
    </Card>
  );
}

function AboutCard({ stacksUnavailable }: { stacksUnavailable: boolean }) {
  return (
    <Card title="About">
      <div className="type-h3 text-fg-1">Korev</div>
      <p className="mt-1 mb-0 text-xs text-fg-3">
        Your PRs, sorted by what needs you.
      </p>
      {stacksUnavailable ? (
        <p className="mt-3 mb-0 text-xs text-warning-text">
          Stack view unavailable: GitHub changed the API
        </p>
      ) : null}
    </Card>
  );
}

export interface SettingsPageProps {
  auth: AuthState;
  settings: Settings;
  snapshot: InboxSnapshot | null;
}

export function SettingsPage({ auth, settings, snapshot }: SettingsPageProps) {
  return (
    <div className="mx-auto flex max-w-160 flex-col gap-4 px-6 py-6">
      {auth.connection ? (
        <AccountCard
          connection={auth.connection}
          authLost={snapshot?.status === 'auth_lost'}
        />
      ) : null}
      <RepositoriesCard repos={settings.repos} />
      <AppearanceCard theme={settings.theme} />
      <AboutCard stacksUnavailable={snapshot?.stacksUnavailable ?? false} />
    </div>
  );
}
