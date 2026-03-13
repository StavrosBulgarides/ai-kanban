import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupTestDb, closeTestDb, getTestDb } from '../../test/setupDb.js';

vi.mock('../connection.js', () => ({
  getDb: () => getTestDb(),
}));

let idCounter = 0;
vi.mock('../../lib/uuid.js', () => ({
  newId: () => `test-id-${++idCounter}`,
}));

// Mock crypto for predictable encryption
vi.mock('../../lib/crypto.js', () => ({
  encrypt: (text: string) => `encrypted:${text}`,
  decrypt: (data: string) => data.startsWith('encrypted:') ? data.slice(10) : data,
}));

import {
  listIntegrations, getIntegration, getIntegrationDecrypted,
  createIntegration, updateIntegration, deleteIntegration,
} from './integrations.js';

describe('integrations model', () => {
  beforeEach(() => { setupTestDb(); idCounter = 0; });
  afterEach(() => { closeTestDb(); });

  it('creates an integration with encrypted token', () => {
    const pub = createIntegration({
      name: 'My Jira', type: 'jira', auth_token: 'secret-token-12345678',
      base_url: 'https://jira.example.com',
    });
    expect(pub.name).toBe('My Jira');
    expect(pub.type).toBe('jira');
    expect(pub.auth_token_masked).toContain('****');
    // Should NOT contain the full token
    expect(pub.auth_token_masked).not.toContain('secret-token-12345678');
  });

  it('stores encrypted token in database', () => {
    createIntegration({ name: 'I', type: 'jira', auth_token: 'my-secret' });
    const raw = getTestDb().prepare('SELECT auth_token FROM integrations').get() as any;
    expect(raw.auth_token).toBe('encrypted:my-secret');
  });

  it('getIntegrationDecrypted returns decrypted token', () => {
    const pub = createIntegration({ name: 'I', type: 'jira', auth_token: 'my-secret' });
    // Need to get the actual id
    const all = getTestDb().prepare('SELECT id FROM integrations').all() as any[];
    const decrypted = getIntegrationDecrypted(all[0].id);
    expect(decrypted!.decrypted_token).toBe('my-secret');
  });

  it('lists integrations with masked tokens', () => {
    createIntegration({ name: 'B', type: 'jira', auth_token: 'token-b-12345678' });
    createIntegration({ name: 'A', type: 'github', auth_token: 'token-a-12345678' });
    const list = listIntegrations();
    expect(list).toHaveLength(2);
    expect(list[0].name).toBe('A'); // ordered by name
    list.forEach(i => {
      expect(i.auth_token_masked).toContain('****');
      expect((i as any).auth_token).toBeUndefined(); // raw token not exposed
    });
  });

  it('masks short tokens completely', () => {
    createIntegration({ name: 'I', type: 'jira', auth_token: 'short' });
    const list = listIntegrations();
    expect(list[0].auth_token_masked).toBe('****');
  });

  it('creates with can_write flag', () => {
    createIntegration({ name: 'I', type: 'jira', auth_token: 'x', can_write: true });
    const all = getTestDb().prepare('SELECT can_write FROM integrations').all() as any[];
    expect(all[0].can_write).toBe(1);
  });

  it('updates integration', () => {
    createIntegration({ name: 'Old', type: 'jira', auth_token: 'token-old-12345678' });
    const all = getTestDb().prepare('SELECT id FROM integrations').all() as any[];
    const updated = updateIntegration(all[0].id, { name: 'New' });
    expect(updated!.name).toBe('New');
  });

  it('updates token when provided', () => {
    createIntegration({ name: 'I', type: 'jira', auth_token: 'old-token' });
    const all = getTestDb().prepare('SELECT id FROM integrations').all() as any[];
    updateIntegration(all[0].id, { auth_token: 'new-token-12345678' });
    const raw = getTestDb().prepare('SELECT auth_token FROM integrations WHERE id = ?').get(all[0].id) as any;
    expect(raw.auth_token).toBe('encrypted:new-token-12345678');
  });

  it('update returns undefined for unknown', () => {
    expect(updateIntegration('nope', { name: 'X' })).toBeUndefined();
  });

  it('deletes integration', () => {
    createIntegration({ name: 'Del', type: 'jira', auth_token: 'x' });
    const all = getTestDb().prepare('SELECT id FROM integrations').all() as any[];
    expect(deleteIntegration(all[0].id)).toBe(true);
    expect(listIntegrations()).toHaveLength(0);
  });

  it('delete returns false for unknown', () => {
    expect(deleteIntegration('nope')).toBe(false);
  });

  it('getIntegrationDecrypted returns undefined for unknown', () => {
    expect(getIntegrationDecrypted('nope')).toBeUndefined();
  });
});
