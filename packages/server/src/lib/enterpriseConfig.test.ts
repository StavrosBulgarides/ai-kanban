import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isEnterprise, getConfig, ALL_TOOLS, DEFAULT_DEV_KEY, DEFAULT_DEV_SALT } from './enterpriseConfig.js';

describe('enterpriseConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('isEnterprise', () => {
    it('returns false by default', () => {
      delete process.env.ENTERPRISE_MODE;
      expect(isEnterprise()).toBe(false);
    });

    it('returns true when ENTERPRISE_MODE=true', () => {
      process.env.ENTERPRISE_MODE = 'true';
      expect(isEnterprise()).toBe(true);
    });

    it('returns false for other values', () => {
      process.env.ENTERPRISE_MODE = 'yes';
      expect(isEnterprise()).toBe(false);
    });
  });

  describe('getConfig', () => {
    it('uses default dev key and salt in non-enterprise mode', () => {
      delete process.env.ENTERPRISE_MODE;
      delete process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_SALT;
      const config = getConfig();
      expect(config.encryptionKey).toBe(DEFAULT_DEV_KEY);
      expect(config.encryptionSalt).toBe(DEFAULT_DEV_SALT);
    });

    it('uses custom key from env when set', () => {
      process.env.ENCRYPTION_KEY = 'my-secret-key';
      const config = getConfig();
      expect(config.encryptionKey).toBe('my-secret-key');
    });

    it('enables all tools by default in non-enterprise mode', () => {
      delete process.env.ENTERPRISE_MODE;
      delete process.env.DEFAULT_TOOL_PERMISSIONS;
      const config = getConfig();
      for (const tool of ALL_TOOLS) {
        expect(config.defaultToolPermissions[tool]).toBe(true);
      }
    });

    it('restricts tools in enterprise mode', () => {
      process.env.ENTERPRISE_MODE = 'true';
      process.env.ENCRYPTION_KEY = 'prod-key';
      delete process.env.DEFAULT_TOOL_PERMISSIONS;
      const config = getConfig();
      expect(config.defaultToolPermissions.Read).toBe(true);
      expect(config.defaultToolPermissions.Glob).toBe(true);
      expect(config.defaultToolPermissions.Grep).toBe(true);
      expect(config.defaultToolPermissions.Write).toBe(false);
      expect(config.defaultToolPermissions.Edit).toBe(false);
      expect(config.defaultToolPermissions.Bash).toBe(false);
    });

    it('parses DEFAULT_TOOL_PERMISSIONS from env', () => {
      process.env.DEFAULT_TOOL_PERMISSIONS = 'Read,Write,Bash';
      const config = getConfig();
      expect(config.defaultToolPermissions.Read).toBe(true);
      expect(config.defaultToolPermissions.Write).toBe(true);
      expect(config.defaultToolPermissions.Bash).toBe(true);
      expect(config.defaultToolPermissions.Edit).toBe(false);
      expect(config.defaultToolPermissions.Glob).toBe(false);
    });

    it('returns empty allowedOrigins in non-enterprise mode', () => {
      delete process.env.ENTERPRISE_MODE;
      const config = getConfig();
      expect(config.allowedOrigins).toEqual([]);
    });

    it('includes localhost origins in enterprise mode', () => {
      process.env.ENTERPRISE_MODE = 'true';
      process.env.ENCRYPTION_KEY = 'prod-key';
      process.env.PORT = '4000';
      const config = getConfig();
      expect(config.allowedOrigins).toContain('http://localhost:4000');
      expect(config.allowedOrigins).toContain('http://127.0.0.1:4000');
    });

    it('adds extra origins from ALLOWED_ORIGINS env', () => {
      process.env.ENTERPRISE_MODE = 'true';
      process.env.ENCRYPTION_KEY = 'prod-key';
      process.env.ALLOWED_ORIGINS = 'https://app.example.com,https://admin.example.com';
      const config = getConfig();
      expect(config.allowedOrigins).toContain('https://app.example.com');
      expect(config.allowedOrigins).toContain('https://admin.example.com');
    });

    it('handles allowFileOpen flag', () => {
      expect(getConfig().allowFileOpen).toBe(false);
      process.env.ALLOW_FILE_OPEN = 'true';
      expect(getConfig().allowFileOpen).toBe(true);
    });
  });

  describe('ALL_TOOLS', () => {
    it('contains expected tools', () => {
      expect(ALL_TOOLS).toContain('Read');
      expect(ALL_TOOLS).toContain('Write');
      expect(ALL_TOOLS).toContain('Edit');
      expect(ALL_TOOLS).toContain('Bash');
      expect(ALL_TOOLS).toContain('Glob');
      expect(ALL_TOOLS).toContain('Grep');
      expect(ALL_TOOLS).toContain('WebSearch');
      expect(ALL_TOOLS).toContain('WebFetch');
      expect(ALL_TOOLS).toHaveLength(8);
    });
  });
});
