import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupTestDb, closeTestDb, getTestDb } from '../../test/setupDb.js';

vi.mock('../connection.js', () => ({
  getDb: () => getTestDb(),
}));

let idCounter = 0;
vi.mock('../../lib/uuid.js', () => ({
  newId: () => `test-id-${++idCounter}`,
}));

import {
  listWorkItemTemplates, getWorkItemTemplate, createWorkItemTemplate,
  updateWorkItemTemplate, markTriggered, getScheduledTemplates, deleteWorkItemTemplate,
} from './workItemTemplates.js';

function createProject(): string {
  const db = getTestDb();
  const id = `proj-${idCounter++}`;
  db.prepare('INSERT INTO projects (id, name, created_at, updated_at) VALUES (?,?,?,?)').run(
    id, 'P', new Date().toISOString(), new Date().toISOString()
  );
  return id;
}

function createStatus(projectId: string): string {
  const db = getTestDb();
  const id = `stat-${idCounter++}`;
  db.prepare('INSERT INTO statuses (id, project_id, name, sort_order) VALUES (?,?,?,?)').run(id, projectId, 'B', 0);
  return id;
}

describe('workItemTemplates model', () => {
  beforeEach(() => { setupTestDb(); idCounter = 0; });
  afterEach(() => { closeTestDb(); });

  it('creates a template', () => {
    const tmpl = createWorkItemTemplate({
      name: 'Daily Standup', template_data: { title: 'Standup Notes' },
    });
    expect(tmpl.name).toBe('Daily Standup');
    expect(JSON.parse(tmpl.template_data)).toEqual({ title: 'Standup Notes' });
    expect(tmpl.schedule_enabled).toBe(0);
  });

  it('creates with schedule', () => {
    const projId = createProject();
    const statusId = createStatus(projId);
    const tmpl = createWorkItemTemplate({
      name: 'Scheduled', template_data: {},
      schedule_cron: '0 9 * * 1', schedule_enabled: true,
      target_status_id: statusId, project_id: projId,
    });
    expect(tmpl.schedule_cron).toBe('0 9 * * 1');
    expect(tmpl.schedule_enabled).toBe(1);
    expect(tmpl.target_status_id).toBe(statusId);
  });

  it('gets by id', () => {
    const tmpl = createWorkItemTemplate({ name: 'T', template_data: {} });
    expect(getWorkItemTemplate(tmpl.id)!.name).toBe('T');
  });

  it('returns undefined for unknown', () => {
    expect(getWorkItemTemplate('nope')).toBeUndefined();
  });

  it('lists all templates', () => {
    createWorkItemTemplate({ name: 'B', template_data: {} });
    createWorkItemTemplate({ name: 'A', template_data: {} });
    const templates = listWorkItemTemplates();
    expect(templates).toHaveLength(2);
    expect(templates[0].name).toBe('A');
  });

  it('lists filtered by project', () => {
    const projId = createProject();
    createWorkItemTemplate({ name: 'Global', template_data: {} });
    createWorkItemTemplate({ name: 'Proj', template_data: {}, project_id: projId });
    const templates = listWorkItemTemplates(projId);
    expect(templates).toHaveLength(2); // includes global
  });

  it('updates template', () => {
    const tmpl = createWorkItemTemplate({ name: 'Old', template_data: { x: 1 } });
    const updated = updateWorkItemTemplate(tmpl.id, { name: 'New', template_data: { x: 2 } });
    expect(updated!.name).toBe('New');
    expect(JSON.parse(updated!.template_data)).toEqual({ x: 2 });
  });

  it('preserves unchanged fields on update', () => {
    const tmpl = createWorkItemTemplate({ name: 'N', template_data: {}, description: 'D' });
    const updated = updateWorkItemTemplate(tmpl.id, { name: 'X' });
    expect(updated!.description).toBe('D');
  });

  it('update returns undefined for unknown', () => {
    expect(updateWorkItemTemplate('nope', { name: 'X' })).toBeUndefined();
  });

  it('markTriggered sets last_triggered_at', () => {
    const tmpl = createWorkItemTemplate({ name: 'T', template_data: {} });
    expect(tmpl.last_triggered_at).toBeNull();
    markTriggered(tmpl.id);
    const updated = getWorkItemTemplate(tmpl.id);
    expect(updated!.last_triggered_at).toBeDefined();
    expect(updated!.last_triggered_at).not.toBeNull();
  });

  it('getScheduledTemplates returns only enabled+scheduled', () => {
    createWorkItemTemplate({ name: 'NoSchedule', template_data: {} });
    createWorkItemTemplate({ name: 'Scheduled', template_data: {}, schedule_cron: '0 * * * *', schedule_enabled: true });
    createWorkItemTemplate({ name: 'DisabledCron', template_data: {}, schedule_cron: '0 * * * *', schedule_enabled: false });
    const scheduled = getScheduledTemplates();
    expect(scheduled).toHaveLength(1);
    expect(scheduled[0].name).toBe('Scheduled');
  });

  it('deletes template', () => {
    const tmpl = createWorkItemTemplate({ name: 'Del', template_data: {} });
    expect(deleteWorkItemTemplate(tmpl.id)).toBe(true);
    expect(getWorkItemTemplate(tmpl.id)).toBeUndefined();
  });

  it('delete returns false for unknown', () => {
    expect(deleteWorkItemTemplate('nope')).toBe(false);
  });
});
