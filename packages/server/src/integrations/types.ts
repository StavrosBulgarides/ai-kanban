export interface IntegrationConfig {
  baseUrl: string;
  authType: string;
  authToken: string;
  canWrite: boolean;
  extra: Record<string, unknown>;
}

export interface NormalizedItem {
  externalId: string;
  title: string;
  description: string;
  status: string;
  url: string;
  type: string;
  raw: unknown;
}

export interface WriteResult {
  success: boolean;
  externalId?: string;
  url?: string;
  message: string;
}

export interface IntegrationAdapter {
  type: string;
  testConnection(config: IntegrationConfig): Promise<{ ok: boolean; message: string }>;
  fetchItem(config: IntegrationConfig, itemId: string): Promise<NormalizedItem>;
  searchItems(config: IntegrationConfig, query: string): Promise<NormalizedItem[]>;
  createItem?(config: IntegrationConfig, data: { title: string; description?: string; [key: string]: unknown }): Promise<WriteResult>;
  updateItem?(config: IntegrationConfig, itemId: string, data: Record<string, unknown>): Promise<WriteResult>;
  addComment?(config: IntegrationConfig, itemId: string, comment: string): Promise<WriteResult>;
}
