import { getDb } from '../connection.js';
import { newId } from '../../lib/uuid.js';

export interface WorkItem {
  id: string;
  project_id: string;
  status_id: string;
  title: string;
  description: string;
  priority: string;
  sort_order: number;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export function listWorkItems(projectId: string): WorkItem[] {
  return getDb()
    .prepare('SELECT * FROM work_items WHERE project_id = ? ORDER BY sort_order ASC')
    .all(projectId) as WorkItem[];
}

export function getWorkItem(id: string): WorkItem | undefined {
  return getDb().prepare('SELECT * FROM work_items WHERE id = ?').get(id) as WorkItem | undefined;
}

export function createWorkItem(projectId: string, data: {
  status_id: string;
  title: string;
  description?: string;
  priority?: string;
  sort_order?: number;
  parent_id?: string;
}): WorkItem {
  const id = newId();
  const now = new Date().toISOString();

  const maxOrder = getDb()
    .prepare('SELECT MAX(sort_order) as max_order FROM work_items WHERE status_id = ?')
    .get(data.status_id) as { max_order: number | null };

  getDb().prepare(`
    INSERT INTO work_items (id, project_id, status_id, title, description, priority, sort_order, parent_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, projectId, data.status_id, data.title,
    data.description || '', data.priority || 'none',
    data.sort_order ?? (maxOrder.max_order ?? -1) + 1,
    data.parent_id || null, now, now
  );

  return getWorkItem(id)!;
}

export function updateWorkItem(id: string, data: {
  status_id?: string;
  title?: string;
  description?: string;
  priority?: string;
  sort_order?: number;
  parent_id?: string | null;
}): WorkItem | undefined {
  const existing = getWorkItem(id);
  if (!existing) return undefined;

  getDb().prepare(`
    UPDATE work_items SET status_id = ?, title = ?, description = ?, priority = ?, sort_order = ?, parent_id = ?, updated_at = ?
    WHERE id = ?
  `).run(
    data.status_id ?? existing.status_id,
    data.title ?? existing.title,
    data.description ?? existing.description,
    data.priority ?? existing.priority,
    data.sort_order ?? existing.sort_order,
    data.parent_id !== undefined ? data.parent_id : existing.parent_id,
    new Date().toISOString(),
    id
  );

  return getWorkItem(id);
}

export function bulkUpdateWorkItems(items: Array<{ id: string; status_id?: string; sort_order?: number }>): void {
  const db = getDb();
  const stmt = db.prepare(`
    UPDATE work_items SET status_id = COALESCE(?, status_id), sort_order = COALESCE(?, sort_order), updated_at = ?
    WHERE id = ?
  `);

  const now = new Date().toISOString();
  const txn = db.transaction(() => {
    for (const item of items) {
      stmt.run(item.status_id || null, item.sort_order ?? null, now, item.id);
    }
  });
  txn();
}

export function deleteWorkItem(id: string): boolean {
  const result = getDb().prepare('DELETE FROM work_items WHERE id = ?').run(id);
  return result.changes > 0;
}
