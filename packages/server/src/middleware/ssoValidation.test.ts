import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ssoValidation } from './ssoValidation.js';

describe('ssoValidation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('calls next() when SSO validation is disabled', () => {
    delete process.env.ENTERPRISE_SSO_VALIDATION;
    const next = vi.fn();
    ssoValidation({} as any, {} as any, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('calls next() when SSO validation is enabled (stub)', () => {
    process.env.ENTERPRISE_SSO_VALIDATION = 'true';
    const next = vi.fn();
    ssoValidation({} as any, {} as any, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
