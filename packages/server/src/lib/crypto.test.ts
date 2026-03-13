import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the key management module before importing crypto
vi.mock('./keyManagement.js', () => ({
  getEncryptionKey: () => 'test-encryption-key-for-unit-tests',
  getEncryptionSalt: () => 'test-salt-value',
}));

import { encrypt, decrypt } from './crypto.js';

describe('crypto', () => {
  it('encrypts and decrypts a string roundtrip', () => {
    const original = 'my secret password';
    const encrypted = encrypt(original);
    expect(encrypted).not.toBe(original);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  it('produces format iv:authTag:ciphertext', () => {
    const encrypted = encrypt('test');
    const parts = encrypted.split(':');
    expect(parts).toHaveLength(3);
    // IV is 16 bytes = 32 hex chars
    expect(parts[0]).toHaveLength(32);
    // Auth tag is 16 bytes = 32 hex chars
    expect(parts[1]).toHaveLength(32);
    // Ciphertext is non-empty hex
    expect(parts[2].length).toBeGreaterThan(0);
  });

  it('produces different ciphertexts for same input (random IV)', () => {
    const a = encrypt('same input');
    const b = encrypt('same input');
    expect(a).not.toBe(b);
  });

  it('handles empty string', () => {
    const encrypted = encrypt('');
    expect(decrypt(encrypted)).toBe('');
  });

  it('handles unicode characters', () => {
    const original = 'こんにちは世界 🌍';
    expect(decrypt(encrypt(original))).toBe(original);
  });

  it('handles long strings', () => {
    const original = 'a'.repeat(10000);
    expect(decrypt(encrypt(original))).toBe(original);
  });

  it('throws on tampered ciphertext', () => {
    const encrypted = encrypt('test');
    const parts = encrypted.split(':');
    // Tamper with ciphertext
    const tampered = `${parts[0]}:${parts[1]}:ff${parts[2].slice(2)}`;
    expect(() => decrypt(tampered)).toThrow();
  });

  it('throws on tampered auth tag', () => {
    const encrypted = encrypt('test');
    const parts = encrypted.split(':');
    const tampered = `${parts[0]}:${'0'.repeat(32)}:${parts[2]}`;
    expect(() => decrypt(tampered)).toThrow();
  });
});
