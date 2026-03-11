import { IntegrationAdapter, IntegrationConfig, NormalizedItem, WriteResult } from './types.js';

function headers(config: IntegrationConfig): Record<string, string> {
  return {
    'Accept': 'application/vnd.github+json',
    'Authorization': `Bearer ${config.authToken}`,
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

function apiUrl(config: IntegrationConfig, path: string): string {
  const base = config.baseUrl || 'https://api.github.com';
  return `${base.replace(/\/$/, '')}${path}`;
}

function normalize(issue: any): NormalizedItem {
  return {
    externalId: `${issue.number}`,
    title: issue.title || '',
    description: issue.body || '',
    status: issue.state || '',
    url: issue.html_url || '',
    type: issue.pull_request ? 'PullRequest' : 'Issue',
    raw: issue,
  };
}

export const githubAdapter: IntegrationAdapter = {
  type: 'github',

  async testConnection(config) {
    try {
      const res = await fetch(apiUrl(config, '/user'), { headers: headers(config) });
      if (!res.ok) return { ok: false, message: `HTTP ${res.status}: ${await res.text()}` };
      const data = await res.json() as any;
      return { ok: true, message: `Connected as ${data.login}` };
    } catch (e: any) {
      return { ok: false, message: e.message };
    }
  },

  async fetchItem(config, itemId) {
    // itemId format: "owner/repo#number"
    const match = itemId.match(/^(.+?)#(\d+)$/);
    if (!match) throw new Error('Item ID must be in format owner/repo#number');
    const [, repo, number] = match;
    const res = await fetch(apiUrl(config, `/repos/${repo}/issues/${number}`), { headers: headers(config) });
    if (!res.ok) throw new Error(`GitHub fetch failed: ${res.status}`);
    return normalize(await res.json());
  },

  async searchItems(config, query) {
    const res = await fetch(apiUrl(config, `/search/issues?q=${encodeURIComponent(query)}&per_page=20`), { headers: headers(config) });
    if (!res.ok) throw new Error(`GitHub search failed: ${res.status}`);
    const data = await res.json() as any;
    return (data.items || []).map(normalize);
  },

  async createItem(config, data) {
    const repo = (config.extra as any)?.repo || data.repo;
    if (!repo) return { success: false, message: 'No repo specified in integration config or request' };
    const body = { title: data.title, body: data.description, labels: data.labels };
    const res = await fetch(apiUrl(config, `/repos/${repo}/issues`), { method: 'POST', headers: headers(config), body: JSON.stringify(body) });
    if (!res.ok) return { success: false, message: `Create failed: ${res.status}` };
    const result = await res.json() as any;
    return { success: true, externalId: `${result.number}`, url: result.html_url, message: `Created #${result.number}` };
  },

  async updateItem(config, itemId, data) {
    const match = itemId.match(/^(.+?)#(\d+)$/);
    if (!match) return { success: false, message: 'Invalid item ID format' };
    const [, repo, number] = match;
    const res = await fetch(apiUrl(config, `/repos/${repo}/issues/${number}`), { method: 'PATCH', headers: headers(config), body: JSON.stringify(data) });
    if (!res.ok) return { success: false, message: `Update failed: ${res.status}` };
    return { success: true, externalId: itemId, message: `Updated ${itemId}` };
  },

  async addComment(config, itemId, comment) {
    const match = itemId.match(/^(.+?)#(\d+)$/);
    if (!match) return { success: false, message: 'Invalid item ID format' };
    const [, repo, number] = match;
    const res = await fetch(apiUrl(config, `/repos/${repo}/issues/${number}/comments`), { method: 'POST', headers: headers(config), body: JSON.stringify({ body: comment }) });
    if (!res.ok) return { success: false, message: `Comment failed: ${res.status}` };
    return { success: true, message: 'Comment added' };
  },
};
