import { apiGet, apiPost, apiPut, apiDelete } from './client';
import type { PromptTemplate } from '@/types/models';

export const fetchDefaultPrompt = () =>
  apiGet<{ template: string }>('/prompt-templates/default');

export const fetchPromptTemplates = (projectId?: string) => {
  const q = projectId ? `?projectId=${projectId}` : '';
  return apiGet<PromptTemplate[]>(`/prompt-templates${q}`);
};

export const createPromptTemplate = (data: {
  project_id?: string;
  name: string;
  description?: string;
  template: string;
  variables?: Array<{ name: string; type: string; default?: string }>;
}) => apiPost<PromptTemplate>('/prompt-templates', data);

export const updatePromptTemplate = (id: string, data: Record<string, unknown>) =>
  apiPut<PromptTemplate>(`/prompt-templates/${id}`, data);

export const deletePromptTemplate = (id: string) => apiDelete(`/prompt-templates/${id}`);

export const activatePromptTemplate = (id: string) =>
  apiPost<PromptTemplate>(`/prompt-templates/${id}/activate`, {});

export const deactivateAllPromptTemplates = () =>
  apiPost<{ ok: boolean }>('/prompt-templates/deactivate-all', {});
