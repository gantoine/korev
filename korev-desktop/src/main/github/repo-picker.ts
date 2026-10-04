import type { OwnerAccess, RepoOwner, RepoPage } from '../../shared/repos';
import { isOwnedBy, isOwnerLogin } from '../repo-names';
import {
  type OwnerDenial,
  SSO_HEADER,
  deniedAccess,
  ownerDenial,
} from './access';
import {
  GithubError,
  GraphqlQueryError,
  OrgRestrictedError,
  SsoRequiredError,
  redactToken,
} from './errors';
import type { GraphqlResult } from './graphql';
import { type Connection, presentNodes } from './nodes';
import {
  type OwnerQualifier,
  REPO_OWNERS_QUERY,
  REPO_PAGE_QUERY,
  REPO_SEARCH_QUERY,
  repoSearchString,
} from './queries';

export type GraphqlQuery = <TData>(
  token: string,
  query: string,
  variables: Record<string, unknown>,
) => Promise<GraphqlResult<TData>>;

interface OwnerAccessState {
  access: OwnerAccess;
  actionUrl: string | null;
}

interface RepoOwnersData {
  viewer: { login: string; organizations?: Connection<{ login: string }> };
}

type RepositoryConnection = Connection<{ nameWithOwner: string }> & {
  totalCount: number;
};

interface RepoPageData {
  repositoryOwner?: { repositories?: RepositoryConnection } | null;
}

interface RepoSearchData {
  search?: Connection<{ nameWithOwner?: string }>;
}

const OPEN_ACCESS: OwnerAccessState = { access: 'ok', actionUrl: null };
const SEARCH_WORD_SEPARATOR = /[^\w.-]+/;
const LEADING_NEGATION = /^-+/;

export class InvalidOwnerError extends GithubError {}

export function emptyRepoPage(owner: string): RepoPage {
  return { owner, repos: [], totalCount: 0, nextCursor: null, ...OPEN_ACCESS };
}

export function searchWords(term: string): string {
  return term
    .split(SEARCH_WORD_SEPARATOR)
    .map((word) => word.replace(LEADING_NEGATION, ''))
    .filter((word) => word !== '')
    .join(' ');
}

export class RepoPicker {
  #pages = new Map<string, RepoPage>();
  #denials = new Map<string, OwnerDenial>();
  #orgs = new Set<string>();

  constructor(private readonly query: GraphqlQuery) {}

  clear(): void {
    this.#pages.clear();
    this.#denials.clear();
    this.#orgs.clear();
  }

  async owners(token: string): Promise<RepoOwner[]> {
    const result = await this.query<RepoOwnersData>(
      token,
      REPO_OWNERS_QUERY,
      {},
    );
    const { viewer } = result.data;
    const orgs = presentNodes(viewer.organizations).map((org) => org.login);
    this.#orgs = new Set(orgs);
    return [
      this.#owner(viewer.login, 'viewer'),
      ...orgs.map((login) => this.#owner(login, 'org')),
    ];
  }

  async page(
    token: string,
    owner: string,
    cursor: string | null,
  ): Promise<RepoPage> {
    assertOwnerLogin(owner);
    const key = pageKey(owner, cursor);
    const cached = this.#pages.get(key);
    if (cached) return cached;
    const page = await this.#loadPage(token, owner, cursor);
    this.#remember(key, page);
    return page;
  }

  async search(token: string, owner: string, term: string): Promise<string[]> {
    assertOwnerLogin(owner);
    const words = searchWords(term);
    if (words === '') return [];
    const result = await this.query<RepoSearchData>(token, REPO_SEARCH_QUERY, {
      query: repoSearchString(this.#qualifier(owner), owner, words),
    });
    return presentNodes(result.data.search).flatMap(({ nameWithOwner }) =>
      nameWithOwner && isOwnedBy(nameWithOwner, owner) ? [nameWithOwner] : [],
    );
  }

  async #loadPage(
    token: string,
    owner: string,
    cursor: string | null,
  ): Promise<RepoPage> {
    try {
      const result = await this.query<RepoPageData>(token, REPO_PAGE_QUERY, {
        owner,
        cursor,
      });
      return toRepoPage(owner, result, token);
    } catch (error) {
      const denial = thrownDenial(error, owner);
      if (!denial) throw error;
      return deniedPage(owner, denial);
    }
  }

  #remember(key: string, page: RepoPage): void {
    if (page.access === 'ok') {
      this.#denials.delete(page.owner);
      this.#pages.set(key, page);
      return;
    }
    this.#denials.set(page.owner, {
      access: page.access,
      actionUrl: page.actionUrl,
    });
  }

  #owner(login: string, kind: RepoOwner['kind']): RepoOwner {
    return { login, kind, ...(this.#denials.get(login) ?? OPEN_ACCESS) };
  }

  #qualifier(owner: string): OwnerQualifier {
    return this.#orgs.has(owner) ? 'org' : 'user';
  }
}

function assertOwnerLogin(owner: string): void {
  if (!isOwnerLogin(owner)) {
    throw new InvalidOwnerError(`Not a GitHub account name: ${owner}`);
  }
}

function pageKey(owner: string, cursor: string | null): string {
  return JSON.stringify([owner, cursor]);
}

function toRepoPage(
  owner: string,
  result: GraphqlResult<RepoPageData>,
  token: string,
): RepoPage {
  const ssoHeader = result.headers.get(SSO_HEADER);
  const denial = ownerDenial(result.errors, owner, ssoHeader);
  if (denial) return deniedPage(owner, denial);
  const repositories = result.data.repositoryOwner?.repositories;
  if (!repositories) throw unreadableOwnerError(owner, result, token);
  return {
    owner,
    repos: presentNodes(repositories).map((node) => node.nameWithOwner),
    totalCount: repositories.totalCount,
    nextCursor: nextCursorOf(repositories),
    ...OPEN_ACCESS,
  };
}

function unreadableOwnerError(
  owner: string,
  result: GraphqlResult<RepoPageData>,
  token: string,
): GraphqlQueryError {
  const messages = result.errors.map((error) =>
    redactToken(error.message, token),
  );
  if (messages.length > 0) return new GraphqlQueryError(messages);
  return new GraphqlQueryError([`Couldn't load the repos of ${owner}.`]);
}

function nextCursorOf(connection: RepositoryConnection): string | null {
  if (!connection.pageInfo?.hasNextPage) return null;
  return connection.pageInfo.endCursor ?? null;
}

function deniedPage(owner: string, denial: OwnerDenial): RepoPage {
  return { ...emptyRepoPage(owner), ...denial };
}

function thrownDenial(error: unknown, owner: string): OwnerDenial | null {
  if (error instanceof OrgRestrictedError) {
    return deniedAccess('restricted', owner, null);
  }
  if (error instanceof SsoRequiredError) {
    return deniedAccess('sso', error.org ?? owner, null);
  }
  if (error instanceof GraphqlQueryError) {
    const signals = error.messages.map((message) => ({ message }));
    return ownerDenial(signals, owner, null);
  }
  return null;
}
