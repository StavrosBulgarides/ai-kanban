import { getDb } from '../connection.js';
import { newId } from '../../lib/uuid.js';

export interface Skill {
  id: string;
  project_id: string | null;
  work_item_id: string | null;
  name: string;
  description: string;
  prompt_template: string;
  integration_ids: string;
  config: string;
  created_at: string;
  updated_at: string;
}

export function listSkills(filters?: { projectId?: string; workItemId?: string }): Skill[] {
  let sql = 'SELECT * FROM skills WHERE 1=1';
  const params: any[] = [];

  if (filters?.workItemId) {
    sql += ' AND (work_item_id = ? OR (project_id = (SELECT project_id FROM work_items WHERE id = ?) AND work_item_id IS NULL) OR (project_id IS NULL AND work_item_id IS NULL))';
    params.push(filters.workItemId, filters.workItemId);
  } else if (filters?.projectId) {
    sql += ' AND (project_id = ? OR (project_id IS NULL AND work_item_id IS NULL))';
    params.push(filters.projectId);
  }

  sql += ' ORDER BY name';
  return getDb().prepare(sql).all(...params) as Skill[];
}

export function getSkill(id: string): Skill | undefined {
  return getDb().prepare('SELECT * FROM skills WHERE id = ?').get(id) as Skill | undefined;
}

export function createSkill(data: {
  project_id?: string;
  work_item_id?: string;
  name: string;
  description?: string;
  prompt_template: string;
  integration_ids?: string[];
  config?: Record<string, unknown>;
}): Skill {
  const id = newId();
  const now = new Date().toISOString();
  getDb().prepare(`
    INSERT INTO skills (id, project_id, work_item_id, name, description, prompt_template, integration_ids, config, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, data.project_id || null, data.work_item_id || null,
    data.name, data.description || '', data.prompt_template,
    JSON.stringify(data.integration_ids || []),
    JSON.stringify(data.config || {}), now, now
  );
  return getSkill(id)!;
}

export function updateSkill(id: string, data: {
  name?: string;
  description?: string;
  prompt_template?: string;
  integration_ids?: string[];
  config?: Record<string, unknown>;
}): Skill | undefined {
  const existing = getSkill(id);
  if (!existing) return undefined;

  getDb().prepare(`
    UPDATE skills SET name = ?, description = ?, prompt_template = ?, integration_ids = ?, config = ?, updated_at = ?
    WHERE id = ?
  `).run(
    data.name ?? existing.name,
    data.description ?? existing.description,
    data.prompt_template ?? existing.prompt_template,
    data.integration_ids ? JSON.stringify(data.integration_ids) : existing.integration_ids,
    data.config ? JSON.stringify(data.config) : existing.config,
    new Date().toISOString(), id
  );

  return getSkill(id);
}

export function deleteSkill(id: string): boolean {
  return getDb().prepare('DELETE FROM skills WHERE id = ?').run(id).changes > 0;
}
