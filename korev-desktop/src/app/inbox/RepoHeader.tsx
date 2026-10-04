import type { ReactNode } from 'react';
import { Badge, Icon } from '../../design-system';
import { repoToggleKey } from './entries';
import { useListOption } from './listbox';

export interface RepoHeaderProps {
  repo: string;
  countLabel: string;
  urgentLabel: string | null;
  expanded: boolean;
  onToggle: () => void;
}

export function RepoHeader({
  repo,
  countLabel,
  urgentLabel,
  expanded,
  onToggle,
}: RepoHeaderProps) {
  const option = useListOption(repoToggleKey(repo), { onActivate: onToggle });
  return (
    <div
      {...option}
      aria-expanded={expanded}
      className="sticky top-0 z-5 flex h-9 w-full cursor-pointer items-center gap-2 border-b border-border-1 bg-app px-5 text-left hover:bg-hover aria-selected:bg-raised focus-visible:shadow-focus"
    >
      <Icon
        name={expanded ? 'chevron-down' : 'chevron-right'}
        size={14}
        className="shrink-0 text-fg-3"
      />
      <span className="truncate font-mono text-sm font-semibold text-fg-1">
        {repo}
      </span>
      <span className="shrink-0 font-mono text-xs text-fg-2">{countLabel}</span>
      {urgentLabel ? <Badge tone="danger">{urgentLabel}</Badge> : null}
    </div>
  );
}

export interface RepoBlockProps extends RepoHeaderProps {
  children: ReactNode;
}

export function RepoBlock({ children, ...header }: RepoBlockProps) {
  return (
    <div role="group" aria-label={header.repo}>
      <RepoHeader {...header} />
      {header.expanded ? children : null}
    </div>
  );
}
