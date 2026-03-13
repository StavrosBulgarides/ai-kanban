import { getDb } from '../connection.js';
import { newId } from '../../lib/uuid.js';

export interface AgentRun {
  id: string;
  work_item_id: string | null;
  skill_id: string | null;
  prompt: string;
  result: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  session_id: string | null;
}

export function getAgentRun(id: string): AgentRun | undefined {
  return getDb().prepare('SELECT * FROM agent_runs WHERE id = ?').get(id) as AgentRun | undefined;
}

export function listAgentRuns(workItemId: string): AgentRun[] {
  return getDb()
    .prepare('SELECT * FROM agent_runs WHERE work_item_id = ? ORDER BY started_at DESC')
    .all(workItemId) as AgentRun[];
}

export function createAgentRun(data: {
  work_item_id?: string;
  skill_id?: string;
  prompt: string;
}): AgentRun {
  const id = newId();
  getDb().prepare(`
    INSERT INTO agent_runs (id, work_item_id, skill_id, prompt, status) VALUES (?, ?, ?, ?, 'running')
  `).run(id, data.work_item_id || null, data.skill_id || null, data.prompt);
  return getAgentRun(id)!;
}

export function completeAgentRun(id: string, result: string, status: 'completed' | 'failed', sessionId?: string): AgentRun | undefined {
  getDb().prepare(`
    UPDATE agent_runs SET result = ?, status = ?, completed_at = datetime('now'), session_id = ? WHERE id = ?
  `).run(result, status, sessionId || null, id);
  return getAgentRun(id);
}
