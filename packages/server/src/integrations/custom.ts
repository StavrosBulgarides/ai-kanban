import { IntegrationAdapter, IntegrationConfig, NormalizedItem } from './types.js';

function headers(config: IntegrationConfig): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
  if (config.authType === 'api_key') {
    const headerName = (config.extra as any)?.auth_header || 'X-API-Key';
    h[headerName] = config.authToken;
  } else if (config.authType === 'bearer') {
    h['Authorization'] = `Bearer ${config.authToken}`;
  } else if (config.authType === 'pat') {
    h['Authorization'] = `Basic ${Buffer.from(config.authToken).toString('base64')}`;
  }
  return h;
}

export const customAdapter: IntegrationAdapter = {
  type: 'custom',

  async testConnection(config) {
    const testPath = (config.extra as any)?.test_endpoint || '/';
    try {
      const res = await fetch(`${config.baseUrl.replace(/\/$/, '')}${testPath}`, { headers: headers(config) });
      if (!res.ok) return { ok: false, message: `HTTP ${res.status}` };
      return { ok: true, message: 'Connection successful' };
    } catch (e: any) {
      return { ok: false, message: e.message };
    }
  },

  async fetchItem(config, itemId) {
    const fetchPath = (config.extra as any)?.fetch_endpoint || `/items/${itemId}`;
    const resolvedPath = fetchPath.replace('{{id}}', itemId);
    const res = await fetch(`${config.baseUrl.replace(/\/$/, '')}${resolvedPath}`, { headers: headers(config) });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    const data = await res.json() as any;
    const mapping = (config.extra as any)?.field_mapping || {};
    return {
      externalId: data[mapping.id || 'id'] || itemId,
      title: data[mapping.title || 'title'] || '',
      description: data[mapping.description || 'description'] || '',
      status: data[mapping.status || 'status'] || '',
      url: data[mapping.url || 'url'] || '',
      type: 'Custom',
      raw: data,
    };
  },

  async searchItems(config, query) {
    const searchPath = ((config.extra as any)?.search_endpoint || '/search?q={{query}}').replace('{{query}}', encodeURIComponent(query));
    const res = await fetch(`${config.baseUrl.replace(/\/$/, '')}${searchPath}`, { headers: headers(config) });
    if (!res.ok) throw new Error(`Search failed: ${res.status}`);
    const data = await res.json() as any;
    const results = Array.isArray(data) ? data : data.items || data.results || [];
    const mapping = (config.extra as any)?.field_mapping || {};
    return results.map((item: any): NormalizedItem => ({
      externalId: item[mapping.id || 'id'] || '',
      title: item[mapping.title || 'title'] || '',
      description: item[mapping.description || 'description'] || '',
      status: item[mapping.status || 'status'] || '',
      url: item[mapping.url || 'url'] || '',
      type: 'Custom',
      raw: item,
    }));
  },
};
