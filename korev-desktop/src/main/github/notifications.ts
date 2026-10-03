import { NOTIFICATIONS_PAGE_CAP, NOTIFICATIONS_PAGE_SIZE } from './config';
import {
  type FetchLike,
  type GithubResponse,
  type ResponseHeaders,
  githubRequest,
  numericHeader,
} from './request';

export interface NotificationThread {
  repo: string;
  type: string;
  updatedAt: string;
}

export interface NotificationsRequest {
  since: string | null;
  ifModifiedSince: string | null;
  signal?: AbortSignal;
}

export type NotificationsResult =
  | { status: 'not_modified' }
  | {
      status: 'ok';
      threads: NotificationThread[];
      lastModified: string | null;
      pollIntervalSeconds: number | null;
    };

export interface NotificationsWatch {
  repos: string[];
  lastSeenUpdatedAt: string;
}

export interface RefreshDecision {
  refresh: boolean;
  newestUpdatedAt: string | null;
}

interface RawThread {
  repository?: { full_name?: unknown } | null;
  subject?: { type?: unknown } | null;
  updated_at?: unknown;
}

const HTTP_NOT_MODIFIED = 304;
const PULL_REQUEST_SUBJECT = 'PullRequest';
const NEXT_LINK_PATTERN = /<([^>]+)>;\s*rel="next"/;

export async function fetchNotifications(
  fetchImpl: FetchLike,
  apiUrl: string,
  token: string,
  request: NotificationsRequest,
): Promise<NotificationsResult> {
  const firstPage = await githubRequest(fetchImpl, {
    url: firstPageUrl(apiUrl, request.since),
    token,
    headers: conditionalHeaders(request.ifModifiedSince),
    signal: request.signal,
  });
  if (firstPage.status === HTTP_NOT_MODIFIED) return { status: 'not_modified' };
  const threads = await collectThreads(
    fetchImpl,
    apiUrl,
    token,
    firstPage,
    request.signal,
  );
  return {
    status: 'ok',
    threads,
    lastModified: firstPage.headers.get('last-modified'),
    pollIntervalSeconds: numericHeader(firstPage.headers, 'x-poll-interval'),
  };
}

export function shouldRefreshFromNotifications(
  threads: NotificationThread[],
  { repos, lastSeenUpdatedAt }: NotificationsWatch,
): RefreshDecision {
  const selected = new Set(repos.map(normalizeRepo));
  const lastSeen = Date.parse(lastSeenUpdatedAt);
  const relevant = threads.filter(
    (thread) =>
      thread.type === PULL_REQUEST_SUBJECT &&
      selected.has(normalizeRepo(thread.repo)) &&
      Date.parse(thread.updatedAt) > lastSeen,
  );
  return {
    refresh: relevant.length > 0,
    newestUpdatedAt: newestUpdatedAt(relevant),
  };
}

async function collectThreads(
  fetchImpl: FetchLike,
  apiUrl: string,
  token: string,
  firstPage: GithubResponse,
  signal: AbortSignal | undefined,
): Promise<NotificationThread[]> {
  const threads = toThreads(firstPage.body);
  let nextUrl = nextPageUrl(firstPage.headers, apiUrl);
  for (let pages = 1; nextUrl && pages < NOTIFICATIONS_PAGE_CAP; pages += 1) {
    const page = await githubRequest(fetchImpl, {
      url: nextUrl,
      token,
      signal,
    });
    threads.push(...toThreads(page.body));
    nextUrl = nextPageUrl(page.headers, apiUrl);
  }
  return threads;
}

function firstPageUrl(apiUrl: string, since: string | null): string {
  const params = new URLSearchParams({
    all: 'true',
    per_page: String(NOTIFICATIONS_PAGE_SIZE),
  });
  if (since) params.set('since', since);
  return `${apiUrl}/notifications?${params.toString()}`;
}

function conditionalHeaders(
  ifModifiedSince: string | null,
): Record<string, string> {
  return ifModifiedSince ? { 'If-Modified-Since': ifModifiedSince } : {};
}

function nextPageUrl(headers: ResponseHeaders, apiUrl: string): string | null {
  const link = headers.get('link');
  const nextUrl = link ? (NEXT_LINK_PATTERN.exec(link)?.[1] ?? null) : null;
  if (!nextUrl?.startsWith(`${apiUrl}/`)) return null;
  return nextUrl;
}

function toThreads(body: unknown): NotificationThread[] {
  if (!Array.isArray(body)) return [];
  return body.flatMap(toThread);
}

function toThread(raw: RawThread | null): NotificationThread[] {
  const repo = raw?.repository?.full_name;
  const type = raw?.subject?.type;
  const updatedAt = raw?.updated_at;
  if (typeof repo !== 'string' || typeof type !== 'string') return [];
  if (typeof updatedAt !== 'string') return [];
  return [{ repo, type, updatedAt }];
}

function normalizeRepo(repo: string): string {
  return repo.toLowerCase();
}

function newestUpdatedAt(threads: NotificationThread[]): string | null {
  return threads.reduce<string | null>(
    (newest, thread) =>
      newest === null || Date.parse(thread.updatedAt) > Date.parse(newest)
        ? thread.updatedAt
        : newest,
    null,
  );
}
