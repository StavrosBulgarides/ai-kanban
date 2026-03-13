import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupTestDb, closeTestDb, getTestDb } from '../../test/setupDb.js';

vi.mock('../connection.js', () => ({
  getDb: () => getTestDb(),
}));

let idCounter = 0;
vi.mock('../../lib/uuid.js', () => ({
  newId: () => `test-id-${++idCounter}`,
}));

import { getAgentRun, listAgentRuns, createAgentRun, completeAgentRun } from './agentRuns.js';

function createProjectAndWorkItem(): string {
  const db = getTestDb();
  const projId = `proj-${idCounter++}`;
  const statusId = `stat-${idCounter++}`;
  const wiId = `wi-${idCounter++}`;
  const now = new Date().toISOString();
  db.prepare('INSERT INTO projects (id, name, created_at, updated_at) VALUES (?,?,?,?)').run(projId, 'P', now, now);
  db.prepare('INSERT INTO statuses (id, project_id, name, sort_order) VALUES (?,?,?,?)').run(statusId, projId, 'Backlog', 0);
  db.prepare('INSERT INTO work_items (id, project_id, status_id, title, created_at, updated_at) VALUES (?,?,?,?,?,?)').run(wiId, projId, statusId, 'T', now, now);
  return wiId;
}

describe('agentRuns model', () => {
  beforeEach(() => { setupTestDb(); idCounter = 0; });
  afterEach(() => { closeTestDb(); });

  it('creates an agent run with running status', () => {
    const run = createAgentRun({ prompt: 'Do something' });
    expect(run.status).toBe('running');
    expect(run.prompt).toBe('Do something');
    expect(run.work_item_id).toBeNull();
    expect(run.skill_id).toBeNull();
  });

  it('creates run linked to work item', () => {
    const wiId = createProjectAndWorkItem();
    const run = createAgentRun({ work_item_id: wiId, prompt: 'task' });
    expect(run.work_item_id).toBe(wiId);
  });

  it('gets run by id', () => {
    const run = createAgentRun({ prompt: 'hello' });
    const found = getAgentRun(run.id);
    expect(found).toBeDefined();
    expect(found!.prompt).toBe('hello');
  });

  it('returns undefined for unknown id', () => {
    expect(getAgentRun('nonexistent')).toBeUndefined();
  });

  it('lists runs for a work item', () => {
    const wiId = createProjectAndWorkItem();
    createAgentRun({ work_item_id: wiId, prompt: 'run1' });
    createAgentRun({ work_item_id: wiId, prompt: 'run2' });
    createAgentRun({ prompt: 'run3' }); // no work item
    const runs = listAgentRuns(wiId);
    expect(runs).toHaveLength(2);
  });

  it('completes a run', () => {
    const run = createAgentRun({ prompt: 'test' });
    const completed = completeAgentRun(run.id, 'result text', 'completed');
    expect(completed!.status).toBe('completed');
    expect(completed!.result).toBe('result text');
    expect(completed!.completed_at).toBeDefined();
  });

  it('marks a run as failed', () => {
    const run = createAgentRun({ prompt: 'test' });
    const failed = completeAgentRun(run.id, 'Error: boom', 'failed');
    expect(failed!.status).toBe('failed');
  });

  it('stores session_id on completion', () => {
    const run = createAgentRun({ prompt: 'test' });
    const completed = completeAgentRun(run.id, 'ok', 'completed', 'sess-123');
    expect(completed!.session_id).toBe('sess-123');
  });
});
