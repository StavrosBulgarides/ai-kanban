import { getDb } from '../connection.js';
import { newId } from '../../lib/uuid.js';

export interface PromptTemplate {
  id: string;
  project_id: string | null;
  name: string;
  description: string;
  template: string;
  variables: string;
  created_at: string;
  updated_at: string;
}

export function listPromptTemplates(projectId?: string): PromptTemplate[] {
  if (projectId) {
    return getDb().prepare(
      'SELECT * FROM prompt_templates WHERE project_id = ? OR project_id IS NULL ORDER BY name'
    ).all(projectId) as PromptTemplate[];
  }
  return getDb().prepare('SELECT * FROM prompt_templates ORDER BY name').all() as PromptTemplate[];
}

export function getPromptTemplate(id: string): PromptTemplate | undefined {
  return getDb().prepare('SELECT * FROM prompt_templates WHERE id = ?').get(id) as PromptTemplate | undefined;
}

export function createPromptTemplate(data: {
  project_id?: string;
  name: string;
  description?: string;
  template: string;
  variables?: Array<{ name: string; type: string; default?: string }>;
}): PromptTemplate {
  const id = newId();
  const now = new Date().toISOString();
  getDb().prepare(`
    INSERT INTO prompt_templates (id, project_id, name, description, template, variables, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.project_id || null, data.name, data.description || '', data.template, JSON.stringify(data.variables || []), now, now);
  return getPromptTemplate(id)!;
}

export function updatePromptTemplate(id: string, data: {
  name?: string;
  description?: string;
  template?: string;
  variables?: Array<{ name: string; type: string; default?: string }>;
}): PromptTemplate | undefined {
  const existing = getPromptTemplate(id);
  if (!existing) return undefined;

  getDb().prepare(`
    UPDATE prompt_templates SET name = ?, description = ?, template = ?, variables = ?, updated_at = ? WHERE id = ?
  `).run(
    data.name ?? existing.name, data.description ?? existing.description,
    data.template ?? existing.template,
    data.variables ? JSON.stringify(data.variables) : existing.variables,
    new Date().toISOString(), id
  );
  return getPromptTemplate(id);
}

export function deletePromptTemplate(id: string): boolean {
  return getDb().prepare('DELETE FROM prompt_templates WHERE id = ?').run(id).changes > 0;
}
