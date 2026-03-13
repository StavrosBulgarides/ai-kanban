import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupTestDb, closeTestDb, getTestDb } from '../test/setupDb.js';

// Mock the connection module
vi.mock('../db/connection.js', () => ({
  getDb: () => getTestDb(),
}));

let idCounter = 0;
vi.mock('../lib/uuid.js', () => ({
  newId: () => `test-id-${++idCounter}`,
}));

// We need to test the pure/exported functions of executor
// Import after mocks are set up

describe('executor - parseStatusDirective', () => {
  // parseStatusDirective is not exported, so we test it indirectly
  // through the module's behavior, or we can extract it.
  // For now, let's test the extractFilePathsFromText function
  // which is also not exported. We'll test resolveToolPermissions instead.

  beforeEach(() => {
    setupTestDb();
    idCounter = 0;
  });

  afterEach(() => {
    closeTestDb();
  });

  describe('resolveToolPermissions', () => {
    it('returns all tools when no enterprise mode and no work item overrides', async () => {
      // Need to set up env for non-enterprise mode
      const originalEnv = { ...process.env };
      delete process.env.ENTERPRISE_MODE;
      delete process.env.DEFAULT_TOOL_PERMISSIONS;

      const { resolveToolPermissions } = await import('./executor.js');
      const tools = resolveToolPermissions();

      expect(tools).toContain('Read');
      expect(tools).toContain('Write');
      expect(tools).toContain('Edit');
      expect(tools).toContain('Bash');
      expect(tools).toContain('Glob');
      expect(tools).toContain('Grep');
      expect(tools).toContain('WebSearch');
      expect(tools).toContain('WebFetch');

      process.env = originalEnv;
    });

    it('applies work item overrides', async () => {
      const originalEnv = { ...process.env };
      delete process.env.ENTERPRISE_MODE;
      delete process.env.DEFAULT_TOOL_PERMISSIONS;

      const db = getTestDb();
      // Create project, status, and work item with tool_permissions
      db.prepare('INSERT INTO projects (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)').run(
        'proj-1', 'Test', new Date().toISOString(), new Date().toISOString()
      );
      db.prepare('INSERT INTO statuses (id, project_id, name, sort_order) VALUES (?, ?, ?, ?)').run(
        'status-1', 'proj-1', 'Backlog', 0
      );
      db.prepare('INSERT INTO work_items (id, project_id, status_id, title, tool_permissions, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        'wi-1', 'proj-1', 'status-1', 'Test', JSON.stringify({ Bash: false, Write: false }), new Date().toISOString(), new Date().toISOString()
      );

      const { resolveToolPermissions } = await import('./executor.js');
      const tools = resolveToolPermissions('wi-1');

      expect(tools).toContain('Read');
      expect(tools).not.toContain('Bash');
      expect(tools).not.toContain('Write');

      process.env = originalEnv;
    });
  });
});
