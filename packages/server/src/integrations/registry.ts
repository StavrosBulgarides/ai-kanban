import { IntegrationAdapter, IntegrationConfig } from './types.js';
import { jiraAdapter } from './jira.js';
import { ahaAdapter } from './aha.js';
import { githubAdapter } from './github.js';
import { customAdapter } from './custom.js';

const adapters = new Map<string, IntegrationAdapter>();

adapters.set('jira', jiraAdapter);
adapters.set('aha', ahaAdapter);
adapters.set('github', githubAdapter);
adapters.set('custom', customAdapter);

export function getAdapter(type: string): IntegrationAdapter | undefined {
  return adapters.get(type);
}

export function listAdapterTypes(): string[] {
  return Array.from(adapters.keys());
}

export function registerAdapter(adapter: IntegrationAdapter): void {
  adapters.set(adapter.type, adapter);
}

export function buildConfig(integration: {
  base_url: string;
  auth_type: string;
  decrypted_token: string;
  can_write: number;
  config: string;
}): IntegrationConfig {
  return {
    baseUrl: integration.base_url,
    authType: integration.auth_type,
    authToken: integration.decrypted_token,
    canWrite: integration.can_write === 1,
    extra: JSON.parse(integration.config || '{}'),
  };
}
