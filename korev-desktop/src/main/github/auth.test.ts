import { describe, expect, it, vi } from 'vitest';
import type { LoginState } from '../../shared/auth';
import { DeviceFlowLogin, type DeviceFlowDeps } from './auth';
import { createFakeFetch, type CannedReply } from './test-fetch';

const TOKEN = 'gho_freshtoken';
const START = Date.parse('2026-10-03T12:00:00Z');

const deviceCode = {
  body: {
    device_code: 'dev-123',
    user_code: 'WDJB-MJHT',
    verification_uri: 'https://github.com/login/device',
    expires_in: 900,
    interval: 5,
  },
};

function tokenError(error: string, extra: Record<string, unknown> = {}) {
  return { body: { error, ...extra } };
}

const accessToken = {
  body: { access_token: TOKEN, token_type: 'bearer', scope: 'repo,read:org' },
};

function setup(
  replies: CannedReply[],
  overrides: Partial<DeviceFlowDeps> = {},
) {
  const fake = createFakeFetch(...replies);
  let clock = START;
  const sleeps: number[] = [];
  const deps: DeviceFlowDeps = {
    fetch: fake.fetch,
    webUrl: 'https://github.com',
    clientId: 'Iv1.abc',
    scopes: 'repo read:org',
    now: () => clock,
    sleep: async (ms) => {
      sleeps.push(ms);
      clock += ms;
    },
    onToken: vi.fn(async () => undefined),
    ...overrides,
  };
  const login = new DeviceFlowLogin(deps);
  return { login, deps, fake, sleeps };
}

function settled(login: DeviceFlowLogin): Promise<LoginState> {
  const unfinished = new Set(['idle', 'requesting', 'awaiting_user']);
  return new Promise((resolve) => {
    const unsubscribe = login.subscribe((state) => {
      if (unfinished.has(state.status)) return;
      unsubscribe();
      resolve(state);
    });
  });
}

describe('DeviceFlowLogin', () => {
  it('shows the code, polls until authorised and hands over the token', async () => {
    const { login, deps, fake } = setup([
      deviceCode,
      tokenError('authorization_pending'),
      accessToken,
    ]);
    const done = settled(login);

    const shown = await login.start();

    expect(shown).toEqual({
      status: 'awaiting_user',
      userCode: 'WDJB-MJHT',
      verificationUri: 'https://github.com/login/device',
      expiresAt: '2026-10-03T12:15:00.000Z',
    });
    expect(await done).toEqual({ status: 'success' });
    expect(deps.onToken).toHaveBeenCalledWith(TOKEN);
    expect(fake.requests[1].body).toEqual({
      client_id: 'Iv1.abc',
      device_code: 'dev-123',
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    });
  });

  it.each([
    ['expired_token', { status: 'expired' }],
    ['access_denied', { status: 'denied' }],
    [
      'incorrect_device_code',
      { status: 'failed', reason: 'incorrect_device_code' },
    ],
    [
      'device_flow_disabled',
      { status: 'failed', reason: 'device_flow_disabled' },
    ],
  ])('ends on %s', async (error, expected) => {
    const { login, deps } = setup([deviceCode, tokenError(error)]);
    const done = settled(login);
    await login.start();

    expect(await done).toMatchObject(expected);
    expect(deps.onToken).not.toHaveBeenCalled();
  });

  it('expires once the code lifetime passes without an answer', async () => {
    const shortLived = { body: { ...deviceCode.body, expires_in: 8 } };
    const { login } = setup([shortLived, tokenError('authorization_pending')]);
    const done = settled(login);
    await login.start();

    expect(await done).toEqual({ status: 'expired' });
  });

  it('waits 5 more seconds between polls after slow_down', async () => {
    const { login, sleeps } = setup([
      deviceCode,
      tokenError('slow_down'),
      accessToken,
    ]);
    const done = settled(login);
    await login.start();
    await done;

    expect(sleeps).toEqual([5000, 10000]);
  });

  it('fails with a redacted message when storing the token fails', async () => {
    const { login } = setup([deviceCode, accessToken], {
      onToken: async (token) => {
        throw new Error(`Keychain refused ${token}`);
      },
    });
    const done = settled(login);
    await login.start();

    const state = await done;
    expect(state).toMatchObject({ status: 'failed', reason: 'unknown' });
    expect(JSON.stringify(state)).not.toContain(TOKEN);
  });

  it('fails with a network reason when GitHub is unreachable', async () => {
    const { login } = setup([new TypeError('fetch failed')]);

    expect(await login.start()).toMatchObject({
      status: 'failed',
      reason: 'network',
    });
  });

  it('never hands over a token after cancel while polling', async () => {
    let wake = () => {};
    const { login, deps, fake } = setup([deviceCode, accessToken], {
      sleep: () => new Promise<void>((resolve) => (wake = resolve)),
    });
    await login.start();

    login.cancel();
    wake();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(login.getState()).toEqual({ status: 'idle' });
    expect(fake.requests).toHaveLength(1);
    expect(deps.onToken).not.toHaveBeenCalled();
  });

  it('returns the same code to a second start without a new request', async () => {
    const { login, fake } = setup([deviceCode], {
      sleep: () => new Promise<void>(() => {}),
    });

    const [first, second] = await Promise.all([login.start(), login.start()]);
    const third = await login.start();

    expect(second).toEqual(first);
    expect(third).toEqual(first);
    expect(fake.requests).toHaveLength(1);
  });

  it('fails as not configured without a client ID and sends nothing', async () => {
    const { login, fake } = setup([], { clientId: '' });

    expect(await login.start()).toMatchObject({
      status: 'failed',
      reason: 'not_configured',
    });
    expect(fake.requests).toHaveLength(0);
  });
});
