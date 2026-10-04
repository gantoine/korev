import type { OwnerAccess, RepoOwner } from '../../shared/repos';
import {
  ownerRepos,
  searchKey,
  type CatalogState,
  type OwnerRepos,
  type SearchStatus,
} from './repo-catalog';
import { uniqueRepos } from './repo-name';

export type GroupSearch = 'idle' | SearchStatus;

const VISIBLE_SEARCHES: GroupSearch[] = ['searching', 'failed'];

export interface RepoFilter {
  term: string;
  settled: boolean;
}

export interface GroupView {
  owner: RepoOwner;
  loaded: OwnerRepos;
  access: OwnerAccess;
  actionUrl: string | null;
  matches: string[];
  search: GroupSearch;
}

export function normalizeTerm(term: string): string {
  return term.trim().toLowerCase();
}

export function matchingRepos(repos: string[], term: string): string[] {
  if (!term) return repos;
  return repos.filter((repo) => repo.toLowerCase().includes(term));
}

function ownerAccess(owner: RepoOwner, loaded: OwnerRepos): OwnerAccess {
  return loaded.access ?? owner.access;
}

export function needsSearch(owner: RepoOwner, state: CatalogState): boolean {
  const loaded = ownerRepos(state, owner.login);
  return ownerAccess(owner, loaded) === 'ok' && loaded.load !== 'done';
}

function searchFor(state: CatalogState, owner: RepoOwner, term: string) {
  return state.searches[searchKey(owner.login, term)];
}

function groupSearch(
  owner: RepoOwner,
  state: CatalogState,
  filter: RepoFilter,
): GroupSearch {
  if (!filter.term || !needsSearch(owner, state)) return 'idle';
  if (!filter.settled) return 'searching';
  return searchFor(state, owner, filter.term)?.status ?? 'searching';
}

function groupMatches(
  owner: RepoOwner,
  state: CatalogState,
  filter: RepoFilter,
): string[] {
  const { repos } = ownerRepos(state, owner.login);
  if (!filter.term) return repos;
  const found = searchFor(state, owner, filter.term)?.repos ?? [];
  return uniqueRepos(matchingRepos(repos, filter.term), found);
}

export function groupView(
  owner: RepoOwner,
  state: CatalogState,
  filter: RepoFilter,
): GroupView {
  const loaded = ownerRepos(state, owner.login);
  return {
    owner,
    loaded,
    access: ownerAccess(owner, loaded),
    actionUrl: loaded.actionUrl ?? owner.actionUrl,
    matches: groupMatches(owner, state, filter),
    search: groupSearch(owner, state, filter),
  };
}

export function isGroupShown(view: GroupView, filtering: boolean): boolean {
  if (!filtering || view.access !== 'ok') return true;
  return view.matches.length > 0 || VISIBLE_SEARCHES.includes(view.search);
}
