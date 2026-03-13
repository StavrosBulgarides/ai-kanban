import { getDb } from '../connection.js';
import { newId } from '../../lib/uuid.js';

export interface ClarificationMessage {
  id: string;
  work_item_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export function listMessages(workItemId: string): ClarificationMessage[] {
  return getDb()
    .prepare('SELECT * FROM clarification_messages WHERE work_item_id = ? ORDER BY created_at ASC')
    .all(workItemId) as ClarificationMessage[];
}

export function createMessage(data: {
  work_item_id: string;
  role: 'user' | 'assistant';
  content: string;
}): ClarificationMessage {
  const id = newId();
  getDb().prepare(`
    INSERT INTO clarification_messages (id, work_item_id, role, content) VALUES (?, ?, ?, ?)
  `).run(id, data.work_item_id, data.role, data.content);
  return getDb().prepare('SELECT * FROM clarification_messages WHERE id = ?').get(id) as ClarificationMessage;
}
