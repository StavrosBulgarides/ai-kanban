import { getDb } from '../connection.js';
import { newId } from '../../lib/uuid.js';

export interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export function listProjects(): Project[] {
  return getDb().prepare('SELECT * FROM projects ORDER BY created_at DESC').all() as Project[];
}

export function getProject(id: string): Project | undefined {
  return getDb().prepare('SELECT * FROM projects WHERE id = ?').get(id) as Project | undefined;
}

export function createProject(data: { name: string; description?: string }): Project {
  const db = getDb();
  const id = newId();
  const now = new Date().toISOString();

  db.prepare(
    'INSERT INTO projects (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, data.name, data.description || '', now, now);

  // Create default statuses
  const defaults = [
    { name: 'Backlog', color: '#6b7280', sort_order: 0 },
    { name: 'Todo', color: '#3b82f6', sort_order: 1 },
    { name: 'In Progress', color: '#f59e0b', sort_order: 2 },
    { name: 'In Review', color: '#8b5cf6', sort_order: 3 },
    { name: 'Done', color: '#22c55e', sort_order: 4 },
  ];

  const stmt = db.prepare(
    'INSERT INTO statuses (id, project_id, name, color, sort_order) VALUES (?, ?, ?, ?, ?)'
  );
  for (const s of defaults) {
    stmt.run(newId(), id, s.name, s.color, s.sort_order);
  }

  return getProject(id)!;
}

export function updateProject(id: string, data: { name?: string; description?: string }): Project | undefined {
  const existing = getProject(id);
  if (!existing) return undefined;

  getDb().prepare(
    'UPDATE projects SET name = ?, description = ?, updated_at = ? WHERE id = ?'
  ).run(data.name ?? existing.name, data.description ?? existing.description, new Date().toISOString(), id);

  return getProject(id);
}

export function deleteProject(id: string): boolean {
  const result = getDb().prepare('DELETE FROM projects WHERE id = ?').run(id);
  return result.changes > 0;
}
