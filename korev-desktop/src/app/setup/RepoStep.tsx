import { useState } from 'react';
import { Button } from '../../design-system';
import type { Connection } from '../../shared/auth';
import { pluralize } from '../format';
import { AddRepoInput } from '../repos/AddRepoInput';
import { RepoChecklist } from '../repos/RepoChecklist';
import { uniqueRepos } from '../repos/repo-name';
import { useSuggestedRepos } from '../repos/useSuggestedRepos';
import { saveRepos } from '../useSettings';

export function RepoStep({ connection }: { connection: Connection }) {
  const suggested = useSuggestedRepos();
  const [added, setAdded] = useState<string[]>([]);
  const [unchecked, setUnchecked] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const listed = uniqueRepos(suggested, added);
  const selected = listed.filter((repo) => !unchecked.includes(repo));

  function toggle(repo: string, checked: boolean) {
    setUnchecked((current) =>
      checked ? current.filter((other) => other !== repo) : [...current, repo],
    );
  }

  function add(repo: string) {
    setAdded((current) => uniqueRepos(current, [repo]));
    toggle(repo, true);
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
      {listed.length > 0 ? (
        <>
          <h2 className="mt-0 mb-2 type-overline text-fg-3">Suggested</h2>
          <RepoChecklist repos={listed} selected={selected} onToggle={toggle} />
        </>
      ) : (
        <p className="m-0 text-xs text-fg-3">
          No suggestions yet. Add a repo by name.
        </p>
      )}
      <div className="mt-4">
        <AddRepoInput onAdd={add} />
      </div>
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
