import { useState } from 'react';
import { Button, Icon, Skeleton } from '../../design-system';
import type { RepoOwner } from '../../shared/repos';
import { formatCount } from '../format';
import { AccessRow, type BlockedAccess } from './AccessRow';
import { RepoChecklist } from './RepoChecklist';
import type { GroupView } from './repo-groups';

const SKELETON_ROWS = 3;

const OWNER_KIND_LABELS: Record<RepoOwner['kind'], string> = {
  viewer: 'Personal',
  org: 'Organization',
};

const TOGGLE =
  'inline-flex cursor-pointer items-center gap-1.5 rounded-xs border-0 bg-transparent p-0 font-sans type-ui font-medium text-fg-1 focus-visible:shadow-focus';

export function SkeletonRows() {
  return (
    <div className="flex flex-col gap-3 py-1">
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <Skeleton key={index} className="w-1/2" />
      ))}
    </div>
  );
}

function groupMeta({ owner, loaded, search }: GroupView): string {
  if (search === 'searching') return 'Searching GitHub…';
  if (search === 'failed') return "Couldn't search GitHub";
  if (loaded.load === 'paging') {
    const progress = `${formatCount(loaded.repos.length)} of ${formatCount(loaded.totalCount)}`;
    return `${progress} loaded`;
  }
  return OWNER_KIND_LABELS[owner.kind];
}

interface GroupErrorProps {
  message: string;
  onRetry: () => void;
}

export function GroupError({ message, onRetry }: GroupErrorProps) {
  return (
    <div className="flex items-center gap-2 py-1 text-xs text-danger-text">
      <span>{message}</span>
      <Button size="sm" variant="ghost" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

interface GroupHeaderProps {
  view: GroupView;
  open: boolean;
  onToggle?: () => void;
}

function GroupHeader({ view, open, onToggle }: GroupHeaderProps) {
  const login = view.owner.login;
  return (
    <div className="flex min-h-8 items-center gap-2">
      {onToggle ? (
        <button
          type="button"
          aria-expanded={open}
          onClick={onToggle}
          className={TOGGLE}
        >
          <Icon name={open ? 'chevron-down' : 'chevron-right'} size={14} />
          {login}
        </button>
      ) : (
        <span className="type-ui font-medium text-fg-1">{login}</span>
      )}
      <span className="text-xs text-fg-3">{groupMeta(view)}</span>
    </div>
  );
}

interface GroupBodyProps {
  view: GroupView;
  filtering: boolean;
  selected: string[];
  onToggleRepo: (repo: string, checked: boolean) => void;
  onRetry: () => void;
}

function GroupBody({
  view,
  filtering,
  selected,
  onToggleRepo,
  onRetry,
}: GroupBodyProps) {
  const { loaded, matches, owner } = view;
  const firstPageLoading = loaded.load === 'loading' && !filtering;
  const empty = loaded.load === 'done' && matches.length === 0 && !filtering;
  return (
    <div className="pb-2 pl-5">
      {firstPageLoading ? <SkeletonRows /> : null}
      {matches.length > 0 ? (
        <RepoChecklist
          repos={matches}
          selected={selected}
          onToggle={onToggleRepo}
        />
      ) : null}
      {empty ? <p className="m-0 text-xs text-fg-3">No repos yet.</p> : null}
      {loaded.load === 'error' ? (
        <GroupError
          message={`Couldn't load ${owner.login} repos`}
          onRetry={onRetry}
        />
      ) : null}
    </div>
  );
}

interface BlockedGroupProps {
  view: GroupView;
  access: BlockedAccess;
}

function BlockedGroup({ view, access }: BlockedGroupProps) {
  return (
    <section aria-label={view.owner.login}>
      <GroupHeader view={view} open={false} />
      <div className="pb-2 pl-5">
        <AccessRow access={access} actionUrl={view.actionUrl} />
      </div>
    </section>
  );
}

export interface RepoGroupProps {
  view: GroupView;
  filtering: boolean;
  selected: string[];
  onToggleRepo: (repo: string, checked: boolean) => void;
  onLoad: (owner: string) => void;
}

function ReadableGroup({
  view,
  filtering,
  selected,
  onToggleRepo,
  onLoad,
}: RepoGroupProps) {
  const [expanded, setExpanded] = useState(false);
  const login = view.owner.login;
  const open = expanded || filtering;

  function toggle() {
    if (!expanded) onLoad(login);
    setExpanded(!expanded);
  }

  return (
    <section aria-label={login}>
      <GroupHeader view={view} open={open} onToggle={toggle} />
      {open ? (
        <GroupBody
          view={view}
          filtering={filtering}
          selected={selected}
          onToggleRepo={onToggleRepo}
          onRetry={() => onLoad(login)}
        />
      ) : null}
    </section>
  );
}

export function RepoGroup(props: RepoGroupProps) {
  const { access } = props.view;
  if (access === 'ok') return <ReadableGroup {...props} />;
  return <BlockedGroup view={props.view} access={access} />;
}
