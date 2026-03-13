import { getConfig, DEFAULT_DEV_KEY, DEFAULT_DEV_SALT } from './enterpriseConfig.js';

/**
 * Returns the encryption key for use by crypto.ts.
 * Currently reads from env via enterpriseConfig.
 * Structure ready for swap to Vault/KMS later.
 */
export function getEncryptionKey(): string {
  return getConfig().encryptionKey;
}

/**
 * Returns the encryption salt.
 * Currently reads from env via enterpriseConfig.
 */
export function getEncryptionSalt(): string {
  return getConfig().encryptionSalt;
}

export { DEFAULT_DEV_KEY, DEFAULT_DEV_SALT };
