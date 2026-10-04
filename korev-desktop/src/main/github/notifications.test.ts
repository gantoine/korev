import { describe, expect, it } from 'vitest';
import { createGithubClient } from './client';
import {
  type NotificationThread,
  shouldRefreshFromNotifications,
} from './notifications';
import { type CannedResponse, createFakeFetch } from './test-fetch';

const TOKEN = 'gho_token';
const API_URL = 'https://api.github.com';
const LAST_SEEN = '2026-10-03T12:00:00Z';
const BEFORE_LAST_SEEN = '2026-10-03T11:59:00Z';
const AFTER_LAST_SEEN = '2026-10-03T12:05:00Z';
const LAST_MODIFIED = 'Sat, 03 Oct 2026 12:05:00 GMT';

function rawThread(
  updatedAt: string,
  { repo = 'acme/api', type = 'PullRequest', unread = true } = {},
) {
  return {
    unread,
    updated_at: updatedAt,
    subject: { type },
    repository: { full_name: repo },
  };
}

function thread(
  updatedAt: string,
  overrides: Partial<NotificationThread> = {},
): NotificationThread {
  return { repo: 'acme/api', type: 'PullRequest', updatedAt, ...overrides };
}

function page(threads: unknown[], nextPage?: number): CannedResponse {
  const link = nextPage
    ? `<${API_URL}/notifications?all=true&per_page=50&page=${nextPage}>; rel="next"`
    : undefined;
  return {
    headers: {
      'X-Poll-Interval': '90',
      'Last-Modified': LAST_MODIFIED,
      ...(link ? { Link: link } : {}),
    },
    body: threads,
  };
}

function setup(...replies: CannedResponse[]) {
  const fake = createFakeFetch(...replies);
  const client = createGithubClient({ fetch: fake.fetch, apiUrl: API_URL });
  return { fake, client };
}

const watch = { repos: ['acme/api'], lastSeenUpdatedAt: LAST_SEEN };

describe('checkNotifications', () => {
  it('reports not modified on a 304 and sends the conditional request', async () => {
    const { fake, client } = setup({ status: 304 });

    const result = await client.checkNotifications(TOKEN, {
      since: LAST_SEEN,
      ifModifiedSince: LAST_MODIFIED,
    });

    expect(result).toEqual({ status: 'not_modified' });
    const url = new URL(fake.requests[0].url);
    expect(url.pathname).toBe('/notifications');
    expect(url.searchParams.get('all')).toBe('true');
    expect(url.searchParams.get('since')).toBe(LAST_SEEN);
    expect(fake.requests[0].headers['If-Modified-Since']).toBe(LAST_MODIFIED);
  });

  it('reads both pages and still refreshes for threads already read', async () => {
    const { fake, client } = setup(
      page([rawThread(BEFORE_LAST_SEEN, { unread: false })], 2),
      page([rawThread(AFTER_LAST_SEEN, { unread: false })]),
    );

    const result = await client.checkNotifications(TOKEN, {
      since: null,
      ifModifiedSince: null,
    });

    expect(fake.requests).toHaveLength(2);
    expect(new URL(fake.requests[0].url).searchParams.has('since')).toBe(false);
    expect(result).toEqual({
      status: 'ok',
      threads: [thread(BEFORE_LAST_SEEN), thread(AFTER_LAST_SEEN)],
      lastModified: LAST_MODIFIED,
      pollIntervalSeconds: 90,
    });
    if (result.status !== 'ok') return;
    expect(shouldRefreshFromNotifications(result.threads, watch)).toEqual({
      refresh: true,
      newestUpdatedAt: AFTER_LAST_SEEN,
    });
  });

  it('stops following next links after five pages', async () => {
    const pages = [2, 3, 4, 5, 6].map((next) =>
      page([rawThread(BEFORE_LAST_SEEN)], next),
    );
    const { fake, client } = setup(...pages);

    await client.checkNotifications(TOKEN, {
      since: null,
      ifModifiedSince: null,
    });

    expect(fake.requests).toHaveLength(5);
  });
});

describe('shouldRefreshFromNotifications', () => {
  it('ignores threads not newer than the last one seen', () => {
    expect(
      shouldRefreshFromNotifications(
        [thread(BEFORE_LAST_SEEN), thread(LAST_SEEN)],
        watch,
      ),
    ).toEqual({ refresh: false, newestUpdatedAt: null });
  });

  it('refreshes for a newer PR thread on a selected repo and reports the newest', () => {
    const newest = '2026-10-03T12:09:00Z';

    expect(
      shouldRefreshFromNotifications(
        [thread(AFTER_LAST_SEEN), thread(newest), thread(BEFORE_LAST_SEEN)],
        watch,
      ),
    ).toEqual({ refresh: true, newestUpdatedAt: newest });
  });

  it('ignores unselected repos and threads that are not pull requests', () => {
    expect(
      shouldRefreshFromNotifications(
        [
          thread(AFTER_LAST_SEEN, { repo: 'acme/web' }),
          thread(AFTER_LAST_SEEN, { type: 'Issue' }),
        ],
        watch,
      ),
    ).toEqual({ refresh: false, newestUpdatedAt: null });
  });
});
