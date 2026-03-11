import { apiGet, apiPost, apiPut, apiDelete } from './client';
import type { Skill, AgentRun } from '@/types/models';

export const fetchSkills = (params?: { projectId?: string; workItemId?: string }) => {
  const q = new URLSearchParams();
  if (params?.projectId) q.set('projectId', params.projectId);
  if (params?.workItemId) q.set('workItemId', params.workItemId);
  return apiGet<Skill[]>(`/skills?${q}`);
};
export const createSkill = (data: { project_id?: string; work_item_id?: string; name: string; description?: string; prompt_template: string; integration_ids?: string[]; config?: Record<string, unknown> }) =>
  apiPost<Skill>('/skills', data);
export const updateSkill = (id: string, data: Record<string, unknown>) => apiPut<Skill>(`/skills/${id}`, data);
export const deleteSkill = (id: string) => apiDelete(`/skills/${id}`);
export const executeSkill = (id: string, data: { work_item_id?: string; variables?: Record<string, string>; additional_prompt?: string }) =>
  apiPost<AgentRun>(`/skills/${id}/execute`, data);

export const fetchAgentRuns = (workItemId: string) => apiGet<AgentRun[]>(`/work-items/${workItemId}/agent-runs`);
export const runAgent = (data: { prompt: string; work_item_id?: string; integration_ids?: string[] }) =>
  apiPost<AgentRun>('/agent/run', data);
