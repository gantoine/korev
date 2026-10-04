import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import type { AddressInfo } from 'node:net';

export const VIEWER_LOGIN = 'maria';
export const API_REPO = 'acme/api';
export const WEB_REPO = 'acme/web';
export const FAILING_PR_TITLE = 'Rate-limit per tenant on ingestion endpoints';
export const NEW_PR_TITLE = 'Bump OpenTelemetry to 1.31';
export const WEB_PR_TITLE = 'Settings: org access states';

const GRANTED_SCOPES = 'repo, read:org';
const POLL_INTERVAL_SECONDS = '1';
const LOCAL_HOST = '127.0.0.1';
const ACCESS_ALIAS =
  /(repo\d+): repository\(owner: \$(owner\d+), name: \$(name\d+)\)/g;
const SEARCH_ALIAS = /(\w+): search\(/g;

interface GraphqlRequest {
  query: string;
  variables?: Record<string, unknown>;
}

interface PrSpec {
  repo: string;
  number: number;
  title: string;
  mergeStateStatus: string;
  rollup: string;
  conclusion: string;
}

const FAILING_PR: PrSpec = {
  repo: API_REPO,
  number: 491,
  title: FAILING_PR_TITLE,
  mergeStateStatus: 'BLOCKED',
  rollup: 'FAILURE',
  conclusion: 'FAILURE',
};

const NEW_PR: PrSpec = {
  repo: API_REPO,
  number: 480,
  title: NEW_PR_TITLE,
  mergeStateStatus: 'CLEAN',
  rollup: 'SUCCESS',
  conclusion: 'SUCCESS',
};

const WEB_PR: PrSpec = {
  repo: WEB_REPO,
  number: 304,
  title: WEB_PR_TITLE,
  mergeStateStatus: 'CLEAN',
  rollup: 'SUCCESS',
  conclusion: 'SUCCESS',
};

function prNode(spec: PrSpec) {
  return {
    id: `PR_${spec.number}`,
    number: spec.number,
    title: spec.title,
    url: `https://github.com/${spec.repo}/pull/${spec.number}`,
    state: 'OPEN',
    isDraft: false,
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-10-03T10:00:00Z',
    repository: { nameWithOwner: spec.repo },
    author: { login: VIEWER_LOGIN, avatarUrl: null },
    reviewDecision: null,
    mergeable: 'MERGEABLE',
    mergeStateStatus: spec.mergeStateStatus,
    additions: 12,
    deletions: 3,
    changedFiles: 2,
    statusCheckRollup: {
      state: spec.rollup,
      contexts: {
        nodes: [
          {
            __typename: 'CheckRun',
            name: 'test',
            status: 'COMPLETED',
            conclusion: spec.conclusion,
          },
        ],
      },
    },
    latestReviews: { nodes: [] },
    stack: null,
    stackEntry: null,
    reviewThreads: {
      pageInfo: { hasNextPage: false, endCursor: null },
      nodes: [],
    },
  };
}

function connection(nodes: unknown[]) {
  return { pageInfo: { hasNextPage: false, endCursor: null }, nodes };
}

function accessAliases(request: GraphqlRequest) {
  const variables = request.variables ?? {};
  return Object.fromEntries(
    [...request.query.matchAll(ACCESS_ALIAS)].map(([, alias, owner, name]) => [
      alias,
      {
        nameWithOwner: `${variables[owner]}/${variables[name]}`,
        viewerPermission: 'WRITE',
        isArchived: false,
      },
    ]),
  );
}

function suggestedRepos(request: GraphqlRequest) {
  const nodes = [API_REPO, WEB_REPO].map((nameWithOwner) => ({
    repository: { nameWithOwner },
  }));
  return Object.fromEntries(
    [...request.query.matchAll(SEARCH_ALIAS)].map(([, alias]) => [
      alias,
      { nodes },
    ]),
  );
}

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString('utf8');
}

function sendJson(response: ServerResponse, body: unknown, headers = {}) {
  response.writeHead(200, {
    'content-type': 'application/json',
    'x-oauth-scopes': GRANTED_SCOPES,
    ...headers,
  });
  response.end(JSON.stringify(body));
}

export interface FakeGithub {
  url: string;
  publishNewPr(): void;
  holdInbox(): void;
  releaseInbox(): void;
  close(): Promise<void>;
}

export async function startFakeGithub(): Promise<FakeGithub> {
  const myPrs: PrSpec[] = [FAILING_PR, WEB_PR];
  let pendingThreadAt: string | null = null;
  let inboxGate: Promise<void> = Promise.resolve();
  let openInboxGate = () => undefined as void;

  function graphqlData(request: GraphqlRequest) {
    const { query } = request;
    if (query.includes('query SuggestedRepos')) return suggestedRepos(request);
    if (query.includes('query ViewerTeams')) {
      return { viewer: { organizations: { nodes: [] } } };
    }
    if (query.includes('query RepoOwners')) {
      return { viewer: { login: VIEWER_LOGIN, organizations: { nodes: [] } } };
    }
    if (query.includes('query Inbox')) {
      return {
        viewer: { login: VIEWER_LOGIN, avatarUrl: null },
        ...accessAliases(request),
        mine: connection(myPrs.map(prNode)),
        reviews: connection([]),
      };
    }
    return { viewer: { login: VIEWER_LOGIN, avatarUrl: null } };
  }

  function notifications(response: ServerResponse) {
    const threads = pendingThreadAt
      ? [
          {
            repository: { full_name: API_REPO },
            subject: { type: 'PullRequest' },
            updated_at: pendingThreadAt,
          },
        ]
      : [];
    response.writeHead(200, {
      'content-type': 'application/json',
      'x-poll-interval': POLL_INTERVAL_SECONDS,
    });
    response.end(JSON.stringify(threads));
  }

  async function handle(request: IncomingMessage, response: ServerResponse) {
    if (request.url?.startsWith('/notifications'))
      return notifications(response);
    if (request.method === 'POST' && request.url === '/graphql') {
      const body = JSON.parse(await readBody(request)) as GraphqlRequest;
      if (body.query.includes('query Inbox')) await inboxGate;
      return sendJson(response, { data: graphqlData(body) });
    }
    response.writeHead(404).end();
  }

  const server = createServer((request, response) => {
    void handle(request, response);
  });
  await new Promise<void>((resolve) => server.listen(0, LOCAL_HOST, resolve));
  const { port } = server.address() as AddressInfo;

  return {
    url: `http://${LOCAL_HOST}:${port}`,
    publishNewPr() {
      myPrs.push(NEW_PR);
      pendingThreadAt = new Date().toISOString();
    },
    holdInbox() {
      inboxGate = new Promise((resolve) => {
        openInboxGate = resolve;
      });
    },
    releaseInbox() {
      openInboxGate();
    },
    close: () => {
      openInboxGate();
      server.closeAllConnections();
      return new Promise((resolve) => server.close(() => resolve()));
    },
  };
}
