import { apiGet } from './client';

export interface AppConfig {
  enterpriseMode: boolean;
  defaultToolPermissions: Record<string, boolean>;
  features: {
    allowFileOpen: boolean;
  };
}

export function fetchConfig(): Promise<AppConfig> {
  return apiGet<AppConfig>('/config');
}
