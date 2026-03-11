import { apiGet, apiPost, apiDelete } from './client';
import type { Tag } from '@/types/models';

export const fetchTags = (projectId: string) => apiGet<Tag[]>(`/projects/${projectId}/tags`);
export const createTag = (projectId: string, data: { name: string; color?: string }) => apiPost<Tag>(`/projects/${projectId}/tags`, data);
export const deleteTag = (id: string) => apiDelete(`/tags/${id}`);
export const fetchWorkItemTags = (workItemId: string) => apiGet<Tag[]>(`/work-items/${workItemId}/tags`);
export const addTagToWorkItem = (workItemId: string, tagId: string) => apiPost(`/work-items/${workItemId}/tags`, { tag_id: tagId });
export const removeTagFromWorkItem = (workItemId: string, tagId: string) => apiDelete(`/work-items/${workItemId}/tags/${tagId}`);
