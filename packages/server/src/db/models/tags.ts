import { getDb } from '../connection.js';
import { newId } from '../../lib/uuid.js';

export interface Tag {
  id: string;
  project_id: string;
  name: string;
  color: string;
}

export interface WorkItemTag {
  work_item_id: string;
  tag_id: string;
}

export function listTags(projectId: string): Tag[] {
  return getDb().prepare('SELECT * FROM tags WHERE project_id = ? ORDER BY name').all(projectId) as Tag[];
}

export function createTag(projectId: string, data: { name: string; color?: string }): Tag {
  const id = newId();
  getDb().prepare('INSERT INTO tags (id, project_id, name, color) VALUES (?, ?, ?, ?)').run(
    id, projectId, data.name, data.color || '#6b7280'
  );
  return getDb().prepare('SELECT * FROM tags WHERE id = ?').get(id) as Tag;
}

export function deleteTag(id: string): boolean {
  return getDb().prepare('DELETE FROM tags WHERE id = ?').run(id).changes > 0;
}

export function getWorkItemTags(workItemId: string): Tag[] {
  return getDb().prepare(`
    SELECT t.* FROM tags t
    JOIN work_item_tags wt ON wt.tag_id = t.id
    WHERE wt.work_item_id = ?
    ORDER BY t.name
  `).all(workItemId) as Tag[];
}

export function addTagToWorkItem(workItemId: string, tagId: string): void {
  getDb().prepare(
    'INSERT OR IGNORE INTO work_item_tags (work_item_id, tag_id) VALUES (?, ?)'
  ).run(workItemId, tagId);
}

export function removeTagFromWorkItem(workItemId: string, tagId: string): void {
  getDb().prepare('DELETE FROM work_item_tags WHERE work_item_id = ? AND tag_id = ?').run(workItemId, tagId);
}
