import { describe, it, expect, beforeEach } from 'vitest';
import { getAdapter, listAdapterTypes, registerAdapter, buildConfig } from './registry.js';
import type { IntegrationAdapter } from './types.js';

describe('registry', () => {
  describe('getAdapter', () => {
    it('returns jira adapter', () => {
      expect(getAdapter('jira')).toBeDefined();
      expect(getAdapter('jira')!.type).toBe('jira');
    });

    it('returns github adapter', () => {
      expect(getAdapter('github')).toBeDefined();
    });

    it('returns aha adapter', () => {
      expect(getAdapter('aha')).toBeDefined();
    });

    it('returns custom adapter', () => {
      expect(getAdapter('custom')).toBeDefined();
    });

    it('returns undefined for unknown type', () => {
      expect(getAdapter('unknown')).toBeUndefined();
    });
  });

  describe('listAdapterTypes', () => {
    it('returns all registered types', () => {
      const types = listAdapterTypes();
      expect(types).toContain('jira');
      expect(types).toContain('aha');
      expect(types).toContain('github');
      expect(types).toContain('custom');
    });
  });

  describe('registerAdapter', () => {
    it('registers a new adapter', () => {
      const mockAdapter: IntegrationAdapter = {
        type: 'test-adapter',
        testConnection: async () => ({ ok: true, message: 'ok' }),
        fetchItem: async () => ({
          externalId: '1', title: 'test', description: '', status: 'open', url: '', type: 'issue', raw: {},
        }),
        searchItems: async () => [],
      };
      registerAdapter(mockAdapter);
      expect(getAdapter('test-adapter')).toBe(mockAdapter);
      expect(listAdapterTypes()).toContain('test-adapter');
    });
  });

  describe('buildConfig', () => {
    it('maps integration fields to IntegrationConfig', () => {
      const config = buildConfig({
        base_url: 'https://jira.example.com',
        auth_type: 'pat',
        decrypted_token: 'secret-token',
        can_write: 1,
        config: '{"project":"PROJ"}',
      });
      expect(config.baseUrl).toBe('https://jira.example.com');
      expect(config.authType).toBe('pat');
      expect(config.authToken).toBe('secret-token');
      expect(config.canWrite).toBe(true);
      expect(config.extra).toEqual({ project: 'PROJ' });
    });

    it('maps can_write=0 to false', () => {
      const config = buildConfig({
        base_url: '', auth_type: 'pat', decrypted_token: '', can_write: 0, config: '{}',
      });
      expect(config.canWrite).toBe(false);
    });

    it('handles empty config as empty object', () => {
      const config = buildConfig({
        base_url: '', auth_type: 'pat', decrypted_token: '', can_write: 0, config: '',
      });
      expect(config.extra).toEqual({});
    });
  });
});
