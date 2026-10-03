import { Checkbox } from '../../design-system';

export interface RepoChecklistProps {
  repos: string[];
  selected: string[];
  onToggle: (repo: string, checked: boolean) => void;
}

export function RepoChecklist({
  repos,
  selected,
  onToggle,
}: RepoChecklistProps) {
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {repos.map((repo) => (
        <li key={repo}>
          <Checkbox
            label={repo}
            checked={selected.includes(repo)}
            onChange={(checked) => onToggle(repo, checked)}
            className="font-mono text-xs"
          />
        </li>
      ))}
    </ul>
  );
}
