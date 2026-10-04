import { useEffect, useState } from 'react';
import { Input } from '../../design-system';
import { useDebouncedValue } from '../useDebouncedValue';
import { AddRepoInput } from './AddRepoInput';
import { RepoChecklist } from './RepoChecklist';
import { GroupError, RepoGroup, SkeletonRows } from './RepoGroup';
import {
  type CatalogState,
  type RepoCatalog,
  useRepoCatalog,
} from './repo-catalog';
import {
  groupView,
  isGroupShown,
  matchingRepos,
  needsSearch,
  normalizeTerm,
  type GroupView,
  type RepoFilter,
} from './repo-groups';

const SEARCH_DEBOUNCE_MS = 250;

export interface PinnedGroup {
  title: string;
  repos: string[];
  emptyMessage: string;
}

export interface RepoPickerProps {
  pinned: PinnedGroup;
  selected: string[];
  onToggle: (repo: string, checked: boolean) => void;
}

function useRepoFilter(rawTerm: string): RepoFilter {
  const term = normalizeTerm(rawTerm);
  const searchedTerm = useDebouncedValue(term, SEARCH_DEBOUNCE_MS);
  return { term, settled: term === searchedTerm };
}

function useOwnerSearches(
  catalog: RepoCatalog,
  state: CatalogState,
  filter: RepoFilter,
) {
  const { term, settled } = filter;
  useEffect(() => {
    if (!term || !settled) return;
    state.owners
      .filter((owner) => needsSearch(owner, state))
      .forEach((owner) => catalog.search(owner.login, term));
  }, [catalog, state, term, settled]);
}

interface PinnedSectionProps {
  pinned: PinnedGroup;
  filter: RepoFilter;
  selected: string[];
  onToggle: (repo: string, checked: boolean) => void;
}

function PinnedSection({
  pinned,
  filter,
  selected,
  onToggle,
}: PinnedSectionProps) {
  const repos = matchingRepos(pinned.repos, filter.term);
  if (filter.term && repos.length === 0) return null;
  return (
    <section aria-label={pinned.title} className="flex flex-col gap-2">
      <h3 className="m-0 type-overline text-fg-3">{pinned.title}</h3>
      {repos.length > 0 ? (
        <RepoChecklist repos={repos} selected={selected} onToggle={onToggle} />
      ) : (
        <p className="m-0 text-xs text-fg-3">{pinned.emptyMessage}</p>
      )}
    </section>
  );
}

interface OwnersStateProps {
  state: CatalogState;
  catalog: RepoCatalog;
}

function OwnersState({ state, catalog }: OwnersStateProps) {
  if (state.ownersLoad === 'error') {
    return (
      <GroupError
        message="Couldn't load your organizations"
        onRetry={() => catalog.ensureOwners()}
      />
    );
  }
  if (state.ownersLoad === 'done') return null;
  return <SkeletonRows />;
}

function isSearchPending(state: CatalogState, views: GroupView[]): boolean {
  if (state.ownersLoad === 'loading') return true;
  return views.some((view) => view.search === 'searching');
}

function hasMatches(pinnedMatches: string[], views: GroupView[]): boolean {
  if (pinnedMatches.length > 0) return true;
  return views.some((view) => view.matches.length > 0);
}

export function RepoPicker({ pinned, selected, onToggle }: RepoPickerProps) {
  const { catalog, state } = useRepoCatalog();
  const [rawTerm, setRawTerm] = useState('');
  const filter = useRepoFilter(rawTerm);
  const filtering = filter.term !== '';
  const views = state.owners.map((owner) => groupView(owner, state, filter));
  const showNoMatches =
    filtering &&
    !isSearchPending(state, views) &&
    !hasMatches(matchingRepos(pinned.repos, filter.term), views);

  useEffect(() => catalog.ensureOwners(), [catalog]);
  useOwnerSearches(catalog, state, filter);

  return (
    <div className="flex flex-col gap-4">
      <Input
        aria-label="Filter repos"
        placeholder="Filter repos"
        icon="search"
        value={rawTerm}
        onChange={(event) => setRawTerm(event.target.value)}
      />
      <PinnedSection
        pinned={pinned}
        filter={filter}
        selected={selected}
        onToggle={onToggle}
      />
      <div className="flex flex-col gap-1">
        {views
          .filter((view) => isGroupShown(view, filtering))
          .map((view) => (
            <RepoGroup
              key={view.owner.login}
              view={view}
              filtering={filtering}
              selected={selected}
              onToggleRepo={onToggle}
              onLoad={catalog.ensureRepos}
            />
          ))}
        <OwnersState state={state} catalog={catalog} />
      </div>
      {showNoMatches ? (
        <p className="m-0 text-xs text-fg-3">
          No repos match '{rawTerm.trim()}'
        </p>
      ) : null}
      <AddRepoInput onAdd={(repo) => onToggle(repo, true)} />
    </div>
  );
}
