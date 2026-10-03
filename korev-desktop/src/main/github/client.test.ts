import { describe, expect, it } from 'vitest';
import { createGithubClient } from './client';
import { GraphqlQueryError } from './errors';
import inboxPage from './fixtures/inbox-page.json';
import type { GraphqlError } from './graphql';
import type { PullRequestNode } from './nodes';
import {
  type CannedResponse,
  type FakeFetch,
  createFakeFetch,
  graphqlBody,
} from './test-fetch';

const TOKEN = 'gho_token';
const API_URL = 'https://api.github.com';
const [stackedNode, singleNode] = inboxPage.data.mine
  .nodes as PullRequestNode[];
const [reviewNode] = inboxPage.data.reviews.nodes as PullRequestNode[];

interface PageOptions {
  mine?: PullRequestNode[] | null;
  mineCursor?: string | null;
  reviews?: (PullRequestNode | null)[] | null;
  reviewsCursor?: string | null;
  errors?: GraphqlError[];
}

function searchPage(
  nodes: (PullRequestNode | null)[] | null | undefined,
  cursor: string | null | undefined,
) {
  if (nodes === undefined) return undefined;
  if (nodes === null) return null;
  return {
    pageInfo: { hasNextPage: Boolean(cursor), endCursor: cursor ?? null },
    nodes,
  };
}

function inboxResponse(options: PageOptions): CannedResponse {
  return {
    body: {
      data: {
        viewer: inboxPage.data.viewer,
        mine: searchPage(options.mine, options.mineCursor),
        reviews: searchPage(options.reviews, options.reviewsCursor),
      },
      errors: options.errors,
    },
  };
}

const teamsResponse: CannedResponse = {
  body: {
    data: {
      viewer: {
        organizations: {
          nodes: [{ login: 'acme', teams: { nodes: [{ slug: 'backend' }] } }],
        },
      },
    },
  },
};

function pr(
  base: PullRequestNode,
  number: number,
  repo = 'acme/api',
): PullRequestNode {
  return {
    ...base,
    id: `PR_${repo}_${number}`,
    number,
    repository: { nameWithOwner: repo },
  };
}

function prs(count: number, offset = 0): PullRequestNode[] {
  return Array.from({ length: count }, (_, index) =>
    pr(singleNode, offset + index + 1),
  );
}

function setup(...replies: CannedResponse[]) {
  const fake = createFakeFetch(...replies);
  const client = createGithubClient({ fetch: fake.fetch, apiUrl: API_URL });
  return { fake, client };
}

function variablesOf(fake: FakeFetch, index: number) {
  return graphqlBody(fake.requests[index]).variables;
}

function queryOf(fake: FakeFetch, index: number) {
  return graphqlBody(fake.requests[index]).query;
}

describe('createGithubClient', () => {
  describe('fetchInbox', () => {
    it('sends nothing when no repos are selected', async () => {
      const { fake, client } = setup();

      const inbox = await client.fetchInbox(TOKEN, []);

      expect(fake.requests).toHaveLength(0);
      expect(inbox.mine).toEqual([]);
      expect(inbox.reviews).toEqual([]);
    });

    it('adds one repo qualifier to both searches', async () => {
      const { fake, client } = setup(
        inboxResponse({ mine: [], reviews: [] }),
        teamsResponse,
      );

      await client.fetchInbox(TOKEN, ['acme/api']);

      expect(variablesOf(fake, 0)).toMatchObject({
        mineQuery: 'is:open is:pr author:@me archived:false repo:acme/api',
        reviewsQuery:
          'is:open is:pr review-requested:@me archived:false repo:acme/api',
      });
    });

    it('adds a qualifier for each of 40 repos', async () => {
      const repos = Array.from(
        { length: 40 },
        (_, index) => `acme/svc-${index}`,
      );
      const { fake, client } = setup(
        inboxResponse({ mine: [], reviews: [] }),
        teamsResponse,
      );

      await client.fetchInbox(TOKEN, repos);

      const { mineQuery, reviewsQuery } = variablesOf(fake, 0);
      for (const repo of repos) {
        expect(String(mineQuery).split(' ')).toContain(`repo:${repo}`);
        expect(String(reviewsQuery).split(' ')).toContain(`repo:${repo}`);
      }
    });

    it('follows the cursor of the search that still has pages and merges them', async () => {
      const { fake, client } = setup(
        inboxResponse({
          mine: [pr(singleNode, 1)],
          mineCursor: 'cursor-1',
          reviews: [reviewNode],
        }),
        inboxResponse({ mine: [pr(singleNode, 2)] }),
        teamsResponse,
      );

      const inbox = await client.fetchInbox(TOKEN, ['acme/api']);

      expect(variablesOf(fake, 1)).toMatchObject({
        includeMine: true,
        includeReviews: false,
        mineCursor: 'cursor-1',
      });
      expect(inbox.mine.map((item) => item.number)).toEqual([1, 2]);
      expect(inbox.reviews.map((item) => item.number)).toEqual([530]);
      expect(inbox.viewerTeams).toEqual([{ org: 'acme', slug: 'backend' }]);
      expect(inbox.truncated).toEqual({ mine: false, reviews: false });
    });

    it('stops at 300 PRs and marks the search truncated', async () => {
      const pages = Array.from({ length: 12 }, (_, page) =>
        inboxResponse({
          mine: prs(25, page * 25),
          mineCursor: `cursor-${page + 1}`,
          reviews: page === 0 ? [] : undefined,
        }),
      );
      const { fake, client } = setup(...pages, teamsResponse);

      const inbox = await client.fetchInbox(TOKEN, ['acme/api']);

      expect(inbox.mine).toHaveLength(300);
      expect(inbox.truncated.mine).toBe(true);
      expect(fake.requests).toHaveLength(13);
    });

    it('keeps the good PRs and names the repo when part of the query fails', async () => {
      const { client } = setup(
        inboxResponse({
          mine: [pr(singleNode, 7, 'acme/web')],
          reviews: [reviewNode, null],
          errors: [
            {
              message: 'Resource not accessible by integration',
              path: ['reviews', 'nodes', 0, 'files'],
            },
            {
              message: 'Resource protected by organization SAML enforcement.',
              path: ['reviews', 'nodes', 1],
            },
          ],
        }),
        teamsResponse,
      );

      const inbox = await client.fetchInbox(TOKEN, ['acme/api', 'acme/web']);

      expect(inbox.mine.map((item) => item.number)).toEqual([7]);
      expect(inbox.reviews.map((item) => item.number)).toEqual([530]);
      expect(inbox.problems).toEqual([
        { repo: 'acme/api', message: 'Resource not accessible by integration' },
        {
          repo: null,
          message: 'Resource protected by organization SAML enforcement.',
        },
      ]);
    });

    it('resends without stacks when GitHub rejects the stack field and stays off for the session', async () => {
      const stackRejected: CannedResponse = {
        body: {
          errors: [
            {
              message: "Field 'stack' doesn't exist on type 'PullRequest'",
              extensions: { code: 'undefinedField', fieldName: 'stack' },
            },
          ],
        },
      };
      const { fake, client } = setup(
        stackRejected,
        inboxResponse({ mine: [pr(singleNode, 1)], reviews: [] }),
        teamsResponse,
        inboxResponse({ mine: [], reviews: [] }),
      );

      const first = await client.fetchInbox(TOKEN, ['acme/api']);
      const second = await client.fetchInbox(TOKEN, ['acme/api']);

      expect(queryOf(fake, 0)).toContain('stackEntry');
      expect(queryOf(fake, 1)).not.toContain('stackEntry');
      expect(queryOf(fake, 3)).not.toContain('stackEntry');
      expect(first.mine).toHaveLength(1);
      expect(first.stacksUnavailable).toBe(true);
      expect(second.stacksUnavailable).toBe(true);
      expect(fake.requests).toHaveLength(4);
    });

    it('throws when GitHub rejects the query for any other reason', async () => {
      const { client } = setup({
        body: {
          errors: [
            {
              message: "Field 'files' doesn't exist on type 'PullRequest'",
              extensions: { code: 'undefinedField', fieldName: 'files' },
            },
          ],
        },
      });

      await expect(
        client.fetchInbox(TOKEN, ['acme/api']),
      ).rejects.toBeInstanceOf(GraphqlQueryError);
    });

    it('fetches the remaining review threads so thread #101 counts', async () => {
      const busyNode: PullRequestNode = {
        ...pr(stackedNode, 9),
        reviewThreads: {
          pageInfo: { hasNextPage: true, endCursor: 'threads-100' },
          nodes: Array.from({ length: 100 }, () => ({ isResolved: true })),
        },
      };
      const { fake, client } = setup(
        inboxResponse({ mine: [busyNode], reviews: [] }),
        {
          body: {
            data: {
              node: {
                reviewThreads: {
                  pageInfo: { hasNextPage: false, endCursor: 'threads-101' },
                  nodes: [{ isResolved: false }],
                },
              },
            },
          },
        },
        teamsResponse,
      );

      const inbox = await client.fetchInbox(TOKEN, ['acme/api']);

      expect(variablesOf(fake, 1)).toEqual({
        id: busyNode.id,
        cursor: 'threads-100',
      });
      expect(inbox.mine[0].unresolvedThreads).toBe(1);
    });

    it('fetches the viewer teams once per session', async () => {
      const { fake, client } = setup(
        inboxResponse({ mine: [], reviews: [] }),
        teamsResponse,
        inboxResponse({ mine: [], reviews: [] }),
        inboxResponse({ mine: [], reviews: [] }),
        teamsResponse,
      );

      await client.fetchInbox(TOKEN, ['acme/api']);
      const cached = await client.fetchInbox(TOKEN, ['acme/api']);
      client.clearSessionCache();
      await client.fetchInbox(TOKEN, ['acme/api']);

      expect(cached.viewerTeams).toEqual([{ org: 'acme', slug: 'backend' }]);
      expect(fake.requests).toHaveLength(5);
    });
  });

  it('reads the viewer and the granted scopes', async () => {
    const { client } = setup({
      headers: { 'X-OAuth-Scopes': 'read:org, repo' },
      body: { data: { viewer: inboxPage.data.viewer } },
    });

    expect(await client.fetchViewer(TOKEN)).toEqual({
      login: 'maria',
      avatarUrl: inboxPage.data.viewer.avatarUrl,
      scopes: ['read:org', 'repo'],
    });
  });

  it('suggests repos ordered by how many PRs mention them', async () => {
    const mention = (repo: string) => ({ repository: { nameWithOwner: repo } });
    const { client } = setup({
      body: {
        data: {
          involved: {
            nodes: [mention('acme/web'), mention('acme/api'), {}],
          },
          requested: {
            nodes: [mention('acme/api'), mention('acme/infra')],
          },
        },
      },
    });

    expect(await client.fetchSuggestedRepos(TOKEN)).toEqual([
      'acme/api',
      'acme/infra',
      'acme/web',
    ]);
  });
});
