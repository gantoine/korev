import type { InboxView } from '../../shared/settings';
import { withRepo } from '../repos/repo-name';
import { saveCollapsedRepos, useSettings } from '../useSettings';

export interface CollapsedRepos {
  isCollapsed: (repo: string) => boolean;
  toggle: (repo: string) => void;
}

export function useCollapsedRepos(view: InboxView): CollapsedRepos {
  const collapsed = useSettings()?.collapsedRepos[view] ?? [];
  return {
    isCollapsed: (repo) => collapsed.includes(repo),
    toggle: (repo) =>
      void saveCollapsedRepos(
        view,
        withRepo(collapsed, repo, !collapsed.includes(repo)),
      ),
  };
}
