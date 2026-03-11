import { getDb } from '../connection.js';
import { newId } from '../../lib/uuid.js';

export interface FileReference {
  id: string;
  work_item_id: string;
  drive_root_id: string | null;
  path: string;
  label: string;
  ref_type: string;
  created_at: string;
}

export function listFileReferences(workItemId: string): FileReference[] {
  return getDb()
    .prepare('SELECT * FROM file_references WHERE work_item_id = ? ORDER BY ref_type, path')
    .all(workItemId) as FileReference[];
}

export function createFileReference(workItemId: string, data: {
  drive_root_id?: string;
  path: string;
  label?: string;
  ref_type?: string;
}): FileReference {
  const id = newId();
  getDb().prepare(
    'INSERT INTO file_references (id, work_item_id, drive_root_id, path, label, ref_type) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, workItemId, data.drive_root_id || null, data.path, data.label || '', data.ref_type || 'reference');
  return getDb().prepare('SELECT * FROM file_references WHERE id = ?').get(id) as FileReference;
}

export function deleteFileReference(id: string): boolean {
  return getDb().prepare('DELETE FROM file_references WHERE id = ?').run(id).changes > 0;
}
