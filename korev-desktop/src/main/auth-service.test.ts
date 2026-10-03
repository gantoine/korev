import { describe, expect, it, vi } from 'vitest';
import type { LoginState } from '../shared/auth';
import {
  createAuthService,
  type AuthServiceDeps,
  type DeviceFlow,
  type ViewerInfo,
} from './auth-service';
import { createMemoryFileSystem } from './file-system';
import { createTokenStore, type SecretCipher } from './token-store';

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

function setup(scopes: string[] = FULL_SCOPES) {
  const viewer: ViewerInfo = { login: 'maria', avatarUrl: null, scopes };
  const tokenStore = createTokenStore({
    cipher: plainCipher,
    fs: createMemoryFileSystem(),
    path: '/token',
  });
  const deps: AuthServiceDeps = {
    tokenStore,
    fetchViewer: vi.fn(async () => viewer),
    createDeviceFlow: idleDeviceFlow,
    onStateChange: vi.fn(),
    onConnectionChange: vi.fn(),
  };
  return { deps, tokenStore, service: createAuthService(deps) };
}

describe('auth service', () => {
  it('connects with a classic token that has the required scopes', async () => {
    const { deps, tokenStore, service } = setup();
    const connection = { login: 'maria', avatarUrl: null, method: 'token' };
    const result = await service.useToken('  ghp_token  ');
    expect(result).toEqual({ ok: true, connection });
    expect(service.token()).toBe('ghp_token');
    expect((await tokenStore.load())?.token).toBe('ghp_token');
    expect(deps.onConnectionChange).toHaveBeenCalledWith(connection);
  });

  it('rejects a token without the repo scope and stores nothing', async () => {
    const { tokenStore, service } = setup(['read:org']);
    const result = await service.useToken('ghp_token');
    expect(result.ok).toBe(false);
    expect(!result.ok && result.message).toContain('repo');
    expect(await tokenStore.load()).toBeNull();
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
    expect(await tokenStore.load()).toBeNull();
    expect(deps.onConnectionChange).toHaveBeenLastCalledWith(null);
  });
});
