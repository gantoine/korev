import { useState } from 'react';
import { Button } from '../../design-system';
import type { Connection } from '../../shared/auth';
import { pluralize } from '../format';
import { RepoPicker } from '../repos/RepoPicker';
import { uniqueRepos, withRepo } from '../repos/repo-name';
import { useSuggestedRepos } from '../repos/useSuggestedRepos';
import { saveRepos } from '../useSettings';

export function RepoStep({ connection }: { connection: Connection }) {
  const suggested = useSuggestedRepos();
  const [touched, setTouched] = useState<string[]>([]);
  const [unchecked, setUnchecked] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const pinned = uniqueRepos(suggested, touched);
  const selected = pinned.filter((repo) => !unchecked.includes(repo));

  function toggle(repo: string, checked: boolean) {
    setTouched((current) => uniqueRepos(current, [repo]));
    setUnchecked((current) => withRepo(current, repo, !checked));
  }

  function openInbox() {
    setSaving(true);
    void saveRepos(selected);
  }

  return (
    <div className="flex flex-col">
      <h1 className="m-0 type-h2 text-fg-1">
        Connected as @{connection.login}
      </h1>
      <p className="mt-1 mb-4 text-sm text-fg-3">
        Pick the repos Korev watches. You can change them later in Settings.
      </p>
      <RepoPicker
        pinned={{
          title: 'Suggested',
          repos: pinned,
          emptyMessage: 'No suggestions yet. Pick repos from the list below.',
        }}
        selected={selected}
        onToggle={toggle}
      />
      <Button
        variant="primary"
        size="lg"
        className="mt-5"
        disabled={selected.length === 0}
        loading={saving}
        onClick={openInbox}
      >
        Open inbox ({pluralize(selected.length, 'repo')})
      </Button>
    </div>
  );
}
