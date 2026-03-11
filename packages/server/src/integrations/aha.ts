import { IntegrationAdapter, IntegrationConfig, NormalizedItem, WriteResult } from './types.js';

function headers(config: IntegrationConfig): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Bearer ${config.authToken}`,
  };
}

function url(config: IntegrationConfig, path: string): string {
  return `${config.baseUrl.replace(/\/$/, '')}/api/v1${path}`;
}

function normalize(item: any, baseUrl: string): NormalizedItem {
  return {
    externalId: item.reference_num || item.id,
    title: item.name || '',
    description: item.description?.body || item.description || '',
    status: item.workflow_status?.name || '',
    url: item.url || `${baseUrl}/features/${item.reference_num}`,
    type: item.type || 'Feature',
    raw: item,
  };
}

export const ahaAdapter: IntegrationAdapter = {
  type: 'aha',

  async testConnection(config) {
    try {
      const res = await fetch(url(config, '/me'), { headers: headers(config) });
      if (!res.ok) return { ok: false, message: `HTTP ${res.status}: ${await res.text()}` };
      const data = await res.json() as any;
      return { ok: true, message: `Connected as ${data.user?.name || data.name || 'OK'}` };
    } catch (e: any) {
      return { ok: false, message: e.message };
    }
  },

  async fetchItem(config, itemId) {
    const res = await fetch(url(config, `/features/${itemId}`), { headers: headers(config) });
    if (!res.ok) throw new Error(`Aha! fetch failed: ${res.status}`);
    const data = await res.json() as any;
    return normalize(data.feature || data, config.baseUrl);
  },

  async searchItems(config, query) {
    const res = await fetch(url(config, `/features?q=${encodeURIComponent(query)}`), { headers: headers(config) });
    if (!res.ok) throw new Error(`Aha! search failed: ${res.status}`);
    const data = await res.json() as any;
    return (data.features || []).map((f: any) => normalize(f, config.baseUrl));
  },

  async createItem(config, data) {
    const body = { feature: { name: data.title, description: data.description } };
    const product = (config.extra as any)?.product_id || '';
    const res = await fetch(url(config, `/products/${product}/features`), {
      method: 'POST', headers: headers(config), body: JSON.stringify(body),
    });
    if (!res.ok) return { success: false, message: `Create failed: ${res.status}` };
    const result = await res.json() as any;
    return { success: true, externalId: result.feature?.reference_num, url: result.feature?.url, message: 'Feature created' };
  },

  async updateItem(config, itemId, data) {
    const body = { feature: data };
    const res = await fetch(url(config, `/features/${itemId}`), { method: 'PUT', headers: headers(config), body: JSON.stringify(body) });
    if (!res.ok) return { success: false, message: `Update failed: ${res.status}` };
    return { success: true, externalId: itemId, message: `Updated ${itemId}` };
  },
};
