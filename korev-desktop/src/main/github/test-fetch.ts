import type { FetchInit, FetchLike, FetchResponse } from './request';

export interface CannedResponse {
  status?: number;
  headers?: Record<string, string>;
  body?: unknown;
}

export type CannedReply =
  | CannedResponse
  | Error
  | DOMException
  | ((request: RecordedRequest) => Promise<CannedResponse>);

export interface RecordedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
  signal?: AbortSignal;
}

export interface FakeFetch {
  fetch: FetchLike;
  requests: RecordedRequest[];
  enqueue(...replies: CannedReply[]): void;
}

export function createFakeFetch(...initialReplies: CannedReply[]): FakeFetch {
  const replies = [...initialReplies];
  const requests: RecordedRequest[] = [];
  const fetch: FetchLike = async (url, init) => {
    const request = recordRequest(url, init);
    requests.push(request);
    const reply = replies.shift();
    if (reply === undefined) {
      throw new Error(`Unexpected request to ${url}`);
    }
    return toResponse(await resolveReply(reply, request));
  };
  return { fetch, requests, enqueue: (...more) => replies.push(...more) };
}

export function graphqlBody(request: RecordedRequest): {
  query: string;
  variables: Record<string, unknown>;
} {
  return request.body as {
    query: string;
    variables: Record<string, unknown>;
  };
}

function recordRequest(url: string, init: FetchInit): RecordedRequest {
  return {
    url,
    method: init.method,
    headers: init.headers,
    body: init.body === undefined ? undefined : JSON.parse(init.body),
    signal: init.signal,
  };
}

async function resolveReply(
  reply: CannedReply,
  request: RecordedRequest,
): Promise<CannedResponse> {
  if (reply instanceof Error || reply instanceof DOMException) throw reply;
  if (typeof reply === 'function') return reply(request);
  return reply;
}

function toResponse(canned: CannedResponse): FetchResponse {
  const headers = lowerCaseKeys(canned.headers ?? {});
  return {
    status: canned.status ?? 200,
    headers: { get: (name) => headers[name.toLowerCase()] ?? null },
    text: async () =>
      canned.body === undefined ? '' : JSON.stringify(canned.body),
  };
}

function lowerCaseKeys(
  headers: Record<string, string>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value]),
  );
}
