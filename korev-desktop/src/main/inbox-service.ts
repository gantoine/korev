import type { Inbox, InboxInput } from '../inbox/build-inbox';
import type { Bucket, InboxSnapshot } from '../shared/inbox';
import type { InboxResult } from './github/client';
import { AuthLostError, NetworkError, RateLimitedError } from './github/errors';

export interface InboxServiceDeps {
  fetchInbox(
    token: string,
    repos: string[],
    signal: AbortSignal,
  ): Promise<InboxResult>;
  buildInbox(input: InboxInput): Inbox;
  token(): string | null;
  repos(): string[];
  now(): Date;
  publish(snapshot: InboxSnapshot): void;
}

export interface InboxService {
  snapshot(): InboxSnapshot;
  refresh(): Promise<void>;
  restart(): Promise<void>;
  reset(): void;
}

const BUCKETS: readonly Bucket[] = ['needs-you', 'in-progress', 'ready'];

export function emptySnapshot(repoCount = 0): InboxSnapshot {
  return {
    status: 'idle',
    syncedAt: null,
    viewerLogin: null,
    repoCount,
    mine: BUCKETS.map((bucket) => ({ bucket, count: 0, entries: [] })),
    reviews: [],
    reviewCount: 0,
    problems: [],
    truncated: { mine: false, reviews: false },
    stacksUnavailable: false,
    error: null,
    rateLimitResetAt: null,
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function failureFields(error: unknown): Partial<InboxSnapshot> {
  const message = errorMessage(error);
  if (error instanceof AuthLostError)
    return { status: 'auth_lost', error: message };
  if (error instanceof NetworkError)
    return { status: 'offline', error: message };
  if (error instanceof RateLimitedError) {
    return {
      status: 'rate_limited',
      error: message,
      rateLimitResetAt: error.resetAt.toISOString(),
    };
  }
  return { status: 'error', error: message };
}

export function createInboxService(deps: InboxServiceDeps): InboxService {
  let current = emptySnapshot();
  let epoch = 0;
  let controller: AbortController | null = null;
  let running: Promise<void> | null = null;
  let followUpQueued = false;

  function publish(next: InboxSnapshot): void {
    current = next;
    deps.publish(next);
  }

  function toSnapshot(fetched: InboxResult, repoCount: number): InboxSnapshot {
    const now = deps.now();
    const built = deps.buildInbox({
      mine: fetched.mine,
      reviews: fetched.reviews,
      viewer: { login: fetched.viewerLogin, teams: fetched.viewerTeams },
      now,
    });
    return {
      ...emptySnapshot(repoCount),
      ...built,
      status: 'live',
      syncedAt: now.toISOString(),
      viewerLogin: fetched.viewerLogin,
      problems: fetched.problems,
      truncated: fetched.truncated,
      stacksUnavailable: fetched.stacksUnavailable,
    };
  }

  async function syncOnce(): Promise<void> {
    const token = deps.token();
    const repos = deps.repos();
    if (!token || repos.length === 0) {
      publish(emptySnapshot(repos.length));
      return;
    }
    const syncEpoch = epoch;
    controller = new AbortController();
    publish({ ...current, status: 'syncing', repoCount: repos.length });
    try {
      const fetched = await deps.fetchInbox(token, repos, controller.signal);
      if (syncEpoch === epoch) publish(toSnapshot(fetched, repos.length));
    } catch (error) {
      if (syncEpoch === epoch) publish({ ...current, ...failureFields(error) });
    }
  }

  async function drainQueue(): Promise<void> {
    do {
      followUpQueued = false;
      await syncOnce();
    } while (followUpQueued);
  }

  function refresh(): Promise<void> {
    if (running) {
      followUpQueued = true;
      return running;
    }
    running = drainQueue().finally(() => {
      running = null;
    });
    return running;
  }

  function invalidateInFlight(): void {
    epoch += 1;
    controller?.abort();
  }

  return {
    snapshot: () => current,
    refresh,
    restart() {
      invalidateInFlight();
      return refresh();
    },
    reset() {
      invalidateInFlight();
      followUpQueued = false;
      publish(emptySnapshot());
    },
  };
}
