import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupTestDb, closeTestDb, getTestDb } from '../../test/setupDb.js';

vi.mock('../connection.js', () => ({
  getDb: () => getTestDb(),
}));

let idCounter = 0;
vi.mock('../../lib/uuid.js', () => ({
  newId: () => `test-id-${++idCounter}`,
}));

import { listTags, createTag, deleteTag, getWorkItemTags, addTagToWorkItem, removeTagFromWorkItem } from './tags.js';

function createTestProjectWithStatus(): { projectId: string; statusId: string } {
  const db = getTestDb();
  const projectId = `proj-${idCounter++}`;
  const statusId = `status-${idCounter++}`;
  db.prepare('INSERT INTO projects (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)').run(
    projectId, 'Test', new Date().toISOString(), new Date().toISOString()
  );
  db.prepare('INSERT INTO statuses (id, project_id, name, sort_order) VALUES (?, ?, ?, ?)').run(
    statusId, projectId, 'Backlog', 0
  );
  return { projectId, statusId };
}

function createTestWorkItem(projectId: string, statusId: string): string {
  const db = getTestDb();
  const id = `wi-${idCounter++}`;
  db.prepare('INSERT INTO work_items (id, project_id, status_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    id, projectId, statusId, 'Test Item', new Date().toISOString(), new Date().toISOString()
  );
  return id;
}

describe('tags model', () => {
  beforeEach(() => {
    setupTestDb();
    idCounter = 0;
  });

  afterEach(() => {
    closeTestDb();
  });

  describe('createTag', () => {
    it('creates a tag with default color', () => {
      const { projectId } = createTestProjectWithStatus();
      const tag = createTag(projectId, { name: 'bug' });
      expect(tag.name).toBe('bug');
      expect(tag.color).toBe('#6b7280');
      expect(tag.project_id).toBe(projectId);
    });

    it('creates a tag with custom color', () => {
      const { projectId } = createTestProjectWithStatus();
      const tag = createTag(projectId, { name: 'urgent', color: '#ef4444' });
      expect(tag.color).toBe('#ef4444');
    });
  });

  describe('listTags', () => {
    it('returns tags ordered by name', () => {
      const { projectId } = createTestProjectWithStatus();
      createTag(projectId, { name: 'zebra' });
      createTag(projectId, { name: 'alpha' });
      createTag(projectId, { name: 'mid' });
      const tags = listTags(projectId);
      expect(tags.map(t => t.name)).toEqual(['alpha', 'mid', 'zebra']);
    });

    it('returns empty array for unknown project', () => {
      expect(listTags('nonexistent')).toEqual([]);
    });
  });

  describe('deleteTag', () => {
    it('deletes existing tag', () => {
      const { projectId } = createTestProjectWithStatus();
      const tag = createTag(projectId, { name: 'delete-me' });
      expect(deleteTag(tag.id)).toBe(true);
      expect(listTags(projectId)).toHaveLength(0);
    });

    it('returns false for unknown id', () => {
      expect(deleteTag('nonexistent')).toBe(false);
    });
  });

  describe('work item tags', () => {
    it('adds tag to work item', () => {
      const { projectId, statusId } = createTestProjectWithStatus();
      const wiId = createTestWorkItem(projectId, statusId);
      const tag = createTag(projectId, { name: 'important' });

      addTagToWorkItem(wiId, tag.id);
      const tags = getWorkItemTags(wiId);
      expect(tags).toHaveLength(1);
      expect(tags[0].name).toBe('important');
    });

    it('adding same tag twice is idempotent (INSERT OR IGNORE)', () => {
      const { projectId, statusId } = createTestProjectWithStatus();
      const wiId = createTestWorkItem(projectId, statusId);
      const tag = createTag(projectId, { name: 'dup' });

      addTagToWorkItem(wiId, tag.id);
      addTagToWorkItem(wiId, tag.id);
      expect(getWorkItemTags(wiId)).toHaveLength(1);
    });

    it('removes tag from work item', () => {
      const { projectId, statusId } = createTestProjectWithStatus();
      const wiId = createTestWorkItem(projectId, statusId);
      const tag = createTag(projectId, { name: 'remove-me' });

      addTagToWorkItem(wiId, tag.id);
      removeTagFromWorkItem(wiId, tag.id);
      expect(getWorkItemTags(wiId)).toHaveLength(0);
    });

    it('returns multiple tags ordered by name', () => {
      const { projectId, statusId } = createTestProjectWithStatus();
      const wiId = createTestWorkItem(projectId, statusId);
      const tag1 = createTag(projectId, { name: 'z-tag' });
      const tag2 = createTag(projectId, { name: 'a-tag' });

      addTagToWorkItem(wiId, tag1.id);
      addTagToWorkItem(wiId, tag2.id);
      const tags = getWorkItemTags(wiId);
      expect(tags.map(t => t.name)).toEqual(['a-tag', 'z-tag']);
    });

    it('returns empty array for work item with no tags', () => {
      const { projectId, statusId } = createTestProjectWithStatus();
      const wiId = createTestWorkItem(projectId, statusId);
      expect(getWorkItemTags(wiId)).toEqual([]);
    });
  });
});
