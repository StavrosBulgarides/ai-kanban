import { Router } from 'express';
import { z } from 'zod';
import * as Integrations from '../db/models/integrations.js';
import { getAdapter, buildConfig, listAdapterTypes } from '../integrations/registry.js';
import { decrypt } from '../lib/crypto.js';
import { logAudit } from '../services/eventLog.js';

const router = Router();

router.get('/integrations', (_req, res) => {
  res.json(Integrations.listIntegrations());
});

router.get('/integrations/types', (_req, res) => {
  res.json(listAdapterTypes());
});

const createSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  base_url: z.string().optional(),
  auth_type: z.enum(['pat', 'api_key', 'bearer']).optional(),
  auth_token: z.string().min(1),
  config: z.string().optional(),
  can_write: z.boolean().optional(),
});

router.post('/integrations', (req, res) => {
  const data = createSchema.parse(req.body);
  const integration = Integrations.createIntegration(data);
  logAudit('integration.create', `id=${integration.id} name="${data.name}" type=${data.type} can_write=${data.can_write ?? false}`);
  res.status(201).json(integration);
});

const updateSchema = z.object({
  name: z.string().optional(),
  base_url: z.string().optional(),
  auth_type: z.enum(['pat', 'api_key', 'bearer']).optional(),
  auth_token: z.string().optional(),
  config: z.string().optional(),
  is_active: z.boolean().optional(),
  can_write: z.boolean().optional(),
});

router.put('/integrations/:id', (req, res) => {
  const data = updateSchema.parse(req.body);
  const integration = Integrations.updateIntegration(req.params.id, data);
  if (!integration) return res.status(404).json({ error: 'Integration not found' });
  const changes = Object.entries(data).filter(([, v]) => v !== undefined).map(([k, v]) => `${k}=${v}`).join(' ');
  logAudit('integration.update', `id=${req.params.id} ${changes}`);
  res.json(integration);
});

router.delete('/integrations/:id', (req, res) => {
  if (!Integrations.deleteIntegration(req.params.id)) return res.status(404).json({ error: 'Integration not found' });
  logAudit('integration.delete', `id=${req.params.id}`);
  res.json({ ok: true });
});

router.post('/integrations/:id/test', async (req, res) => {
  const integration = Integrations.getIntegrationDecrypted(req.params.id);
  if (!integration) return res.status(404).json({ error: 'Integration not found' });

  const adapter = getAdapter(integration.type);
  if (!adapter) return res.status(400).json({ error: `No adapter for type: ${integration.type}` });

  const config = buildConfig(integration);
  const result = await adapter.testConnection(config);
  res.json(result);
});

// Integration data fetch endpoints (for agent/UI use)
router.get('/integrations/:id/fetch/:itemId', async (req, res) => {
  const integration = Integrations.getIntegrationDecrypted(req.params.id);
  if (!integration) return res.status(404).json({ error: 'Integration not found' });

  const adapter = getAdapter(integration.type);
  if (!adapter) return res.status(400).json({ error: `No adapter for type: ${integration.type}` });

  try {
    const config = buildConfig(integration);
    const item = await adapter.fetchItem(config, req.params.itemId);
    res.json(item);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/integrations/:id/search', async (req, res) => {
  const integration = Integrations.getIntegrationDecrypted(req.params.id);
  if (!integration) return res.status(404).json({ error: 'Integration not found' });

  const adapter = getAdapter(integration.type);
  if (!adapter) return res.status(400).json({ error: `No adapter for type: ${integration.type}` });

  try {
    const config = buildConfig(integration);
    const items = await adapter.searchItems(config, (req.query.q as string) || '');
    res.json(items);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Write-back endpoints
router.post('/integrations/:id/write', async (req, res) => {
  const integration = Integrations.getIntegrationDecrypted(req.params.id);
  if (!integration) return res.status(404).json({ error: 'Integration not found' });
  if (integration.can_write !== 1) return res.status(403).json({ error: 'Integration does not have write access' });

  const adapter = getAdapter(integration.type);
  if (!adapter) return res.status(400).json({ error: `No adapter for type: ${integration.type}` });

  const { action, item_id, data } = req.body;
  const config = buildConfig(integration);

  try {
    if (action === 'create' && adapter.createItem) {
      res.json(await adapter.createItem(config, data));
    } else if (action === 'update' && adapter.updateItem && item_id) {
      res.json(await adapter.updateItem(config, item_id, data));
    } else if (action === 'comment' && adapter.addComment && item_id) {
      res.json(await adapter.addComment(config, item_id, data.comment));
    } else {
      res.status(400).json({ error: 'Unsupported action or missing adapter method' });
    }
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
