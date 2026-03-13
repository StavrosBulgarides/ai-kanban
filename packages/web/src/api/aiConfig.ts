import { apiGet, apiPut, apiPost } from './client';

export interface AIConfig {
  provider: string;
  model: string;
  maxTurns: number;
  apiKeySet: boolean;
  baseUrl: string;
}

export interface AccountInfo {
  email?: string;
  organization?: string;
  subscriptionType?: string;
  authMethod?: string;
}

export interface AIConfigResponse {
  config: AIConfig;
  account: AccountInfo | null;
}

export function fetchAIConfig(): Promise<AIConfigResponse> {
  return apiGet<AIConfigResponse>('/ai-config');
}

export function updateAIConfig(body: {
  provider?: string;
  model?: string;
  maxTurns?: number;
  apiKey?: string;
  baseUrl?: string;
}): Promise<{ ok: boolean }> {
  return apiPut('/ai-config', body);
}

export function refreshAccount(): Promise<{ account: AccountInfo | null }> {
  return apiPost('/ai-config/refresh-account', {});
}
