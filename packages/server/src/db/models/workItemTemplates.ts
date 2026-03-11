import { getDb } from '../connection.js';
import { newId } from '../../lib/uuid.js';

export interface WorkItemTemplate {
  id: string;
  project_id: string | null;
  name: string;
  description: string;
  template_data: string; // JSON: { title, description, priority, tags[], skill_ids[], file_refs[] }
  schedule_cron: string | null;
  schedule_enabled: number;
  target_status_id: string | null;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
}

export function listWorkItemTemplates(projectId?: string): WorkItemTemplate[] {
  if (projectId) {
    return getDb().prepare(
      'SELECT * FROM work_item_templates WHERE project_id = ? OR project_id IS NULL ORDER BY name'
    ).all(projectId) as WorkItemTemplate[];
  }
  return getDb().prepare('SELECT * FROM work_item_templates ORDER BY name').all() as WorkItemTemplate[];
}

export function getWorkItemTemplate(id: string): WorkItemTemplate | undefined {
  return getDb().prepare('SELECT * FROM work_item_templates WHERE id = ?').get(id) as WorkItemTemplate | undefined;
}

export function createWorkItemTemplate(data: {
  project_id?: string;
  name: string;
  description?: string;
  template_data: Record<string, unknown>;
  schedule_cron?: string;
  schedule_enabled?: boolean;
  target_status_id?: string;
}): WorkItemTemplate {
  const id = newId();
  const now = new Date().toISOString();
  getDb().prepare(`
    INSERT INTO work_item_templates (id, project_id, name, description, template_data, schedule_cron, schedule_enabled, target_status_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, data.project_id || null, data.name, data.description || '',
    JSON.stringify(data.template_data), data.schedule_cron || null,
    data.schedule_enabled ? 1 : 0, data.target_status_id || null, now, now
  );
  return getWorkItemTemplate(id)!;
}

export function updateWorkItemTemplate(id: string, data: {
  name?: string;
  description?: string;
  template_data?: Record<string, unknown>;
  schedule_cron?: string | null;
  schedule_enabled?: boolean;
  target_status_id?: string | null;
}): WorkItemTemplate | undefined {
  const existing = getWorkItemTemplate(id);
  if (!existing) return undefined;

  getDb().prepare(`
    UPDATE work_item_templates SET name = ?, description = ?, template_data = ?, schedule_cron = ?, schedule_enabled = ?, target_status_id = ?, updated_at = ?
    WHERE id = ?
  `).run(
    data.name ?? existing.name,
    data.description ?? existing.description,
    data.template_data ? JSON.stringify(data.template_data) : existing.template_data,
    data.schedule_cron !== undefined ? data.schedule_cron : existing.schedule_cron,
    data.schedule_enabled !== undefined ? (data.schedule_enabled ? 1 : 0) : existing.schedule_enabled,
    data.target_status_id !== undefined ? data.target_status_id : existing.target_status_id,
    new Date().toISOString(), id
  );
  return getWorkItemTemplate(id);
}

export function markTriggered(id: string): void {
  getDb().prepare(
    'UPDATE work_item_templates SET last_triggered_at = datetime(\'now\') WHERE id = ?'
  ).run(id);
}

export function getScheduledTemplates(): WorkItemTemplate[] {
  return getDb().prepare(
    'SELECT * FROM work_item_templates WHERE schedule_enabled = 1 AND schedule_cron IS NOT NULL'
  ).all() as WorkItemTemplate[];
}

export function deleteWorkItemTemplate(id: string): boolean {
  return getDb().prepare('DELETE FROM work_item_templates WHERE id = ?').run(id).changes > 0;
}
