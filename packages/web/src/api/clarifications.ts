import { apiGet, apiPost } from './client';
import type { ClarificationMessage } from '@/types/models';

export const fetchClarifications = (workItemId: string) =>
  apiGet<ClarificationMessage[]>(`/work-items/${workItemId}/clarifications`);

export const sendClarification = (workItemId: string, content: string) =>
  apiPost<{ messages: ClarificationMessage[]; ready: boolean }>(`/work-items/${workItemId}/clarifications`, { content });
