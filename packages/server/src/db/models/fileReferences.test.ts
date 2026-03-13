import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupTestDb, closeTestDb, getTestDb } from '../../test/setupDb.js';

vi.mock('../connection.js', () => ({
  getDb: () => getTestDb(),
}));

let idCounter = 0;
vi.mock('../../lib/uuid.js', () => ({
  newId: () => `test-id-${++idCounter}`,
}));

import { listFileReferences, createFileReference, deleteFileReference } from './fileReferences.js';

function createWorkItem(): string {
  const db = getTestDb();
  const projId = `proj-${idCounter++}`;
  const statusId = `stat-${idCounter++}`;
  const wiId = `wi-${idCounter++}`;
  const now = new Date().toISOString();
  db.prepare('INSERT INTO projects (id, name, created_at, updated_at) VALUES (?,?,?,?)').run(projId, 'P', now, now);
  db.prepare('INSERT INTO statuses (id, project_id, name, sort_order) VALUES (?,?,?,?)').run(statusId, projId, 'B', 0);
  db.prepare('INSERT INTO work_items (id, project_id, status_id, title, created_at, updated_at) VALUES (?,?,?,?,?,?)').run(wiId, projId, statusId, 'T', now, now);
  return wiId;
}

describe('fileReferences model', () => {
  beforeEach(() => { setupTestDb(); idCounter = 0; });
  afterEach(() => { closeTestDb(); });

  it('creates a file reference with defaults', () => {
    const wiId = createWorkItem();
    const ref = createFileReference(wiId, { path: '/app/file.txt' });
    expect(ref.path).toBe('/app/file.txt');
    expect(ref.ref_type).toBe('reference');
    expect(ref.label).toBe('');
    expect(ref.work_item_id).toBe(wiId);
  });

  it('creates with explicit type and label', () => {
    const wiId = createWorkItem();
    const ref = createFileReference(wiId, { path: '/out/report.pdf', ref_type: 'output', label: 'Report' });
    expect(ref.ref_type).toBe('output');
    expect(ref.label).toBe('Report');
  });

  it('lists references for work item', () => {
    const wiId = createWorkItem();
    createFileReference(wiId, { path: '/a.txt', ref_type: 'input' });
    createFileReference(wiId, { path: '/b.txt', ref_type: 'output' });
    const refs = listFileReferences(wiId);
    expect(refs).toHaveLength(2);
  });

  it('returns empty for unknown work item', () => {
    expect(listFileReferences('nonexistent')).toEqual([]);
  });

  it('deletes a file reference', () => {
    const wiId = createWorkItem();
    const ref = createFileReference(wiId, { path: '/del.txt' });
    expect(deleteFileReference(ref.id)).toBe(true);
    expect(listFileReferences(wiId)).toHaveLength(0);
  });

  it('delete returns false for unknown', () => {
    expect(deleteFileReference('nope')).toBe(false);
  });
});
