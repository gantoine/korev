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

export type EncryptedRead =
  | { status: 'missing' }
  | { status: 'unreadable' }
  | { status: 'read'; text: string; shouldReEncrypt: boolean };

export interface EncryptedFile {
  read(): Promise<EncryptedRead>;
  write(plainText: string): Promise<void>;
  remove(): Promise<void>;
}

const INSECURE_BACKEND = 'basic_text';

export async function hasSecureStorage(cipher: SecretCipher): Promise<boolean> {
  if (cipher.storageBackend() === INSECURE_BACKEND) return false;
  return cipher.isAvailable();
}

export function createEncryptedFile(deps: {
  cipher: SecretCipher;
  fs: FileSystem;
  path: string;
}): EncryptedFile {
  const { cipher, fs, path } = deps;

  async function read(): Promise<EncryptedRead> {
    const encrypted = await fs.read(path);
    if (!encrypted) return { status: 'missing' };
    try {
      const decrypted = await cipher.decrypt(encrypted);
      return {
        status: 'read',
        text: decrypted.result,
        shouldReEncrypt: decrypted.shouldReEncrypt,
      };
    } catch {
      return { status: 'unreadable' };
    }
  }

  async function write(plainText: string): Promise<void> {
    await fs.writeAtomic(path, await cipher.encrypt(plainText));
  }

  return { read, write, remove: () => fs.remove(path) };
}
