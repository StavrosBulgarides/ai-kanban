import { apiGet, apiPost, apiPut, apiDelete } from './client';
import type { Status } from '@/types/models';

export const fetchStatuses = (projectId: string) => apiGet<Status[]>(`/projects/${projectId}/statuses`);
export const createStatus = (projectId: string, data: { name: string; color?: string }) => apiPost<Status>(`/projects/${projectId}/statuses`, data);
export const updateStatus = (id: string, data: { name?: string; color?: string; sort_order?: number; is_hidden?: number }) => apiPut<Status>(`/statuses/${id}`, data);
export const deleteStatus = (id: string) => apiDelete(`/statuses/${id}`);
