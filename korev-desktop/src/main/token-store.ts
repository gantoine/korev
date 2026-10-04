import type { ConnectionMethod } from '../shared/auth';
import {
  createEncryptedFile,
  hasSecureStorage,
  type SecretCipher,
} from './encrypted-file';
import type { FileSystem } from './file-system';

export interface StoredToken {
  token: string;
  method: ConnectionMethod;
  login: string;
  avatarUrl: string | null;
}

export type TokenLoadResult =
  | { status: 'missing' }
  | { status: 'unreadable' }
  | { status: 'loaded'; token: StoredToken };

export interface TokenStore {
  load(): Promise<TokenLoadResult>;
  save(token: StoredToken): Promise<void>;
  clear(): Promise<void>;
}

const METHODS: readonly ConnectionMethod[] = ['oauth', 'token'];
const MISSING: TokenLoadResult = { status: 'missing' };

export class TokenStorageUnavailableError extends Error {
  constructor() {
    super(
      'Korev needs a system keychain to store your GitHub token securely, and none is available.',
    );
    this.name = 'TokenStorageUnavailableError';
  }
}

function parseStoredToken(text: string): StoredToken | null {
  try {
    const parsed = JSON.parse(text) as Partial<StoredToken>;
    if (typeof parsed.token !== 'string' || !parsed.token) return null;
    if (typeof parsed.login !== 'string') return null;
    if (!METHODS.includes(parsed.method as ConnectionMethod)) return null;
    return {
      token: parsed.token,
      method: parsed.method as ConnectionMethod,
      login: parsed.login,
      avatarUrl: typeof parsed.avatarUrl === 'string' ? parsed.avatarUrl : null,
    };
  } catch {
    return null;
  }
}

export function createTokenStore(deps: {
  cipher: SecretCipher;
  fs: FileSystem;
  path: string;
}): TokenStore {
  const file = createEncryptedFile(deps);

  function write(token: StoredToken): Promise<void> {
    return file.write(JSON.stringify(token));
  }

  async function load(): Promise<TokenLoadResult> {
    const read = await file.read();
    if (read.status !== 'read') return read;
    const token = parseStoredToken(read.text);
    if (!token) return MISSING;
    if (read.shouldReEncrypt) await write(token);
    return { status: 'loaded', token };
  }

  async function save(token: StoredToken): Promise<void> {
    if (!(await hasSecureStorage(deps.cipher))) {
      throw new TokenStorageUnavailableError();
    }
    await write(token);
  }

  return { load, save, clear: () => file.remove() };
}
