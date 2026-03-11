import { IntegrationAdapter, IntegrationConfig, NormalizedItem, WriteResult } from './types.js';

function headers(config: IntegrationConfig): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
  if (config.authType === 'pat' || config.authType === 'basic') {
    h['Authorization'] = `Basic ${Buffer.from(config.authToken).toString('base64')}`;
  } else {
    h['Authorization'] = `Bearer ${config.authToken}`;
  }
  return h;
}

function url(config: IntegrationConfig, path: string): string {
  const base = config.baseUrl.replace(/\/$/, '');
  return `${base}/rest/api/3${path}`;
}

function normalize(issue: any, baseUrl: string): NormalizedItem {
  return {
    externalId: issue.key,
    title: issue.fields?.summary || '',
    description: issue.fields?.description?.content?.[0]?.content?.[0]?.text || JSON.stringify(issue.fields?.description) || '',
    status: issue.fields?.status?.name || '',
    url: `${baseUrl}/browse/${issue.key}`,
    type: issue.fields?.issuetype?.name || 'Issue',
    raw: issue,
  };
}

export const jiraAdapter: IntegrationAdapter = {
  type: 'jira',

  async testConnection(config) {
    try {
      const res = await fetch(url(config, '/myself'), { headers: headers(config) });
      if (!res.ok) return { ok: false, message: `HTTP ${res.status}: ${await res.text()}` };
      const data = await res.json() as any;
      return { ok: true, message: `Connected as ${data.displayName || data.emailAddress}` };
    } catch (e: any) {
      return { ok: false, message: e.message };
    }
  },

  async fetchItem(config, itemId) {
    const res = await fetch(url(config, `/issue/${itemId}`), { headers: headers(config) });
    if (!res.ok) throw new Error(`Jira fetch failed: ${res.status}`);
    const issue = await res.json();
    return normalize(issue, config.baseUrl.replace(/\/$/, ''));
  },

  async searchItems(config, query) {
    const jql = encodeURIComponent(query);
    const res = await fetch(url(config, `/search?jql=${jql}&maxResults=20`), { headers: headers(config) });
    if (!res.ok) throw new Error(`Jira search failed: ${res.status}`);
    const data = await res.json() as any;
    return (data.issues || []).map((i: any) => normalize(i, config.baseUrl.replace(/\/$/, '')));
  },

  async createItem(config, data) {
    const body = {
      fields: {
        summary: data.title,
        description: data.description ? { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: data.description }] }] } : undefined,
        project: data.project ? { key: data.project } : undefined,
        issuetype: { name: data.issueType || 'Task' },
      },
    };
    const res = await fetch(url(config, '/issue'), { method: 'POST', headers: headers(config), body: JSON.stringify(body) });
    if (!res.ok) return { success: false, message: `Create failed: ${res.status} ${await res.text()}` };
    const result = await res.json() as any;
    return { success: true, externalId: result.key, url: `${config.baseUrl.replace(/\/$/, '')}/browse/${result.key}`, message: `Created ${result.key}` };
  },

  async updateItem(config, itemId, data) {
    const body = { fields: data };
    const res = await fetch(url(config, `/issue/${itemId}`), { method: 'PUT', headers: headers(config), body: JSON.stringify(body) });
    if (!res.ok) return { success: false, message: `Update failed: ${res.status}` };
    return { success: true, externalId: itemId, message: `Updated ${itemId}` };
  },

  async addComment(config, itemId, comment) {
    const body = { body: { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: comment }] }] } };
    const res = await fetch(url(config, `/issue/${itemId}/comment`), { method: 'POST', headers: headers(config), body: JSON.stringify(body) });
    if (!res.ok) return { success: false, message: `Comment failed: ${res.status}` };
    return { success: true, message: `Comment added to ${itemId}` };
  },
};
