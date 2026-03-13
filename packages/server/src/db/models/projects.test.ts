import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupTestDb, closeTestDb, getTestDb } from '../../test/setupDb.js';

// Mock the connection module to use our test database
vi.mock('../connection.js', () => ({
  getDb: () => getTestDb(),
}));

// Mock uuid to produce predictable IDs
let idCounter = 0;
vi.mock('../../lib/uuid.js', () => ({
  newId: () => `test-id-${++idCounter}`,
}));

import { listProjects, getProject, createProject, updateProject, deleteProject } from './projects.js';

describe('projects model', () => {
  beforeEach(() => {
    setupTestDb();
    idCounter = 0;
  });

  afterEach(() => {
    closeTestDb();
  });

  describe('createProject', () => {
    it('creates a project with name', () => {
      const project = createProject({ name: 'My Project' });
      expect(project.name).toBe('My Project');
      expect(project.description).toBe('');
      expect(project.id).toBe('test-id-1');
    });

    it('creates a project with description', () => {
      const project = createProject({ name: 'P', description: 'A great project' });
      expect(project.description).toBe('A great project');
    });

    it('creates default statuses', () => {
      const project = createProject({ name: 'Test' });
      const statuses = getTestDb()
        .prepare('SELECT * FROM statuses WHERE project_id = ? ORDER BY sort_order')
        .all(project.id) as any[];
      expect(statuses).toHaveLength(4);
      expect(statuses.map((s: any) => s.name)).toEqual([
        'Backlog', 'In Progress', 'Input Required', 'Done',
      ]);
    });

    it('sets timestamps', () => {
      const project = createProject({ name: 'Test' });
      expect(project.created_at).toBeDefined();
      expect(project.updated_at).toBeDefined();
    });
  });

  describe('listProjects', () => {
    it('returns empty array when no projects', () => {
      expect(listProjects()).toEqual([]);
    });

    it('returns all projects', () => {
      createProject({ name: 'First' });
      createProject({ name: 'Second' });
      const projects = listProjects();
      expect(projects).toHaveLength(2);
      const names = projects.map(p => p.name);
      expect(names).toContain('First');
      expect(names).toContain('Second');
    });
  });

  describe('getProject', () => {
    it('returns project by id', () => {
      const created = createProject({ name: 'Test' });
      const found = getProject(created.id);
      expect(found).toBeDefined();
      expect(found!.name).toBe('Test');
    });

    it('returns undefined for unknown id', () => {
      expect(getProject('nonexistent')).toBeUndefined();
    });
  });

  describe('updateProject', () => {
    it('updates project name', () => {
      const project = createProject({ name: 'Old Name' });
      const updated = updateProject(project.id, { name: 'New Name' });
      expect(updated!.name).toBe('New Name');
    });

    it('updates project description', () => {
      const project = createProject({ name: 'P', description: 'old' });
      const updated = updateProject(project.id, { description: 'new' });
      expect(updated!.description).toBe('new');
    });

    it('preserves unchanged fields', () => {
      const project = createProject({ name: 'Name', description: 'Desc' });
      const updated = updateProject(project.id, { name: 'New Name' });
      expect(updated!.description).toBe('Desc');
    });

    it('returns undefined for unknown id', () => {
      expect(updateProject('nonexistent', { name: 'X' })).toBeUndefined();
    });
  });

  describe('deleteProject', () => {
    it('deletes existing project', () => {
      const project = createProject({ name: 'Test' });
      expect(deleteProject(project.id)).toBe(true);
      expect(getProject(project.id)).toBeUndefined();
    });

    it('returns false for unknown id', () => {
      expect(deleteProject('nonexistent')).toBe(false);
    });

    it('cascades to statuses', () => {
      const project = createProject({ name: 'Test' });
      deleteProject(project.id);
      const statuses = getTestDb()
        .prepare('SELECT * FROM statuses WHERE project_id = ?')
        .all(project.id);
      expect(statuses).toHaveLength(0);
    });
  });
});
