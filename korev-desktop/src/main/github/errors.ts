const REDACTED = '[redacted]';

export function redactToken(text: string, token: string | undefined): string {
  if (!token) return text;
  return text.split(token).join(REDACTED);
}

export function redactCause(cause: unknown, token: string | undefined): Error {
  const redacted = new Error(redactToken(describeError(cause), token));
  if (cause instanceof Error) redacted.name = cause.name;
  return redacted;
}

export function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export class GithubError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class AuthLostError extends GithubError {}

export class RateLimitedError extends GithubError {
  constructor(
    message: string,
    readonly resetAt: Date,
  ) {
    super(message);
  }
}

export class SsoRequiredError extends GithubError {
  constructor(
    message: string,
    readonly org: string | null,
  ) {
    super(message);
  }
}

export class OrgRestrictedError extends GithubError {
  constructor(
    message: string,
    readonly org: string | null,
  ) {
    super(message);
  }
}

export class NetworkError extends GithubError {}

export class GithubHttpError extends GithubError {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string | null,
  ) {
    super(message);
  }
}

export class StackFieldRejectedError extends GithubError {}

export class GraphqlQueryError extends GithubError {
  constructor(readonly messages: string[]) {
    super(messages.join('; '));
  }
}
