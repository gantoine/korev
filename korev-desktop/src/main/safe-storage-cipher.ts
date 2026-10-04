import type { SafeStorage } from 'electron';
import type { SecretCipher } from './encrypted-file';

const LINUX_PLATFORM = 'linux';
const NON_LINUX_BACKEND = 'os-keychain';

export function createSafeStorageCipher(
  safeStorage: SafeStorage,
  platform: NodeJS.Platform,
): SecretCipher {
  return {
    isAvailable: () => safeStorage.isAsyncEncryptionAvailable(),
    storageBackend: () =>
      platform === LINUX_PLATFORM
        ? safeStorage.getSelectedStorageBackend()
        : NON_LINUX_BACKEND,
    encrypt: (plainText) => safeStorage.encryptStringAsync(plainText),
    decrypt: (encrypted) => safeStorage.decryptStringAsync(encrypted),
  };
}
