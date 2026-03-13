import { getDb } from '../connection.js';
import { newId } from '../../lib/uuid.js';

export interface DriveRoot {
  id: string;
  name: string;
  path: string;
  description: string;
  purpose: 'input' | 'output';
  created_at: string;
}

export function listDriveRoots(purpose?: 'input' | 'output'): DriveRoot[] {
  if (purpose) {
    return getDb().prepare('SELECT * FROM drive_roots WHERE purpose = ? ORDER BY name').all(purpose) as DriveRoot[];
  }
  return getDb().prepare('SELECT * FROM drive_roots ORDER BY name').all() as DriveRoot[];
}

export function getDriveRoot(id: string): DriveRoot | undefined {
  return getDb().prepare('SELECT * FROM drive_roots WHERE id = ?').get(id) as DriveRoot | undefined;
}

export function createDriveRoot(data: { name: string; path: string; description?: string; purpose?: 'input' | 'output' }): DriveRoot {
  const purpose = data.purpose || 'input';
  const id = newId();
  getDb().prepare(
    'INSERT INTO drive_roots (id, name, path, description, purpose) VALUES (?, ?, ?, ?, ?)'
  ).run(id, data.name, data.path, data.description || '', purpose);
  return getDriveRoot(id)!;
}

export function updateDriveRoot(id: string, data: { name?: string; path?: string; description?: string }): DriveRoot | undefined {
  const existing = getDriveRoot(id);
  if (!existing) return undefined;
  getDb().prepare(
    'UPDATE drive_roots SET name = ?, path = ?, description = ? WHERE id = ?'
  ).run(data.name ?? existing.name, data.path ?? existing.path, data.description ?? existing.description, id);
  return getDriveRoot(id);
}

export function deleteDriveRoot(id: string): boolean {
  return getDb().prepare('DELETE FROM drive_roots WHERE id = ?').run(id).changes > 0;
}
