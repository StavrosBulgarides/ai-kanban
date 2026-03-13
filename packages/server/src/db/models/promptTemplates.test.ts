import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupTestDb, closeTestDb, getTestDb } from '../../test/setupDb.js';

vi.mock('../connection.js', () => ({
  getDb: () => getTestDb(),
}));

let idCounter = 0;
vi.mock('../../lib/uuid.js', () => ({
  newId: () => `test-id-${++idCounter}`,
}));

import { listPromptTemplates, getPromptTemplate, createPromptTemplate, updatePromptTemplate, deletePromptTemplate } from './promptTemplates.js';

function createProject(): string {
  const db = getTestDb();
  const id = `proj-${idCounter++}`;
  db.prepare('INSERT INTO projects (id, name, created_at, updated_at) VALUES (?,?,?,?)').run(
    id, 'P', new Date().toISOString(), new Date().toISOString()
  );
  return id;
}

describe('promptTemplates model', () => {
  beforeEach(() => { setupTestDb(); idCounter = 0; });
  afterEach(() => { closeTestDb(); });

  it('creates a global template', () => {
    const tmpl = createPromptTemplate({ name: 'Summary', template: 'Summarize: {{text}}' });
    expect(tmpl.name).toBe('Summary');
    expect(tmpl.template).toBe('Summarize: {{text}}');
    expect(tmpl.project_id).toBeNull();
    expect(tmpl.variables).toBe('[]');
  });

  it('creates project-scoped template', () => {
    const projId = createProject();
    const tmpl = createPromptTemplate({ name: 'T', template: 'X', project_id: projId });
    expect(tmpl.project_id).toBe(projId);
  });

  it('stores variables as JSON', () => {
    const vars = [{ name: 'topic', type: 'string', default: 'AI' }];
    const tmpl = createPromptTemplate({ name: 'T', template: 'X', variables: vars });
    expect(JSON.parse(tmpl.variables)).toEqual(vars);
  });

  it('gets by id', () => {
    const tmpl = createPromptTemplate({ name: 'T', template: 'X' });
    expect(getPromptTemplate(tmpl.id)!.name).toBe('T');
  });

  it('returns undefined for unknown', () => {
    expect(getPromptTemplate('nope')).toBeUndefined();
  });

  it('lists all templates', () => {
    createPromptTemplate({ name: 'B', template: 'X' });
    createPromptTemplate({ name: 'A', template: 'X' });
    const templates = listPromptTemplates();
    expect(templates).toHaveLength(2);
    expect(templates[0].name).toBe('A');
  });

  it('lists templates filtered by project (includes global)', () => {
    const projId = createProject();
    createPromptTemplate({ name: 'Global', template: 'X' });
    createPromptTemplate({ name: 'Proj', template: 'X', project_id: projId });
    const templates = listPromptTemplates(projId);
    expect(templates).toHaveLength(2);
  });

  it('updates template', () => {
    const tmpl = createPromptTemplate({ name: 'Old', template: 'Old T' });
    const updated = updatePromptTemplate(tmpl.id, { name: 'New', template: 'New T' });
    expect(updated!.name).toBe('New');
    expect(updated!.template).toBe('New T');
  });

  it('preserves unchanged fields', () => {
    const tmpl = createPromptTemplate({ name: 'N', template: 'T', description: 'D' });
    const updated = updatePromptTemplate(tmpl.id, { name: 'X' });
    expect(updated!.description).toBe('D');
    expect(updated!.template).toBe('T');
  });

  it('update returns undefined for unknown', () => {
    expect(updatePromptTemplate('nope', { name: 'X' })).toBeUndefined();
  });

  it('deletes template', () => {
    const tmpl = createPromptTemplate({ name: 'Del', template: 'T' });
    expect(deletePromptTemplate(tmpl.id)).toBe(true);
    expect(getPromptTemplate(tmpl.id)).toBeUndefined();
  });

  it('delete returns false for unknown', () => {
    expect(deletePromptTemplate('nope')).toBe(false);
  });
});
