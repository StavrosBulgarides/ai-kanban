import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ZodError, ZodIssue } from 'zod';
import { errorHandler } from './errorHandler.js';

// Mock enterpriseConfig
vi.mock('../lib/enterpriseConfig.js', () => ({
  isEnterprise: vi.fn(() => false),
}));

import { isEnterprise } from '../lib/enterpriseConfig.js';

function createMockRes() {
  const res: any = {
    statusCode: 200,
    body: null,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(data: any) {
      res.body = data;
      return res;
    },
  };
  return res;
}

describe('errorHandler', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('returns 400 for ZodError', () => {
    const issues: ZodIssue[] = [{ code: 'invalid_type', expected: 'string', received: 'number', path: ['name'], message: 'Expected string' }];
    const err = new ZodError(issues);
    const res = createMockRes();

    errorHandler(err, {} as any, res, (() => {}) as any);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Validation error');
    expect(res.body.details).toBeDefined();
  });

  it('returns 500 with message in non-enterprise mode', () => {
    vi.mocked(isEnterprise).mockReturnValue(false);
    const err = new Error('something broke');
    const res = createMockRes();

    errorHandler(err, {} as any, res, (() => {}) as any);

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('something broke');
  });

  it('hides error message in enterprise mode', () => {
    vi.mocked(isEnterprise).mockReturnValue(true);
    const err = new Error('sensitive info');
    const res = createMockRes();

    errorHandler(err, {} as any, res, (() => {}) as any);

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('Internal server error');
    expect(res.body.error).not.toContain('sensitive');
  });

  it('uses fallback message when error has no message', () => {
    vi.mocked(isEnterprise).mockReturnValue(false);
    const err = new Error('');
    const res = createMockRes();

    errorHandler(err, {} as any, res, (() => {}) as any);

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('Internal server error');
  });
});
