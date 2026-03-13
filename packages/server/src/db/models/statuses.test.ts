import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupTestDb, closeTestDb, getTestDb } from '../../test/setupDb.js';

vi.mock('../connection.js', () => ({
  getDb: () => getTestDb(),
}));

let idCounter = 0;
vi.mock('../../lib/uuid.js', () => ({
  newId: () => `test-id-${++idCounter}`,
}));

import { listStatuses, getStatus, getStatusByName, createStatus, updateStatus, deleteStatus } from './statuses.js';

function createTestProject(): string {
  const db = getTestDb();
  const id = `proj-${idCounter++}`;
  db.prepare('INSERT INTO projects (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)').run(
    id, 'Test', new Date().toISOString(), new Date().toISOString()
  );
  return id;
}

describe('statuses model', () => {
  beforeEach(() => {
    setupTestDb();
    idCounter = 0;
  });

  afterEach(() => {
    closeTestDb();
  });

  describe('createStatus', () => {
    it('creates a status with defaults', () => {
      const projectId = createTestProject();
      const status = createStatus(projectId, { name: 'Backlog' });
      expect(status.name).toBe('Backlog');
      expect(status.color).toBe('#6b7280');
      expect(status.sort_order).toBe(0);
      expect(status.project_id).toBe(projectId);
    });

    it('creates with custom color', () => {
      const projectId = createTestProject();
      const status = createStatus(projectId, { name: 'Done', color: '#22c55e' });
      expect(status.color).toBe('#22c55e');
    });

    it('auto-increments sort_order', () => {
      const projectId = createTestProject();
      const a = createStatus(projectId, { name: 'A' });
      const b = createStatus(projectId, { name: 'B' });
      expect(b.sort_order).toBeGreaterThan(a.sort_order);
    });

    it('allows explicit sort_order', () => {
      const projectId = createTestProject();
      const status = createStatus(projectId, { name: 'X', sort_order: 99 });
      expect(status.sort_order).toBe(99);
    });
  });

  describe('listStatuses', () => {
    it('returns statuses ordered by sort_order', () => {
      const projectId = createTestProject();
      createStatus(projectId, { name: 'C', sort_order: 2 });
      createStatus(projectId, { name: 'A', sort_order: 0 });
      createStatus(projectId, { name: 'B', sort_order: 1 });
      const statuses = listStatuses(projectId);
      expect(statuses.map(s => s.name)).toEqual(['A', 'B', 'C']);
    });

    it('returns empty array for unknown project', () => {
      expect(listStatuses('nonexistent')).toEqual([]);
    });
  });

  describe('getStatus', () => {
    it('finds status by id', () => {
      const projectId = createTestProject();
      const created = createStatus(projectId, { name: 'Test' });
      expect(getStatus(created.id)!.name).toBe('Test');
    });

    it('returns undefined for unknown id', () => {
      expect(getStatus('nonexistent')).toBeUndefined();
    });
  });

  describe('getStatusByName', () => {
    it('finds status by project + name', () => {
      const projectId = createTestProject();
      createStatus(projectId, { name: 'In Progress' });
      const found = getStatusByName(projectId, 'In Progress');
      expect(found).toBeDefined();
      expect(found!.name).toBe('In Progress');
    });

    it('returns undefined for non-matching name', () => {
      const projectId = createTestProject();
      expect(getStatusByName(projectId, 'NonExistent')).toBeUndefined();
    });
  });

  describe('updateStatus', () => {
    it('updates name', () => {
      const projectId = createTestProject();
      const status = createStatus(projectId, { name: 'Old' });
      const updated = updateStatus(status.id, { name: 'New' });
      expect(updated!.name).toBe('New');
    });

    it('updates color', () => {
      const projectId = createTestProject();
      const status = createStatus(projectId, { name: 'S' });
      const updated = updateStatus(status.id, { color: '#ff0000' });
      expect(updated!.color).toBe('#ff0000');
    });

    it('updates is_hidden', () => {
      const projectId = createTestProject();
      const status = createStatus(projectId, { name: 'S' });
      const updated = updateStatus(status.id, { is_hidden: 1 });
      expect(updated!.is_hidden).toBe(1);
    });

    it('preserves unchanged fields', () => {
      const projectId = createTestProject();
      const status = createStatus(projectId, { name: 'Name', color: '#abc' });
      const updated = updateStatus(status.id, { name: 'Changed' });
      expect(updated!.color).toBe('#abc');
    });

    it('returns undefined for unknown id', () => {
      expect(updateStatus('nonexistent', { name: 'X' })).toBeUndefined();
    });
  });

  describe('deleteStatus', () => {
    it('deletes existing status', () => {
      const projectId = createTestProject();
      const status = createStatus(projectId, { name: 'Delete Me' });
      expect(deleteStatus(status.id)).toBe(true);
      expect(getStatus(status.id)).toBeUndefined();
    });

    it('returns false for unknown id', () => {
      expect(deleteStatus('nonexistent')).toBe(false);
    });
  });
});
