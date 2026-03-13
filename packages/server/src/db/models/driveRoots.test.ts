import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupTestDb, closeTestDb, getTestDb } from '../../test/setupDb.js';

vi.mock('../connection.js', () => ({
  getDb: () => getTestDb(),
}));

let idCounter = 0;
vi.mock('../../lib/uuid.js', () => ({
  newId: () => `test-id-${++idCounter}`,
}));

import { listDriveRoots, getDriveRoot, createDriveRoot, updateDriveRoot, deleteDriveRoot } from './driveRoots.js';

describe('driveRoots model', () => {
  beforeEach(() => { setupTestDb(); idCounter = 0; });
  afterEach(() => { closeTestDb(); });

  it('creates a drive root with defaults', () => {
    const root = createDriveRoot({ name: 'src', path: '/app/src' });
    expect(root.name).toBe('src');
    expect(root.path).toBe('/app/src');
    expect(root.purpose).toBe('input');
    expect(root.description).toBe('');
  });

  it('creates with output purpose', () => {
    const root = createDriveRoot({ name: 'out', path: '/app/out', purpose: 'output' });
    expect(root.purpose).toBe('output');
  });

  it('lists all drive roots', () => {
    createDriveRoot({ name: 'b', path: '/b' });
    createDriveRoot({ name: 'a', path: '/a' });
    const roots = listDriveRoots();
    expect(roots).toHaveLength(2);
    expect(roots[0].name).toBe('a'); // ordered by name
  });

  it('filters by purpose', () => {
    createDriveRoot({ name: 'in', path: '/in', purpose: 'input' });
    createDriveRoot({ name: 'out', path: '/out', purpose: 'output' });
    expect(listDriveRoots('input')).toHaveLength(1);
    expect(listDriveRoots('output')).toHaveLength(1);
  });

  it('gets by id', () => {
    const root = createDriveRoot({ name: 'test', path: '/test' });
    expect(getDriveRoot(root.id)!.name).toBe('test');
  });

  it('returns undefined for unknown id', () => {
    expect(getDriveRoot('nope')).toBeUndefined();
  });

  it('updates drive root fields', () => {
    const root = createDriveRoot({ name: 'old', path: '/old', description: 'desc' });
    const updated = updateDriveRoot(root.id, { name: 'new', path: '/new' });
    expect(updated!.name).toBe('new');
    expect(updated!.path).toBe('/new');
    expect(updated!.description).toBe('desc'); // preserved
  });

  it('update returns undefined for unknown id', () => {
    expect(updateDriveRoot('nope', { name: 'x' })).toBeUndefined();
  });

  it('deletes drive root', () => {
    const root = createDriveRoot({ name: 'del', path: '/del' });
    expect(deleteDriveRoot(root.id)).toBe(true);
    expect(getDriveRoot(root.id)).toBeUndefined();
  });

  it('delete returns false for unknown', () => {
    expect(deleteDriveRoot('nope')).toBe(false);
  });
});
