import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupTestDb, closeTestDb, getTestDb } from '../../test/setupDb.js';

vi.mock('../connection.js', () => ({
  getDb: () => getTestDb(),
}));

let idCounter = 0;
vi.mock('../../lib/uuid.js', () => ({
  newId: () => `test-id-${++idCounter}`,
}));

import { listSkills, getSkill, createSkill, updateSkill, deleteSkill } from './skills.js';

function createProject(): string {
  const db = getTestDb();
  const id = `proj-${idCounter++}`;
  db.prepare('INSERT INTO projects (id, name, created_at, updated_at) VALUES (?,?,?,?)').run(
    id, 'P', new Date().toISOString(), new Date().toISOString()
  );
  return id;
}

describe('skills model', () => {
  beforeEach(() => { setupTestDb(); idCounter = 0; });
  afterEach(() => { closeTestDb(); });

  it('creates a global skill', () => {
    const skill = createSkill({ name: 'Summarize', prompt_template: 'Summarize {{text}}' });
    expect(skill.name).toBe('Summarize');
    expect(skill.prompt_template).toBe('Summarize {{text}}');
    expect(skill.project_id).toBeNull();
    expect(skill.integration_ids).toBe('[]');
    expect(skill.config).toBe('{}');
  });

  it('creates project-scoped skill', () => {
    const projId = createProject();
    const skill = createSkill({ name: 'S', prompt_template: 'T', project_id: projId });
    expect(skill.project_id).toBe(projId);
  });

  it('stores integration_ids as JSON', () => {
    const skill = createSkill({ name: 'S', prompt_template: 'T', integration_ids: ['int-1', 'int-2'] });
    expect(JSON.parse(skill.integration_ids)).toEqual(['int-1', 'int-2']);
  });

  it('gets skill by id', () => {
    const skill = createSkill({ name: 'S', prompt_template: 'T' });
    expect(getSkill(skill.id)!.name).toBe('S');
  });

  it('returns undefined for unknown id', () => {
    expect(getSkill('nope')).toBeUndefined();
  });

  it('lists all skills', () => {
    createSkill({ name: 'B', prompt_template: 'T' });
    createSkill({ name: 'A', prompt_template: 'T' });
    const skills = listSkills();
    expect(skills).toHaveLength(2);
    expect(skills[0].name).toBe('A'); // ordered by name
  });

  it('lists skills filtered by project', () => {
    const projId = createProject();
    createSkill({ name: 'Global', prompt_template: 'T' });
    createSkill({ name: 'Project', prompt_template: 'T', project_id: projId });
    const skills = listSkills({ projectId: projId });
    expect(skills).toHaveLength(2); // project + global
  });

  it('updates skill', () => {
    const skill = createSkill({ name: 'Old', prompt_template: 'Old T' });
    const updated = updateSkill(skill.id, { name: 'New', prompt_template: 'New T' });
    expect(updated!.name).toBe('New');
    expect(updated!.prompt_template).toBe('New T');
  });

  it('update preserves unchanged fields', () => {
    const skill = createSkill({ name: 'Name', prompt_template: 'Prompt', description: 'Desc' });
    const updated = updateSkill(skill.id, { name: 'Changed' });
    expect(updated!.description).toBe('Desc');
    expect(updated!.prompt_template).toBe('Prompt');
  });

  it('update returns undefined for unknown', () => {
    expect(updateSkill('nope', { name: 'X' })).toBeUndefined();
  });

  it('deletes skill', () => {
    const skill = createSkill({ name: 'Del', prompt_template: 'T' });
    expect(deleteSkill(skill.id)).toBe(true);
    expect(getSkill(skill.id)).toBeUndefined();
  });

  it('delete returns false for unknown', () => {
    expect(deleteSkill('nope')).toBe(false);
  });
});
