import {
  GraphqlQueryError,
  RateLimitedError,
  StackFieldRejectedError,
  redactToken,
} from './errors';
import {
  type Clock,
  type FetchLike,
  type ResponseHeaders,
  githubRequest,
  rateLimitResetAt,
} from './request';

export type GraphqlPathSegment = string | number;

export interface GraphqlError {
  message: string;
  type?: string;
  path?: GraphqlPathSegment[];
  extensions?: { code?: string; typeName?: string; fieldName?: string };
}

export interface GraphqlRequest {
  apiUrl: string;
  token: string;
  query: string;
  variables?: Record<string, unknown>;
  signal?: AbortSignal;
  now?: Clock;
}

export interface GraphqlResult<TData> {
  data: TData;
  errors: GraphqlError[];
  headers: ResponseHeaders;
}

interface GraphqlPayload<TData> {
  data?: TData | null;
  errors?: GraphqlError[];
}

const UNDEFINED_FIELD_CODE = 'undefinedField';
const RATE_LIMITED_TYPE = 'RATE_LIMITED';
const DEFAULT_RATE_LIMIT_WAIT_MS = 60_000;
const STACK_FIELD_NAMES = new Set(['stack', 'stackEntry']);
const STACK_TYPE_NAMES = new Set([
  'PullRequestStack',
  'PullRequestStackEntry',
  'PullRequestStackEntryConnection',
]);
const STACK_FIELD_MESSAGE =
  /^Field '(stack|stackEntry)' doesn't exist on type 'PullRequest'/;
const STACK_TYPE_MESSAGE = /on type 'PullRequestStack/;

export async function graphql<TData>(
  fetchImpl: FetchLike,
  request: GraphqlRequest,
): Promise<GraphqlResult<TData>> {
  const now = request.now ?? Date.now;
  const response = await githubRequest(
    fetchImpl,
    {
      url: `${request.apiUrl}/graphql`,
      method: 'POST',
      token: request.token,
      body: { query: request.query, variables: request.variables ?? {} },
      signal: request.signal,
    },
    now,
  );
  const payload = (response.body ?? {}) as GraphqlPayload<TData>;
  const errors = payload.errors ?? [];
  if (payload.data) {
    return { data: payload.data, errors, headers: response.headers };
  }
  throw rejectionError(errors, request.token, response.headers, now);
}

function rejectionError(
  errors: GraphqlError[],
  token: string,
  headers: ResponseHeaders,
  now: Clock,
): Error {
  const messages = errors.map((error) => redactToken(error.message, token));
  if (errors.some(isStackFieldRejection)) {
    return new StackFieldRejectedError(messages.join('; '));
  }
  if (errors.some((error) => error.type === RATE_LIMITED_TYPE)) {
    const resetAt =
      rateLimitResetAt(headers, now) ??
      new Date(now() + DEFAULT_RATE_LIMIT_WAIT_MS);
    return new RateLimitedError(messages.join('; '), resetAt);
  }
  return new GraphqlQueryError(messages);
}

function isStackFieldRejection(error: GraphqlError): boolean {
  return (
    isUndefinedStackField(error.extensions ?? {}) ||
    STACK_FIELD_MESSAGE.test(error.message) ||
    STACK_TYPE_MESSAGE.test(error.message)
  );
}

function isUndefinedStackField(
  extensions: NonNullable<GraphqlError['extensions']>,
): boolean {
  if (extensions.code !== UNDEFINED_FIELD_CODE) return false;
  return (
    STACK_FIELD_NAMES.has(extensions.fieldName ?? '') ||
    STACK_TYPE_NAMES.has(extensions.typeName ?? '')
  );
}
