import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupTestDb, closeTestDb, getTestDb } from '../../test/setupDb.js';

vi.mock('../connection.js', () => ({
  getDb: () => getTestDb(),
}));

let idCounter = 0;
vi.mock('../../lib/uuid.js', () => ({
  newId: () => `test-id-${++idCounter}`,
}));

import {
  listProjectDriveRoots, addProjectDriveRoot, removeProjectDriveRoot,
  listWorkItemDriveRoots, addWorkItemDriveRoot, removeWorkItemDriveRoot,
  hasWorkItemDriveRoots, getEffectiveDriveRoots,
} from './projectDriveRoots.js';
import { createDriveRoot } from './driveRoots.js';

function createProjectAndWI(): { projectId: string; wiId: string } {
  const db = getTestDb();
  const projectId = `proj-${idCounter++}`;
  const statusId = `stat-${idCounter++}`;
  const wiId = `wi-${idCounter++}`;
  const now = new Date().toISOString();
  db.prepare('INSERT INTO projects (id, name, created_at, updated_at) VALUES (?,?,?,?)').run(projectId, 'P', now, now);
  db.prepare('INSERT INTO statuses (id, project_id, name, sort_order) VALUES (?,?,?,?)').run(statusId, projectId, 'B', 0);
  db.prepare('INSERT INTO work_items (id, project_id, status_id, title, created_at, updated_at) VALUES (?,?,?,?,?,?)').run(wiId, projectId, statusId, 'T', now, now);
  return { projectId, wiId };
}

describe('projectDriveRoots model', () => {
  beforeEach(() => { setupTestDb(); idCounter = 0; });
  afterEach(() => { closeTestDb(); });

  describe('project drive roots', () => {
    it('adds and lists project drive roots', () => {
      const { projectId } = createProjectAndWI();
      const dr = createDriveRoot({ name: 'src', path: '/src' });
      addProjectDriveRoot(projectId, dr.id);
      const roots = listProjectDriveRoots(projectId);
      expect(roots).toHaveLength(1);
      expect(roots[0].name).toBe('src');
    });

    it('add is idempotent', () => {
      const { projectId } = createProjectAndWI();
      const dr = createDriveRoot({ name: 'src', path: '/src' });
      addProjectDriveRoot(projectId, dr.id);
      addProjectDriveRoot(projectId, dr.id);
      expect(listProjectDriveRoots(projectId)).toHaveLength(1);
    });

    it('removes project drive root', () => {
      const { projectId } = createProjectAndWI();
      const dr = createDriveRoot({ name: 'src', path: '/src' });
      addProjectDriveRoot(projectId, dr.id);
      expect(removeProjectDriveRoot(projectId, dr.id)).toBe(true);
      expect(listProjectDriveRoots(projectId)).toHaveLength(0);
    });

    it('remove returns false when not found', () => {
      expect(removeProjectDriveRoot('proj-999', 'dr-999')).toBe(false);
    });
  });

  describe('work item drive roots', () => {
    it('adds and lists work item drive roots', () => {
      const { wiId } = createProjectAndWI();
      const dr = createDriveRoot({ name: 'wi-src', path: '/wi-src' });
      addWorkItemDriveRoot(wiId, dr.id);
      const roots = listWorkItemDriveRoots(wiId);
      expect(roots).toHaveLength(1);
    });

    it('hasWorkItemDriveRoots returns false when empty', () => {
      const { wiId } = createProjectAndWI();
      expect(hasWorkItemDriveRoots(wiId)).toBe(false);
    });

    it('hasWorkItemDriveRoots returns true when has roots', () => {
      const { wiId } = createProjectAndWI();
      const dr = createDriveRoot({ name: 'x', path: '/x' });
      addWorkItemDriveRoot(wiId, dr.id);
      expect(hasWorkItemDriveRoots(wiId)).toBe(true);
    });

    it('removes work item drive root', () => {
      const { wiId } = createProjectAndWI();
      const dr = createDriveRoot({ name: 'x', path: '/x' });
      addWorkItemDriveRoot(wiId, dr.id);
      expect(removeWorkItemDriveRoot(wiId, dr.id)).toBe(true);
      expect(listWorkItemDriveRoots(wiId)).toHaveLength(0);
    });
  });

  describe('getEffectiveDriveRoots', () => {
    it('falls back to global roots when no overrides', () => {
      const { projectId, wiId } = createProjectAndWI();
      createDriveRoot({ name: 'global-in', path: '/global', purpose: 'input' });
      const effective = getEffectiveDriveRoots(wiId, projectId);
      expect(effective).toHaveLength(1);
      expect(effective[0].name).toBe('global-in');
    });

    it('uses project-level roots over global', () => {
      const { projectId, wiId } = createProjectAndWI();
      createDriveRoot({ name: 'global', path: '/global', purpose: 'input' });
      const projDr = createDriveRoot({ name: 'proj', path: '/proj', purpose: 'input' });
      addProjectDriveRoot(projectId, projDr.id);
      const effective = getEffectiveDriveRoots(wiId, projectId);
      expect(effective.map(d => d.name)).toContain('proj');
      expect(effective.map(d => d.name)).not.toContain('global');
    });

    it('uses work-item-level roots over project-level', () => {
      const { projectId, wiId } = createProjectAndWI();
      const projDr = createDriveRoot({ name: 'proj', path: '/proj', purpose: 'input' });
      addProjectDriveRoot(projectId, projDr.id);
      const wiDr = createDriveRoot({ name: 'wi', path: '/wi', purpose: 'input' });
      addWorkItemDriveRoot(wiId, wiDr.id);
      const effective = getEffectiveDriveRoots(wiId, projectId);
      expect(effective.map(d => d.name)).toContain('wi');
      expect(effective.map(d => d.name)).not.toContain('proj');
    });

    it('resolves input and output separately', () => {
      const { projectId, wiId } = createProjectAndWI();
      const wiIn = createDriveRoot({ name: 'wi-in', path: '/wi-in', purpose: 'input' });
      addWorkItemDriveRoot(wiId, wiIn.id);
      createDriveRoot({ name: 'global-out', path: '/global-out', purpose: 'output' });
      const effective = getEffectiveDriveRoots(wiId, projectId);
      const names = effective.map(d => d.name);
      expect(names).toContain('wi-in');
      expect(names).toContain('global-out');
    });
  });
});
