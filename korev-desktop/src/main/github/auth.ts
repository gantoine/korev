import type { LoginFailure, LoginState } from '../../shared/auth';
import {
  GithubHttpError,
  NetworkError,
  describeError,
  redactToken,
} from './errors';
import { type FetchLike, githubRequest } from './request';

export interface DeviceFlowDeps {
  fetch: FetchLike;
  webUrl: string;
  clientId: string;
  scopes: string;
  now(): number;
  sleep(ms: number, signal: AbortSignal): Promise<void>;
  onToken(token: string): Promise<void>;
}

export type LoginListener = (state: LoginState) => void;

interface OAuthReply {
  error?: string;
  error_description?: string;
  interval?: number;
  access_token?: string;
  device_code?: string;
  user_code?: string;
  verification_uri?: string;
  expires_in?: number;
}

interface DeviceCode {
  deviceCode: string;
  intervalMs: number;
  expiresAtMs: number;
}

type PollOutcome =
  | { kind: 'token'; token: string }
  | { kind: 'finished'; state: LoginState };

const DEVICE_CODE_PATH = '/login/device/code';
const ACCESS_TOKEN_PATH = '/login/oauth/access_token';
const DEVICE_CODE_GRANT = 'urn:ietf:params:oauth:grant-type:device_code';
const MS_PER_SECOND = 1000;
const SLOW_DOWN_STEP_MS = 5 * MS_PER_SECOND;
const DEFAULT_INTERVAL_SECONDS = 5;
const MISSING_CODE_MESSAGE = 'GitHub did not issue a login code.';

const IDLE: LoginState = { status: 'idle' };
const REQUESTING: LoginState = { status: 'requesting' };
const EXPIRED: LoginState = { status: 'expired' };
const DENIED: LoginState = { status: 'denied' };
const SUCCESS: LoginState = { status: 'success' };

type KnownFailure = Exclude<LoginFailure, 'unknown'>;

const FAILURE_MESSAGES: Record<KnownFailure, string> = {
  not_configured:
    'Korev has no valid GitHub OAuth client ID. Whoever builds Korev must set GITHUB_OAUTH_CLIENT_ID in src/main/github/config.ts.',
  device_flow_disabled:
    'Device flow is turned off for Korev’s GitHub OAuth App. Whoever configures Korev must tick “Enable Device Flow” in the app’s settings on GitHub.',
  incorrect_device_code: 'GitHub did not accept the login code. Try again.',
  network: 'Korev could not reach GitHub. Check your connection and try again.',
  storage_unavailable: 'Korev could not save the GitHub token on this device.',
};

const TERMINAL_REPLIES: Record<string, LoginState> = {
  expired_token: EXPIRED,
  access_denied: DENIED,
  incorrect_device_code: failed('incorrect_device_code'),
  incorrect_client_credentials: failed('not_configured'),
  device_flow_disabled: failed('device_flow_disabled'),
};

const AUTHORIZATION_PENDING = 'authorization_pending';
const SLOW_DOWN = 'slow_down';

export class DeviceFlowLogin {
  #state: LoginState = IDLE;
  #listeners = new Set<LoginListener>();
  #controller: AbortController | null = null;
  #codeShown: Promise<LoginState> = Promise.resolve(IDLE);

  constructor(private readonly deps: DeviceFlowDeps) {}

  getState(): LoginState {
    return this.#state;
  }

  subscribe(listener: LoginListener): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  start(): Promise<LoginState> {
    if (this.#state.status === 'awaiting_user') {
      return Promise.resolve(this.#state);
    }
    if (this.#state.status === 'requesting') return this.#codeShown;
    if (!this.deps.clientId) {
      this.#setState(failed('not_configured'));
      return Promise.resolve(this.#state);
    }
    const controller = new AbortController();
    this.#controller = controller;
    this.#codeShown = this.#nextStateAfterRequesting();
    this.#setState(REQUESTING);
    void this.#run(controller.signal);
    return this.#codeShown;
  }

  cancel(): void {
    this.#controller?.abort();
    this.#controller = null;
    this.#setState(IDLE);
  }

  async #run(signal: AbortSignal): Promise<void> {
    try {
      const outcome = await this.#login(signal);
      if (outcome.kind === 'finished') {
        this.#settle(signal, outcome.state);
        return;
      }
      await this.#deliverToken(outcome.token, signal);
    } catch (error) {
      this.#settle(signal, failureFrom(error, undefined));
    }
  }

  async #login(signal: AbortSignal): Promise<PollOutcome> {
    const reply = await this.#post(
      DEVICE_CODE_PATH,
      { client_id: this.deps.clientId, scope: this.deps.scopes },
      signal,
    );
    if (reply.error || !reply.device_code) {
      return { kind: 'finished', state: stateForError(reply) };
    }
    const code = this.#showCode(reply, signal);
    return this.#pollForToken(code, signal);
  }

  #showCode(reply: OAuthReply, signal: AbortSignal): DeviceCode {
    const expiresAtMs =
      this.deps.now() + (reply.expires_in ?? 0) * MS_PER_SECOND;
    this.#settle(signal, {
      status: 'awaiting_user',
      userCode: reply.user_code ?? '',
      verificationUri: reply.verification_uri ?? '',
      expiresAt: new Date(expiresAtMs).toISOString(),
    });
    return {
      deviceCode: reply.device_code ?? '',
      intervalMs: (reply.interval ?? DEFAULT_INTERVAL_SECONDS) * MS_PER_SECOND,
      expiresAtMs,
    };
  }

  async #pollForToken(
    code: DeviceCode,
    signal: AbortSignal,
  ): Promise<PollOutcome> {
    let intervalMs = code.intervalMs;
    for (;;) {
      await this.deps.sleep(intervalMs, signal);
      signal.throwIfAborted();
      if (this.deps.now() >= code.expiresAtMs) {
        return { kind: 'finished', state: EXPIRED };
      }
      const reply = await this.#requestToken(code.deviceCode, signal);
      if (reply.access_token) {
        return { kind: 'token', token: reply.access_token };
      }
      if (reply.error === SLOW_DOWN) {
        intervalMs = slowerInterval(reply, intervalMs);
        continue;
      }
      if (reply.error !== AUTHORIZATION_PENDING) {
        return { kind: 'finished', state: stateForError(reply) };
      }
    }
  }

  #requestToken(deviceCode: string, signal: AbortSignal): Promise<OAuthReply> {
    return this.#post(
      ACCESS_TOKEN_PATH,
      {
        client_id: this.deps.clientId,
        device_code: deviceCode,
        grant_type: DEVICE_CODE_GRANT,
      },
      signal,
    );
  }

  async #deliverToken(token: string, signal: AbortSignal): Promise<void> {
    if (signal.aborted) return;
    try {
      await this.deps.onToken(token);
      this.#settle(signal, SUCCESS);
    } catch (error) {
      this.#settle(signal, failureFrom(error, token));
    }
  }

  async #post(
    path: string,
    params: Record<string, string>,
    signal: AbortSignal,
  ): Promise<OAuthReply> {
    try {
      const response = await githubRequest(this.deps.fetch, {
        url: `${this.deps.webUrl}${path}`,
        method: 'POST',
        body: params,
        signal,
      });
      return (response.body ?? {}) as OAuthReply;
    } catch (error) {
      if (error instanceof GithubHttpError && error.code) {
        return { error: error.code, error_description: error.message };
      }
      throw error;
    }
  }

  #settle(signal: AbortSignal, state: LoginState): void {
    if (signal.aborted || this.#controller?.signal !== signal) return;
    this.#setState(state);
  }

  #setState(state: LoginState): void {
    this.#state = state;
    this.#listeners.forEach((listener) => listener(state));
  }

  #nextStateAfterRequesting(): Promise<LoginState> {
    return new Promise((resolve) => {
      const unsubscribe = this.subscribe((state) => {
        if (state.status === 'requesting') return;
        unsubscribe();
        resolve(state);
      });
    });
  }
}

function failed(reason: KnownFailure): LoginState {
  return { status: 'failed', reason, message: FAILURE_MESSAGES[reason] };
}

function unknownFailure(message: string): LoginState {
  return { status: 'failed', reason: 'unknown', message };
}

function stateForError(reply: OAuthReply): LoginState {
  const known = TERMINAL_REPLIES[reply.error ?? ''];
  if (known) return known;
  return unknownFailure(
    reply.error_description ?? reply.error ?? MISSING_CODE_MESSAGE,
  );
}

function failureFrom(error: unknown, token: string | undefined): LoginState {
  if (error instanceof NetworkError) return failed('network');
  return unknownFailure(redactToken(describeError(error), token));
}

function slowerInterval(reply: OAuthReply, currentMs: number): number {
  if (reply.interval) return reply.interval * MS_PER_SECOND;
  return currentMs + SLOW_DOWN_STEP_MS;
}
