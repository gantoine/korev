import { useSyncExternalStore } from 'react';
import type { KorevBridge, Unsubscribe } from '../../shared/ipc-contract';
import type { OwnerAccess, RepoOwner, RepoPage } from '../../shared/repos';
import { korev } from '../bridge';
import { uniqueRepos } from './repo-name';

export type OwnersLoad = 'idle' | 'loading' | 'done' | 'error';

export type GroupLoad = 'idle' | 'loading' | 'paging' | 'done' | 'error';

export type SearchStatus = 'searching' | 'done' | 'failed';

export interface OwnerRepos {
  load: GroupLoad;
  repos: string[];
  totalCount: number;
  nextCursor: string | null;
  access: OwnerAccess | null;
  actionUrl: string | null;
}

export interface RepoSearch {
  status: SearchStatus;
  repos: string[];
}

export interface CatalogState {
  ownersLoad: OwnersLoad;
  owners: RepoOwner[];
  groups: Partial<Record<string, OwnerRepos>>;
  searches: Partial<Record<string, RepoSearch>>;
}

export interface RepoCatalog {
  subscribe(listener: () => void): Unsubscribe;
  getSnapshot(): CatalogState;
  ensureOwners(): void;
  ensureRepos(owner: string): void;
  search(owner: string, term: string): void;
}

const UNLOADED_REPOS: OwnerRepos = {
  load: 'idle',
  repos: [],
  totalCount: 0,
  nextCursor: null,
  access: null,
  actionUrl: null,
};

const EMPTY_CATALOG: CatalogState = {
  ownersLoad: 'idle',
  owners: [],
  groups: {},
  searches: {},
};

const RESTARTABLE_OWNERS: OwnersLoad[] = ['idle', 'error'];
const RESTARTABLE_GROUPS: GroupLoad[] = ['idle', 'error'];

export function ownerRepos(state: CatalogState, owner: string): OwnerRepos {
  return state.groups[owner] ?? UNLOADED_REPOS;
}

export function searchKey(owner: string, term: string): string {
  return JSON.stringify([owner, term]);
}

function createRepoCatalog(bridge: KorevBridge): RepoCatalog {
  const listeners = new Set<() => void>();
  let state = EMPTY_CATALOG;

  function update(next: (current: CatalogState) => CatalogState) {
    state = next(state);
    listeners.forEach((listener) => listener());
  }

  function patchOwners(patch: Partial<CatalogState>) {
    update((current) => ({ ...current, ...patch }));
  }

  function patchGroup(owner: string, patch: Partial<OwnerRepos>) {
    update((current) => ({
      ...current,
      groups: {
        ...current.groups,
        [owner]: { ...ownerRepos(current, owner), ...patch },
      },
    }));
  }

  function patchSearch(key: string, search: RepoSearch) {
    update((current) => ({
      ...current,
      searches: { ...current.searches, [key]: search },
    }));
  }

  async function loadOwners() {
    patchOwners({ ownersLoad: 'loading' });
    try {
      patchOwners({ owners: await bridge.repos.owners(), ownersLoad: 'done' });
    } catch {
      patchOwners({ ownersLoad: 'error' });
    }
  }

  function receivePage(page: RepoPage) {
    const loaded = ownerRepos(state, page.owner);
    patchGroup(page.owner, {
      load: page.nextCursor ? 'paging' : 'done',
      repos: uniqueRepos(loaded.repos, page.repos),
      totalCount: page.totalCount,
      nextCursor: page.nextCursor,
      access: page.access,
      actionUrl: page.actionUrl,
    });
  }

  async function loadPagesFrom(owner: string, cursor: string | null) {
    const page = await bridge.repos.page(owner, cursor);
    receivePage(page);
    if (page.nextCursor) await loadPagesFrom(owner, page.nextCursor);
  }

  async function loadRepos(owner: string) {
    const loaded = ownerRepos(state, owner);
    patchGroup(owner, { load: loaded.repos.length ? 'paging' : 'loading' });
    try {
      await loadPagesFrom(owner, loaded.nextCursor);
    } catch {
      patchGroup(owner, { load: 'error' });
    }
  }

  async function runSearch(owner: string, term: string) {
    const key = searchKey(owner, term);
    patchSearch(key, { status: 'searching', repos: [] });
    try {
      const repos = await bridge.repos.search(owner, term);
      patchSearch(key, { status: 'done', repos });
    } catch {
      patchSearch(key, { status: 'failed', repos: [] });
    }
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => state,
    ensureOwners() {
      if (RESTARTABLE_OWNERS.includes(state.ownersLoad)) void loadOwners();
    },
    ensureRepos(owner) {
      const { load } = ownerRepos(state, owner);
      if (RESTARTABLE_GROUPS.includes(load)) void loadRepos(owner);
    },
    search(owner, term) {
      if (state.searches[searchKey(owner, term)]) return;
      void runSearch(owner, term);
    },
  };
}

const catalogs = new WeakMap<KorevBridge, RepoCatalog>();

export function repoCatalog(): RepoCatalog {
  const bridge = korev();
  const existing = catalogs.get(bridge);
  if (existing) return existing;
  const created = createRepoCatalog(bridge);
  catalogs.set(bridge, created);
  return created;
}

export function forgetRepoCatalog() {
  catalogs.delete(korev());
}

export function useRepoCatalog(): {
  catalog: RepoCatalog;
  state: CatalogState;
} {
  const catalog = repoCatalog();
  const state = useSyncExternalStore(catalog.subscribe, catalog.getSnapshot);
  return { catalog, state };
}
