import { apiGet, apiPost, apiPut, apiDelete } from './client';
import type { WorkItem } from '@/types/models';

export const fetchWorkItems = (projectId: string) => apiGet<WorkItem[]>(`/projects/${projectId}/work-items`);
export const fetchWorkItem = (id: string) => apiGet<WorkItem>(`/work-items/${id}`);
export const createWorkItem = (projectId: string, data: { status_id: string; title: string; description?: string; priority?: string; parent_id?: string }) =>
  apiPost<WorkItem>(`/projects/${projectId}/work-items`, data);
export const updateWorkItem = (id: string, data: Partial<WorkItem>) => apiPut<WorkItem>(`/work-items/${id}`, data);
export const bulkUpdateWorkItems = (items: Array<{ id: string; status_id?: string; sort_order?: number }>) =>
  apiPut('/work-items-bulk', { items });
export const deleteWorkItem = (id: string) => apiDelete(`/work-items/${id}`);
