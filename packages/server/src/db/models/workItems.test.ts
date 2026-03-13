import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupTestDb, closeTestDb, getTestDb } from '../../test/setupDb.js';

vi.mock('../connection.js', () => ({
  getDb: () => getTestDb(),
}));

let idCounter = 0;
vi.mock('../../lib/uuid.js', () => ({
  newId: () => `test-id-${++idCounter}`,
}));

import { listWorkItems, getWorkItem, createWorkItem, updateWorkItem, bulkUpdateWorkItems, deleteWorkItem } from './workItems.js';

// Helper to set up project + status
function createTestProject(): { projectId: string; statusId: string; status2Id: string } {
  const db = getTestDb();
  const projectId = `proj-${idCounter++}`;
  const statusId = `status-${idCounter++}`;
  const status2Id = `status-${idCounter++}`;
  db.prepare('INSERT INTO projects (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)').run(
    projectId, 'Test', new Date().toISOString(), new Date().toISOString()
  );
  db.prepare('INSERT INTO statuses (id, project_id, name, sort_order) VALUES (?, ?, ?, ?)').run(
    statusId, projectId, 'Backlog', 0
  );
  db.prepare('INSERT INTO statuses (id, project_id, name, sort_order) VALUES (?, ?, ?, ?)').run(
    status2Id, projectId, 'Done', 1
  );
  return { projectId, statusId, status2Id };
}

describe('workItems model', () => {
  beforeEach(() => {
    setupTestDb();
    idCounter = 0;
  });

  afterEach(() => {
    closeTestDb();
  });

  describe('createWorkItem', () => {
    it('creates a work item with defaults', () => {
      const { projectId, statusId } = createTestProject();
      const item = createWorkItem(projectId, { status_id: statusId });
      expect(item.project_id).toBe(projectId);
      expect(item.status_id).toBe(statusId);
      expect(item.title).toBe('');
      expect(item.description).toBe('');
      expect(item.sort_order).toBe(0);
    });

    it('creates with title and description', () => {
      const { projectId, statusId } = createTestProject();
      const item = createWorkItem(projectId, {
        status_id: statusId,
        title: 'My Task',
        description: 'Do stuff',
      });
      expect(item.title).toBe('My Task');
      expect(item.description).toBe('Do stuff');
    });

    it('auto-increments sort_order within a status', () => {
      const { projectId, statusId } = createTestProject();
      const a = createWorkItem(projectId, { status_id: statusId, title: 'A' });
      const b = createWorkItem(projectId, { status_id: statusId, title: 'B' });
      expect(b.sort_order).toBeGreaterThan(a.sort_order);
    });

    it('allows explicit sort_order', () => {
      const { projectId, statusId } = createTestProject();
      const item = createWorkItem(projectId, { status_id: statusId, sort_order: 42 });
      expect(item.sort_order).toBe(42);
    });
  });

  describe('listWorkItems', () => {
    it('returns items for a project ordered by sort_order', () => {
      const { projectId, statusId } = createTestProject();
      createWorkItem(projectId, { status_id: statusId, title: 'C', sort_order: 2 });
      createWorkItem(projectId, { status_id: statusId, title: 'A', sort_order: 0 });
      createWorkItem(projectId, { status_id: statusId, title: 'B', sort_order: 1 });
      const items = listWorkItems(projectId);
      expect(items.map(i => i.title)).toEqual(['A', 'B', 'C']);
    });

    it('returns empty array for unknown project', () => {
      expect(listWorkItems('nonexistent')).toEqual([]);
    });
  });

  describe('getWorkItem', () => {
    it('returns item by id', () => {
      const { projectId, statusId } = createTestProject();
      const created = createWorkItem(projectId, { status_id: statusId, title: 'Find Me' });
      const found = getWorkItem(created.id);
      expect(found).toBeDefined();
      expect(found!.title).toBe('Find Me');
    });

    it('returns undefined for unknown id', () => {
      expect(getWorkItem('nonexistent')).toBeUndefined();
    });
  });

  describe('updateWorkItem', () => {
    it('updates title', () => {
      const { projectId, statusId } = createTestProject();
      const item = createWorkItem(projectId, { status_id: statusId, title: 'Old' });
      const updated = updateWorkItem(item.id, { title: 'New' });
      expect(updated!.title).toBe('New');
    });

    it('updates status_id', () => {
      const { projectId, statusId, status2Id } = createTestProject();
      const item = createWorkItem(projectId, { status_id: statusId });
      const updated = updateWorkItem(item.id, { status_id: status2Id });
      expect(updated!.status_id).toBe(status2Id);
    });

    it('updates in_progress_since', () => {
      const { projectId, statusId } = createTestProject();
      const item = createWorkItem(projectId, { status_id: statusId });
      const now = new Date().toISOString();
      const updated = updateWorkItem(item.id, { in_progress_since: now });
      expect(updated!.in_progress_since).toBe(now);
    });

    it('can set in_progress_since to null', () => {
      const { projectId, statusId } = createTestProject();
      const item = createWorkItem(projectId, { status_id: statusId });
      updateWorkItem(item.id, { in_progress_since: new Date().toISOString() });
      const updated = updateWorkItem(item.id, { in_progress_since: null });
      expect(updated!.in_progress_since).toBeNull();
    });

    it('preserves unchanged fields', () => {
      const { projectId, statusId } = createTestProject();
      const item = createWorkItem(projectId, { status_id: statusId, title: 'Title', description: 'Desc' });
      const updated = updateWorkItem(item.id, { title: 'New Title' });
      expect(updated!.description).toBe('Desc');
      expect(updated!.status_id).toBe(statusId);
    });

    it('returns undefined for unknown id', () => {
      expect(updateWorkItem('nonexistent', { title: 'X' })).toBeUndefined();
    });

    it('updates tool_permissions', () => {
      const { projectId, statusId } = createTestProject();
      const item = createWorkItem(projectId, { status_id: statusId });
      const perms = JSON.stringify({ Read: true, Write: false });
      const updated = updateWorkItem(item.id, { tool_permissions: perms });
      expect(updated!.tool_permissions).toBe(perms);
    });
  });

  describe('bulkUpdateWorkItems', () => {
    it('updates multiple items in a transaction', () => {
      const { projectId, statusId, status2Id } = createTestProject();
      const a = createWorkItem(projectId, { status_id: statusId, title: 'A' });
      const b = createWorkItem(projectId, { status_id: statusId, title: 'B' });

      bulkUpdateWorkItems([
        { id: a.id, status_id: status2Id, sort_order: 10 },
        { id: b.id, sort_order: 20 },
      ]);

      expect(getWorkItem(a.id)!.status_id).toBe(status2Id);
      expect(getWorkItem(a.id)!.sort_order).toBe(10);
      expect(getWorkItem(b.id)!.sort_order).toBe(20);
    });

    it('updates in_progress_since when specified', () => {
      const { projectId, statusId } = createTestProject();
      const item = createWorkItem(projectId, { status_id: statusId });
      const now = new Date().toISOString();

      bulkUpdateWorkItems([{ id: item.id, in_progress_since: now }]);
      expect(getWorkItem(item.id)!.in_progress_since).toBe(now);
    });

    it('can clear in_progress_since', () => {
      const { projectId, statusId } = createTestProject();
      const item = createWorkItem(projectId, { status_id: statusId });
      const now = new Date().toISOString();

      bulkUpdateWorkItems([{ id: item.id, in_progress_since: now }]);
      bulkUpdateWorkItems([{ id: item.id, in_progress_since: null }]);
      expect(getWorkItem(item.id)!.in_progress_since).toBeNull();
    });
  });

  describe('deleteWorkItem', () => {
    it('deletes existing item', () => {
      const { projectId, statusId } = createTestProject();
      const item = createWorkItem(projectId, { status_id: statusId });
      expect(deleteWorkItem(item.id)).toBe(true);
      expect(getWorkItem(item.id)).toBeUndefined();
    });

    it('returns false for unknown id', () => {
      expect(deleteWorkItem('nonexistent')).toBe(false);
    });
  });
});
