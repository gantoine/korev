import { describe, expect, it } from 'vitest';
import {
  AuthLostError,
  GithubHttpError,
  GraphqlQueryError,
  NetworkError,
  OrgRestrictedError,
  RateLimitedError,
  SsoRequiredError,
  StackFieldRejectedError,
} from './errors';
import { graphql } from './graphql';
import { githubRequest } from './request';
import { createFakeFetch, type CannedReply } from './test-fetch';

const TOKEN = 'gho_secret123';
const URL = 'https://api.github.com/notifications';
const NOW = Date.parse('2026-10-03T12:00:00Z');

async function failureOf(reply: CannedReply): Promise<unknown> {
  const { fetch } = createFakeFetch(reply);
  return githubRequest(fetch, { url: URL, token: TOKEN }, () => NOW).then(
    () => null,
    (error: unknown) => error,
  );
}

describe('githubRequest', () => {
  it('sends GitHub headers and a JSON body, and parses the JSON answer', async () => {
    const fake = createFakeFetch({ body: { ok: true } });
    const response = await githubRequest(fake.fetch, {
      url: URL,
      method: 'POST',
      token: TOKEN,
      body: { query: '{ viewer { login } }' },
    });

    const [request] = fake.requests;
    expect(request.headers).toMatchObject({
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/json',
      'User-Agent': 'Korev',
      'X-GitHub-Api-Version': '2022-11-28',
    });
    expect(request.body).toEqual({ query: '{ viewer { login } }' });
    expect(response.body).toEqual({ ok: true });
  });

  it('lets callers override Accept and omits Authorization without a token', async () => {
    const fake = createFakeFetch({ status: 304 });
    const response = await githubRequest(fake.fetch, {
      url: URL,
      headers: { Accept: 'application/vnd.github+json' },
    });

    expect(fake.requests[0].headers.Accept).toBe('application/vnd.github+json');
    expect(fake.requests[0].headers.Authorization).toBeUndefined();
    expect(response).toMatchObject({ status: 304, body: null });
  });

  it('throws AuthLostError on 401', async () => {
    const error = await failureOf({
      status: 401,
      body: { message: 'Bad credentials' },
    });
    expect(error).toBeInstanceOf(AuthLostError);
  });

  it('reads the rate-limit reset from retry-after seconds', async () => {
    const error = await failureOf({
      status: 429,
      headers: { 'Retry-After': '30' },
    });
    expect(error).toBeInstanceOf(RateLimitedError);
    expect((error as RateLimitedError).resetAt.getTime()).toBe(NOW + 30_000);
  });

  it('reads the rate-limit reset from x-ratelimit-reset when none remain', async () => {
    const error = await failureOf({
      status: 403,
      headers: {
        'x-ratelimit-remaining': '0',
        'x-ratelimit-reset': '1791056378',
      },
      body: { message: 'API rate limit exceeded' },
    });
    expect(error).toBeInstanceOf(RateLimitedError);
    expect((error as RateLimitedError).resetAt.getTime()).toBe(1791056378_000);
  });

  it('names the org when SAML SSO is required', async () => {
    const error = await failureOf({
      status: 403,
      headers: {
        'X-GitHub-SSO':
          'required; url=https://github.com/orgs/acme/sso?authorization_request=abc',
      },
      body: { message: 'Resource protected by organization SAML enforcement.' },
    });
    expect(error).toBeInstanceOf(SsoRequiredError);
    expect((error as SsoRequiredError).org).toBe('acme');
  });

  it('names the org when OAuth App access restrictions apply', async () => {
    const error = await failureOf({
      status: 403,
      body: {
        message:
          'Although you appear to have the correct authorization credentials, the `acme` organization has enabled OAuth App access restrictions, meaning that data access to third-parties is limited.',
      },
    });
    expect(error).toBeInstanceOf(OrgRestrictedError);
    expect((error as OrgRestrictedError).org).toBe('acme');
  });

  it('throws GithubHttpError with the status for other failures', async () => {
    const error = await failureOf({ status: 502 });
    expect(error).toBeInstanceOf(GithubHttpError);
    expect((error as GithubHttpError).status).toBe(502);
  });

  it('wraps a failed fetch in NetworkError with the token redacted', async () => {
    const error = await failureOf(
      new TypeError(`connect failed for Bearer ${TOKEN}`),
    );
    expect(error).toBeInstanceOf(NetworkError);
    const networkError = error as NetworkError;
    expect(networkError.message).not.toContain(TOKEN);
    expect(String((networkError.cause as Error).message)).not.toContain(TOKEN);
    expect(networkError.message).toContain('[redacted]');
  });

  it('rethrows an abort unchanged', async () => {
    const abort = new DOMException('The operation was aborted.', 'AbortError');
    expect(await failureOf(abort)).toBe(abort);
  });

  it('redacts the token from GitHub error messages', async () => {
    const error = await failureOf({
      status: 422,
      body: { message: `token ${TOKEN} is malformed` },
    });
    expect((error as Error).message).not.toContain(TOKEN);
  });
});

describe('graphql', () => {
  const request = {
    apiUrl: 'https://api.github.com',
    token: TOKEN,
    query: '{ viewer { login } }',
  };

  it('returns partial data together with its errors', async () => {
    const errors = [{ message: 'Something went wrong', path: ['mine'] }];
    const fake = createFakeFetch({
      body: { data: { viewer: { login: 'maria' } }, errors },
    });

    const result = await graphql(fake.fetch, request);

    expect(fake.requests[0].url).toBe('https://api.github.com/graphql');
    expect(result.data).toEqual({ viewer: { login: 'maria' } });
    expect(result.errors).toEqual(errors);
  });

  it('throws StackFieldRejectedError when GitHub rejects the stack field', async () => {
    const fake = createFakeFetch({
      body: {
        errors: [
          {
            message: "Field 'stack' doesn't exist on type 'PullRequest'",
            extensions: {
              code: 'undefinedField',
              typeName: 'PullRequest',
              fieldName: 'stack',
            },
          },
        ],
      },
    });
    await expect(graphql(fake.fetch, request)).rejects.toBeInstanceOf(
      StackFieldRejectedError,
    );
  });

  it('throws GraphqlQueryError for any other rejected query', async () => {
    const fake = createFakeFetch({
      body: {
        errors: [
          {
            message: "Field 'files' doesn't exist on type 'PullRequest'",
            extensions: { code: 'undefinedField', fieldName: 'files' },
          },
        ],
      },
    });
    await expect(graphql(fake.fetch, request)).rejects.toBeInstanceOf(
      GraphqlQueryError,
    );
  });
});
