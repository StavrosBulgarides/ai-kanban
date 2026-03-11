import { apiGet, apiPost, apiPut, apiDelete } from './client';
import type { Integration, NormalizedItem } from '@/types/models';

export const fetchIntegrations = () => apiGet<Integration[]>('/integrations');
export const fetchIntegrationTypes = () => apiGet<string[]>('/integrations/types');
export const createIntegration = (data: { name: string; type: string; base_url?: string; auth_type?: string; auth_token: string; config?: string; can_write?: boolean }) =>
  apiPost<Integration>('/integrations', data);
export const updateIntegration = (id: string, data: Record<string, unknown>) => apiPut<Integration>(`/integrations/${id}`, data);
export const deleteIntegration = (id: string) => apiDelete(`/integrations/${id}`);
export const testIntegration = (id: string) => apiPost<{ ok: boolean; message: string }>(`/integrations/${id}/test`, {});
export const fetchIntegrationItem = (id: string, itemId: string) => apiGet<NormalizedItem>(`/integrations/${id}/fetch/${encodeURIComponent(itemId)}`);
export const searchIntegration = (id: string, query: string) => apiGet<NormalizedItem[]>(`/integrations/${id}/search?q=${encodeURIComponent(query)}`);
export const writeToIntegration = (id: string, data: { action: string; item_id?: string; data: unknown }) =>
  apiPost(`/integrations/${id}/write`, data);
