import type { ConnectionMethod } from '../shared/auth';
import type { FileSystem } from './file-system';

export interface DecryptResult {
  result: string;
  shouldReEncrypt: boolean;
}

export interface SecretCipher {
  isAvailable(): Promise<boolean>;
  storageBackend(): string;
  encrypt(plainText: string): Promise<Buffer>;
  decrypt(encrypted: Buffer): Promise<DecryptResult>;
}

export interface StoredToken {
  token: string;
  method: ConnectionMethod;
  login: string;
  avatarUrl: string | null;
}

export interface TokenStore {
  load(): Promise<StoredToken | null>;
  save(token: StoredToken): Promise<void>;
  clear(): Promise<void>;
}

const INSECURE_BACKEND = 'basic_text';
const METHODS: readonly ConnectionMethod[] = ['oauth', 'token'];

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
  const { cipher, fs, path } = deps;

  async function assertSecureStorage(): Promise<void> {
    if (cipher.storageBackend() === INSECURE_BACKEND) {
      throw new TokenStorageUnavailableError();
    }
    if (!(await cipher.isAvailable())) throw new TokenStorageUnavailableError();
  }

  async function write(token: StoredToken): Promise<void> {
    await fs.writeAtomic(path, await cipher.encrypt(JSON.stringify(token)));
  }

  async function decrypt(encrypted: Buffer): Promise<DecryptResult | null> {
    try {
      return await cipher.decrypt(encrypted);
    } catch {
      return null;
    }
  }

  async function load(): Promise<StoredToken | null> {
    const encrypted = await fs.read(path);
    if (!encrypted) return null;
    const decrypted = await decrypt(encrypted);
    if (!decrypted) return null;
    const stored = parseStoredToken(decrypted.result);
    if (stored && decrypted.shouldReEncrypt) await write(stored);
    return stored;
  }

  async function save(token: StoredToken): Promise<void> {
    await assertSecureStorage();
    await write(token);
  }

  return { load, save, clear: () => fs.remove(path) };
}
