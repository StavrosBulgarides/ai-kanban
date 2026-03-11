import { apiGet, apiPost, apiPut, apiDelete } from './client';
import type { WorkItemTemplate, WorkItem } from '@/types/models';

export const fetchTemplates = (projectId?: string) =>
  apiGet<WorkItemTemplate[]>(`/templates${projectId ? `?projectId=${projectId}` : ''}`);
export const createTemplate = (data: {
  project_id?: string; name: string; description?: string;
  template_data: Record<string, unknown>; schedule_cron?: string;
  schedule_enabled?: boolean; target_status_id?: string;
}) => apiPost<WorkItemTemplate>('/templates', data);
export const updateTemplate = (id: string, data: Record<string, unknown>) =>
  apiPut<WorkItemTemplate>(`/templates/${id}`, data);
export const deleteTemplate = (id: string) => apiDelete(`/templates/${id}`);
export const triggerTemplate = (id: string) => apiPost<WorkItem>(`/templates/${id}/trigger`, {});
export const saveWorkItemAsTemplate = (workItemId: string, data: {
  name: string; schedule_cron?: string; schedule_enabled?: boolean; target_status_id?: string;
}) => apiPost<WorkItemTemplate>(`/work-items/${workItemId}/save-as-template`, data);
