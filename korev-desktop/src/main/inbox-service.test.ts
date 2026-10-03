import { describe, expect, it, vi } from 'vitest';
import type { InboxSnapshot } from '../shared/inbox';
import type { PullRequest } from '../shared/pull-request';
import { NetworkError } from './github/errors';
import type { InboxResult } from './github/client';
import { createInboxService, type InboxServiceDeps } from './inbox-service';

const NOW = new Date('2026-10-03T12:00:00Z');

function fetchResult(mine: Partial<PullRequest>[] = []): InboxResult {
  return {
    viewerLogin: 'maria',
    viewerTeams: [],
    mine: mine as PullRequest[],
    reviews: [],
    truncated: { mine: false, reviews: false },
    problems: [],
    stacksUnavailable: false,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

function setup() {
  const pending: ReturnType<typeof deferred<InboxResult>>[] = [];
  const published: InboxSnapshot[] = [];
  let repos = ['acme/api'];
  const deps: InboxServiceDeps = {
    fetchInbox: vi.fn(() => {
      const next = deferred<InboxResult>();
      pending.push(next);
      return next.promise;
    }),
    buildInbox: ({ mine }) => ({
      mine: [],
      reviews: [],
      reviewCount: mine.length,
    }),
    token: () => 'gho_token',
    repos: () => repos,
    now: () => NOW,
    publish: (snapshot) => published.push(snapshot),
  };
  const service = createInboxService(deps);
  return {
    deps,
    service,
    published,
    pending,
    setRepos: (next: string[]) => (repos = next),
    lastStatus: () => published.at(-1)?.status,
  };
}

async function flush() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('inbox service', () => {
  it('publishes syncing, then a live snapshot', async () => {
    const { service, published, pending } = setup();
    const refreshing = service.refresh();
    expect(published.at(-1)?.status).toBe('syncing');
    pending[0].resolve(fetchResult([{ number: 1 }]));
    await refreshing;
    expect(published.at(-1)).toMatchObject({
      status: 'live',
      reviewCount: 1,
      syncedAt: NOW.toISOString(),
      repoCount: 1,
    });
  });

  it('fetches nothing without repos', async () => {
    const { deps, service, setRepos, lastStatus } = setup();
    setRepos([]);
    await service.refresh();
    expect(deps.fetchInbox).not.toHaveBeenCalled();
    expect(lastStatus()).toBe('idle');
  });

  it('queues exactly one follow-up for triggers during a sync', async () => {
    const { deps, service, pending } = setup();
    const first = service.refresh();
    service.refresh();
    service.refresh();
    pending[0].resolve(fetchResult());
    await flush();
    pending[1].resolve(fetchResult());
    await first;
    expect(deps.fetchInbox).toHaveBeenCalledTimes(2);
  });

  it('drops a sync that finishes after a disconnect', async () => {
    const { service, published, pending, lastStatus } = setup();
    const refreshing = service.refresh();
    service.reset();
    pending[0].resolve(fetchResult([{ number: 1 }]));
    await refreshing;
    expect(lastStatus()).toBe('idle');
    expect(published.some((snapshot) => snapshot.status === 'live')).toBe(
      false,
    );
  });

  it('publishes only the new repo set after a repo change mid-sync', async () => {
    const { service, published, pending, setRepos } = setup();
    const refreshing = service.refresh();
    setRepos(['acme/web', 'acme/api']);
    service.restart();
    pending[0].resolve(fetchResult([{ number: 1 }]));
    await flush();
    pending[1].resolve(fetchResult([{ number: 2 }, { number: 3 }]));
    await refreshing;
    const live = published.filter((snapshot) => snapshot.status === 'live');
    expect(live).toHaveLength(1);
    expect(live[0]).toMatchObject({ repoCount: 2, reviewCount: 2 });
  });

  it('keeps the last data and marks offline on a network error', async () => {
    const { service, published, pending } = setup();
    const first = service.refresh();
    pending[0].resolve(fetchResult([{ number: 1 }]));
    await first;
    const second = service.refresh();
    pending[1].reject(new NetworkError('fetch failed'));
    await second;
    expect(published.at(-1)).toMatchObject({
      status: 'offline',
      reviewCount: 1,
      syncedAt: NOW.toISOString(),
    });
  });
});
