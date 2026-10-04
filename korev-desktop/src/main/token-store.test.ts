import { describe, expect, it, vi } from 'vitest';
import type { SecretCipher } from './encrypted-file';
import { createMemoryFileSystem } from './file-system';
import {
  createTokenStore,
  TokenStorageUnavailableError,
  type StoredToken,
} from './token-store';

const PATH = '/user-data/token.bin';
const PREFIX = 'enc:';
const STORED: StoredToken = {
  token: 'gho_secret',
  method: 'oauth',
  login: 'maria',
  avatarUrl: null,
};

function fakeCipher(overrides: Partial<SecretCipher> = {}): SecretCipher {
  return {
    isAvailable: async () => true,
    storageBackend: () => 'keychain',
    encrypt: async (plainText) => Buffer.from(PREFIX + plainText),
    decrypt: async (encrypted) => ({
      result: encrypted.toString().slice(PREFIX.length),
      shouldReEncrypt: false,
    }),
    ...overrides,
  };
}

describe('token store', () => {
  it('round-trips a token through the cipher', async () => {
    const fs = createMemoryFileSystem();
    const store = createTokenStore({ cipher: fakeCipher(), fs, path: PATH });
    await store.save(STORED);
    expect(await store.load()).toEqual({ status: 'loaded', token: STORED });
  });

  it('refuses to save when the keyring backend is basic_text', async () => {
    const fs = createMemoryFileSystem();
    const cipher = fakeCipher({ storageBackend: () => 'basic_text' });
    const store = createTokenStore({ cipher, fs, path: PATH });
    await expect(store.save(STORED)).rejects.toBeInstanceOf(
      TokenStorageUnavailableError,
    );
    expect(fs.files.has(PATH)).toBe(false);
  });

  it('reports a token it cannot decrypt as unreadable and keeps the file', async () => {
    const fs = createMemoryFileSystem({ [PATH]: 'garbage' });
    const cipher = fakeCipher({
      decrypt: async () => {
        throw new Error('Keychain refused');
      },
    });
    expect(await createTokenStore({ cipher, fs, path: PATH }).load()).toEqual({
      status: 'unreadable',
    });
    expect(fs.files.has(PATH)).toBe(true);
  });

  it('reports a missing file as missing', async () => {
    const store = createTokenStore({
      cipher: fakeCipher(),
      fs: createMemoryFileSystem(),
      path: PATH,
    });
    expect(await store.load()).toEqual({ status: 'missing' });
  });

  it('rewrites the file when the cipher asks to re-encrypt', async () => {
    const fs = createMemoryFileSystem({
      [PATH]: PREFIX + JSON.stringify(STORED),
    });
    const encrypt = vi.fn(async (plainText: string) =>
      Buffer.from('v2:' + plainText),
    );
    const cipher = fakeCipher({
      encrypt,
      decrypt: async (encrypted) => ({
        result: encrypted.toString().slice(PREFIX.length),
        shouldReEncrypt: true,
      }),
    });
    await createTokenStore({ cipher, fs, path: PATH }).load();
    expect(encrypt).toHaveBeenCalledOnce();
    expect(fs.files.get(PATH)?.toString().startsWith('v2:')).toBe(true);
  });
});
