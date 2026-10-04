import { describe, expect, it } from 'vitest';
import { createGithubClient } from './client';
import { GITHUB_OAUTH_CLIENT_ID } from './config';
import { ORG_RESTRICTION_MESSAGE } from './fixtures/access-errors';
import {
  type CannedResponse,
  createFakeFetch,
  graphqlBody,
} from './test-fetch';

const TOKEN = 'gho_token';
const API_URL = 'https://api.github.com';

const ownersResponse: CannedResponse = {
  body: {
    data: {
      viewer: {
        login: 'maria',
        organizations: { nodes: [{ login: 'acme' }, { login: 'globex' }] },
      },
    },
  },
};

function repoPageData(repos: (string | null)[], endCursor: string | null) {
  return {
    repositoryOwner: {
      repositories: {
        totalCount: 250,
        pageInfo: { hasNextPage: endCursor !== null, endCursor },
        nodes: repos.map((nameWithOwner) =>
          nameWithOwner ? { nameWithOwner } : null,
        ),
      },
    },
  };
}

function repoPageResponse(
  repos: string[],
  endCursor: string | null,
): CannedResponse {
  return { body: { data: repoPageData(repos, endCursor) } };
}

function searchResponse(repos: string[]): CannedResponse {
  return {
    body: {
      data: {
        search: { nodes: repos.map((nameWithOwner) => ({ nameWithOwner })) },
      },
    },
  };
}

function setup(...replies: CannedResponse[]) {
  const fake = createFakeFetch(...replies);
  const client = createGithubClient({ fetch: fake.fetch, apiUrl: API_URL });
  const variablesOf = (index: number) =>
    graphqlBody(fake.requests[index]).variables;
  return { fake, client, variablesOf };
}

describe('repo picker', () => {
  it('lists the viewer first and then each organization', async () => {
    const { client } = setup(ownersResponse);

    const owners = await client.fetchRepoOwners(TOKEN);

    expect(owners).toEqual([
      { login: 'maria', kind: 'viewer', access: 'ok', actionUrl: null },
      { login: 'acme', kind: 'org', access: 'ok', actionUrl: null },
      { login: 'globex', kind: 'org', access: 'ok', actionUrl: null },
    ]);
  });

  it('serves a page it already loaded without asking GitHub again', async () => {
    const { fake, client, variablesOf } = setup(
      repoPageResponse(['acme/api', 'acme/web'], 'cursor-100'),
      repoPageResponse(['acme/old'], null),
    );

    const first = await client.fetchRepoPage(TOKEN, 'acme', null);
    const second = await client.fetchRepoPage(TOKEN, 'acme', 'cursor-100');
    const again = await client.fetchRepoPage(TOKEN, 'acme', 'cursor-100');

    expect(first).toEqual({
      owner: 'acme',
      repos: ['acme/api', 'acme/web'],
      totalCount: 250,
      nextCursor: 'cursor-100',
      access: 'ok',
      actionUrl: null,
    });
    expect(variablesOf(1)).toEqual({ owner: 'acme', cursor: 'cursor-100' });
    expect(again).toBe(second);
    expect(fake.requests).toHaveLength(2);
  });

  it('marks an organization with OAuth App restrictions instead of failing', async () => {
    const restricted: CannedResponse = {
      body: {
        data: repoPageData([null], null),
        errors: [
          {
            type: 'FORBIDDEN',
            path: ['repositoryOwner', 'repositories', 'nodes', 0],
            message: ORG_RESTRICTION_MESSAGE,
          },
        ],
      },
    };
    const { client } = setup(restricted, ownersResponse);
    const actionUrl = `https://github.com/settings/connections/applications/${GITHUB_OAUTH_CLIENT_ID}`;

    const page = await client.fetchRepoPage(TOKEN, 'acme', null);
    const owners = await client.fetchRepoOwners(TOKEN);

    expect(page).toMatchObject({ repos: [], access: 'restricted', actionUrl });
    expect(owners.find((owner) => owner.login === 'acme')).toMatchObject({
      access: 'restricted',
      actionUrl,
    });
  });

  it('searches repo names inside the owner and drops search operators from the term', async () => {
    const { client, variablesOf } = setup(
      ownersResponse,
      searchResponse(['acme/api', 'evil/api']),
      searchResponse([]),
    );
    await client.fetchRepoOwners(TOKEN);

    const found = await client.searchRepos(TOKEN, 'acme', '"api" -fork:true');
    await client.searchRepos(TOKEN, 'maria', 'dots');

    expect(variablesOf(1)).toEqual({ query: 'org:acme api fork true in:name' });
    expect(variablesOf(2)).toEqual({ query: 'user:maria dots in:name' });
    expect(found).toEqual(['acme/api']);
  });
});
