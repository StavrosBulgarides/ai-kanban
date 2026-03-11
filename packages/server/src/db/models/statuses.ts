import { getDb } from '../connection.js';
import { newId } from '../../lib/uuid.js';

export interface Status {
  id: string;
  project_id: string;
  name: string;
  color: string;
  sort_order: number;
  is_hidden: number;
}

export function listStatuses(projectId: string): Status[] {
  return getDb()
    .prepare('SELECT * FROM statuses WHERE project_id = ? ORDER BY sort_order ASC')
    .all(projectId) as Status[];
}

export function getStatus(id: string): Status | undefined {
  return getDb().prepare('SELECT * FROM statuses WHERE id = ?').get(id) as Status | undefined;
}

export function createStatus(projectId: string, data: { name: string; color?: string; sort_order?: number }): Status {
  const id = newId();
  const maxOrder = getDb()
    .prepare('SELECT MAX(sort_order) as max_order FROM statuses WHERE project_id = ?')
    .get(projectId) as { max_order: number | null };

  getDb().prepare(
    'INSERT INTO statuses (id, project_id, name, color, sort_order) VALUES (?, ?, ?, ?, ?)'
  ).run(id, projectId, data.name, data.color || '#6b7280', data.sort_order ?? (maxOrder.max_order ?? -1) + 1);

  return getStatus(id)!;
}

export function updateStatus(id: string, data: { name?: string; color?: string; sort_order?: number; is_hidden?: number }): Status | undefined {
  const existing = getStatus(id);
  if (!existing) return undefined;

  getDb().prepare(
    'UPDATE statuses SET name = ?, color = ?, sort_order = ?, is_hidden = ? WHERE id = ?'
  ).run(
    data.name ?? existing.name,
    data.color ?? existing.color,
    data.sort_order ?? existing.sort_order,
    data.is_hidden ?? existing.is_hidden,
    id
  );

  return getStatus(id);
}

export function deleteStatus(id: string): boolean {
  const result = getDb().prepare('DELETE FROM statuses WHERE id = ?').run(id);
  return result.changes > 0;
}
