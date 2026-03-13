import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to mock enterpriseConfig since keyManagement imports from it
vi.mock('./enterpriseConfig.js', () => ({
  getConfig: () => ({
    encryptionKey: 'test-key-from-config',
    encryptionSalt: 'test-salt-from-config',
  }),
  DEFAULT_DEV_KEY: 'default-dev-key',
  DEFAULT_DEV_SALT: 'default-dev-salt',
}));

import { getEncryptionKey, getEncryptionSalt } from './keyManagement.js';

describe('keyManagement', () => {
  it('returns encryption key from config', () => {
    expect(getEncryptionKey()).toBe('test-key-from-config');
  });

  it('returns encryption salt from config', () => {
    expect(getEncryptionSalt()).toBe('test-salt-from-config');
  });
});
