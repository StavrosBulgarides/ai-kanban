import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupTestDb, closeTestDb, getTestDb } from '../../test/setupDb.js';

vi.mock('../connection.js', () => ({
  getDb: () => getTestDb(),
}));

let idCounter = 0;
vi.mock('../../lib/uuid.js', () => ({
  newId: () => `test-id-${++idCounter}`,
}));

import { listMessages, createMessage } from './clarificationMessages.js';

function createWorkItem(): string {
  const db = getTestDb();
  const projId = `proj-${idCounter++}`;
  const statusId = `stat-${idCounter++}`;
  const wiId = `wi-${idCounter++}`;
  const now = new Date().toISOString();
  db.prepare('INSERT INTO projects (id, name, created_at, updated_at) VALUES (?,?,?,?)').run(projId, 'P', now, now);
  db.prepare('INSERT INTO statuses (id, project_id, name, sort_order) VALUES (?,?,?,?)').run(statusId, projId, 'B', 0);
  db.prepare('INSERT INTO work_items (id, project_id, status_id, title, created_at, updated_at) VALUES (?,?,?,?,?,?)').run(wiId, projId, statusId, 'T', now, now);
  return wiId;
}

describe('clarificationMessages model', () => {
  beforeEach(() => { setupTestDb(); idCounter = 0; });
  afterEach(() => { closeTestDb(); });

  it('creates a user message', () => {
    const wiId = createWorkItem();
    const msg = createMessage({ work_item_id: wiId, role: 'user', content: 'What do you mean?' });
    expect(msg.role).toBe('user');
    expect(msg.content).toBe('What do you mean?');
    expect(msg.work_item_id).toBe(wiId);
  });

  it('creates an assistant message', () => {
    const wiId = createWorkItem();
    const msg = createMessage({ work_item_id: wiId, role: 'assistant', content: 'I need clarification' });
    expect(msg.role).toBe('assistant');
  });

  it('lists messages in order', () => {
    const wiId = createWorkItem();
    createMessage({ work_item_id: wiId, role: 'assistant', content: 'first' });
    createMessage({ work_item_id: wiId, role: 'user', content: 'second' });
    const messages = listMessages(wiId);
    expect(messages).toHaveLength(2);
    expect(messages[0].content).toBe('first');
    expect(messages[1].content).toBe('second');
  });

  it('returns empty array when no messages', () => {
    expect(listMessages('nonexistent')).toEqual([]);
  });
});
