import {
  CHECK_CONTEXTS_LIMIT,
  FILES_LIMIT,
  ORGANIZATIONS_LIMIT,
  REVIEW_REQUESTS_LIMIT,
  REVIEW_THREADS_LIMIT,
  SEARCH_PAGE_SIZE,
  STACK_ENTRIES_LIMIT,
  SUGGESTED_REPOS_SEARCH_SIZE,
  TEAMS_LIMIT,
  TIMELINE_EVENTS_LIMIT,
} from './config';

export const INBOX_SEARCH = {
  mine: 'is:open is:pr author:@me archived:false',
  reviews: 'is:open is:pr review-requested:@me archived:false',
} as const;

export const SUGGESTED_REPOS_SEARCH = {
  involved: 'is:open is:pr involves:@me archived:false',
  requested: 'is:open is:pr review-requested:@me archived:false',
} as const;

export interface InboxQueryOptions {
  includeStacks: boolean;
}

export type InboxQueryVariables = {
  mineQuery: string;
  reviewsQuery: string;
  includeMine: boolean;
  includeReviews: boolean;
  mineCursor: string | null;
  reviewsCursor: string | null;
};

export function searchString(base: string, repos: string[]): string {
  return [base, ...repos.map((repo) => `repo:${repo}`)].join(' ');
}

const REVIEWER_FIELDS = `
  __typename
  ... on User { login }
  ... on Team { slug organization { login } }
`;

const STACK_FIELDS = `
  stack {
    id
    size
    baseRefName
    entries(first: ${STACK_ENTRIES_LIMIT}) {
      nodes {
        position
        pullRequest { number title url state isDraft author { login } }
      }
    }
  }
  stackEntry { position }
`;

const REVIEW_THREAD_CONNECTION = `
  pageInfo { hasNextPage endCursor }
  nodes { isResolved }
`;

function prCoreFragment({ includeStacks }: InboxQueryOptions): string {
  return `
fragment PrCore on PullRequest {
  id
  number
  title
  url
  state
  isDraft
  createdAt
  updatedAt
  repository { nameWithOwner }
  author { login avatarUrl }
  reviewDecision
  mergeable
  mergeStateStatus
  additions
  deletions
  changedFiles
  statusCheckRollup { state }
  ${includeStacks ? STACK_FIELDS : ''}
}`;
}

const MY_PR_FRAGMENT = `
fragment MyPrFields on PullRequest {
  ...PrCore
  reviewThreads(first: ${REVIEW_THREADS_LIMIT}) { ${REVIEW_THREAD_CONNECTION} }
  statusCheckRollup {
    contexts(first: ${CHECK_CONTEXTS_LIMIT}) {
      nodes {
        __typename
        ... on CheckRun { name status conclusion }
        ... on StatusContext { context state }
      }
    }
  }
}`;

const REVIEW_REQUEST_FRAGMENT = `
fragment ReviewRequestFields on PullRequest {
  ...PrCore
  files(first: ${FILES_LIMIT}) {
    pageInfo { hasNextPage }
    nodes { path additions deletions }
  }
  reviewRequests(first: ${REVIEW_REQUESTS_LIMIT}) {
    nodes { requestedReviewer { ${REVIEWER_FIELDS} } }
  }
  timelineItems(
    itemTypes: [REVIEW_REQUESTED_EVENT]
    last: ${TIMELINE_EVENTS_LIMIT}
  ) {
    nodes {
      ... on ReviewRequestedEvent {
        createdAt
        requestedReviewer { ${REVIEWER_FIELDS} }
      }
    }
  }
}`;

export function buildInboxQuery(options: InboxQueryOptions): string {
  return `
query Inbox(
  $mineQuery: String!
  $reviewsQuery: String!
  $includeMine: Boolean!
  $includeReviews: Boolean!
  $mineCursor: String
  $reviewsCursor: String
) {
  viewer { login avatarUrl }
  mine: search(
    type: ISSUE
    first: ${SEARCH_PAGE_SIZE}
    after: $mineCursor
    query: $mineQuery
  ) @include(if: $includeMine) {
    pageInfo { hasNextPage endCursor }
    nodes { ...MyPrFields }
  }
  reviews: search(
    type: ISSUE
    first: ${SEARCH_PAGE_SIZE}
    after: $reviewsCursor
    query: $reviewsQuery
  ) @include(if: $includeReviews) {
    pageInfo { hasNextPage endCursor }
    nodes { ...ReviewRequestFields }
  }
}
${prCoreFragment(options)}
${MY_PR_FRAGMENT}
${REVIEW_REQUEST_FRAGMENT}`;
}

export const VIEWER_QUERY = `
query Viewer {
  viewer { login avatarUrl }
}`;

export const VIEWER_TEAMS_QUERY = `
query ViewerTeams($login: String!) {
  viewer {
    organizations(first: ${ORGANIZATIONS_LIMIT}) {
      nodes {
        login
        teams(first: ${TEAMS_LIMIT}, userLogins: [$login]) { nodes { slug } }
      }
    }
  }
}`;

export const REVIEW_THREADS_QUERY = `
query ReviewThreads($id: ID!, $cursor: String) {
  node(id: $id) {
    ... on PullRequest {
      reviewThreads(first: ${REVIEW_THREADS_LIMIT}, after: $cursor) {
        ${REVIEW_THREAD_CONNECTION}
      }
    }
  }
}`;

function repositorySearch(alias: string, query: string): string {
  return `
  ${alias}: search(
    type: ISSUE
    first: ${SUGGESTED_REPOS_SEARCH_SIZE}
    query: "${query}"
  ) {
    nodes { ... on PullRequest { repository { nameWithOwner } } }
  }`;
}

export const SUGGESTED_REPOS_QUERY = `
query SuggestedRepos {
  ${Object.entries(SUGGESTED_REPOS_SEARCH)
    .map(([alias, query]) => repositorySearch(alias, query))
    .join('\n')}
}`;
