import { describe, expect, it, vi } from 'vitest';
import type { LoginState } from '../shared/auth';
import {
  createAuthService,
  type AuthServiceDeps,
  type DeviceFlow,
  type ViewerInfo,
} from './auth-service';
import { createMemoryFileSystem } from './file-system';
import type { SecretCipher } from './encrypted-file';
import { createTokenStore } from './token-store';

const FULL_SCOPES = ['repo', 'read:org'];

const plainCipher: SecretCipher = {
  isAvailable: async () => true,
  storageBackend: () => 'keychain',
  encrypt: async (plainText) => Buffer.from(plainText),
  decrypt: async (encrypted) => ({
    result: encrypted.toString(),
    shouldReEncrypt: false,
  }),
};

function idleDeviceFlow(): DeviceFlow {
  const state: LoginState = { status: 'idle' };
  return {
    getState: () => state,
    start: async () => state,
    cancel: vi.fn(),
    subscribe: () => () => undefined,
  };
}

const TOKEN_PATH = '/token';
const SAVED_TOKEN = JSON.stringify({
  token: 'gho_saved',
  method: 'oauth',
  login: 'maria',
  avatarUrl: null,
});

function setup(scopes: string[] = FULL_SCOPES, cipher = plainCipher) {
  const viewer: ViewerInfo = { login: 'maria', avatarUrl: null, scopes };
  const fs = createMemoryFileSystem();
  const tokenStore = createTokenStore({ cipher, fs, path: TOKEN_PATH });
  const deps: AuthServiceDeps = {
    tokenStore,
    fetchViewer: vi.fn(async () => viewer),
    createDeviceFlow: idleDeviceFlow,
    onStateChange: vi.fn(),
    onConnectionChange: vi.fn(),
    warn: vi.fn(),
  };
  return { deps, fs, tokenStore, service: createAuthService(deps) };
}

function lockedKeychain() {
  const keychain = { locked: true };
  const cipher: SecretCipher = {
    ...plainCipher,
    decrypt: async (encrypted) => {
      if (keychain.locked) throw new Error('Keychain refused');
      return plainCipher.decrypt(encrypted);
    },
  };
  return { keychain, cipher };
}

async function withSavedToken(cipher: SecretCipher) {
  const context = setup(FULL_SCOPES, cipher);
  await context.fs.writeAtomic(TOKEN_PATH, SAVED_TOKEN);
  return context;
}

describe('auth service', () => {
  it('connects with a classic token that has the required scopes', async () => {
    const { deps, tokenStore, service } = setup();
    const connection = { login: 'maria', avatarUrl: null, method: 'token' };
    const result = await service.useToken('  ghp_token  ');
    expect(result).toEqual({ ok: true, connection });
    expect(service.token()).toBe('ghp_token');
    expect(await tokenStore.load()).toMatchObject({
      token: { token: 'ghp_token' },
    });
    expect(deps.onConnectionChange).toHaveBeenCalledWith(connection);
  });

  it('rejects a token without the repo scope and stores nothing', async () => {
    const { tokenStore, service } = setup(['read:org']);
    const result = await service.useToken('ghp_token');
    expect(result.ok).toBe(false);
    expect(!result.ok && result.message).toContain('repo');
    expect(await tokenStore.load()).toEqual({ status: 'missing' });
  });

  it('accepts admin:org in place of read:org', async () => {
    const { service } = setup(['repo', 'admin:org']);
    expect((await service.useToken('ghp_token')).ok).toBe(true);
  });

  it('forgets the token on disconnect', async () => {
    const { deps, tokenStore, service } = setup();
    await service.useToken('ghp_token');
    await service.disconnect();
    expect(service.state().connection).toBeNull();
    expect(await tokenStore.load()).toEqual({ status: 'missing' });
    expect(deps.onConnectionChange).toHaveBeenLastCalledWith(null);
  });

  it('keeps a saved sign-in it cannot unlock and reports the failure', async () => {
    const { cipher } = lockedKeychain();
    const { deps, fs, service } = await withSavedToken(cipher);

    await service.init();

    expect(service.state()).toMatchObject({
      connection: null,
      unlockFailures: 1,
    });
    expect(deps.warn).toHaveBeenCalledOnce();
    expect(fs.files.has(TOKEN_PATH)).toBe(true);
  });

  it('connects when Try again finds the keychain unlocked', async () => {
    const { keychain, cipher } = lockedKeychain();
    const { deps, service } = await withSavedToken(cipher);
    await service.init();

    keychain.locked = false;
    await service.retryUnlock();

    expect(service.state()).toMatchObject({
      connection: { login: 'maria' },
      unlockFailures: 0,
    });
    expect(service.token()).toBe('gho_saved');
    expect(deps.onConnectionChange).toHaveBeenCalledWith(
      expect.objectContaining({ login: 'maria' }),
    );
  });
});
