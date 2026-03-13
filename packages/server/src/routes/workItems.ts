import { Router } from 'express';
import { z } from 'zod';
import { unlinkSync, existsSync } from 'fs';
import * as WorkItems from '../db/models/workItems.js';
import { listFileReferences } from '../db/models/fileReferences.js';
import { getStatus } from '../db/models/statuses.js';
import { log } from '../services/eventLog.js';

const router = Router();

router.get('/projects/:projectId/work-items', (req, res) => {
  res.json(WorkItems.listWorkItems(req.params.projectId));
});

router.get('/work-items/:id', (req, res) => {
  const item = WorkItems.getWorkItem(req.params.id);
  if (!item) return res.status(404).json({ error: 'Work item not found' });
  res.json(item);
});

const createSchema = z.object({
  status_id: z.string(),
  title: z.string().optional().default(''),
  description: z.string().optional(),
  sort_order: z.number().optional(),
  parent_id: z.string().optional(),
});

router.post('/projects/:projectId/work-items', (req, res) => {
  const data = createSchema.parse(req.body);
  res.status(201).json(WorkItems.createWorkItem(req.params.projectId, data));
});

const updateSchema = z.object({
  status_id: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  sort_order: z.number().optional(),
  parent_id: z.string().nullable().optional(),
  viewed_output_at: z.string().nullable().optional(),
  tool_permissions: z.string().nullable().optional(),
});

router.put('/work-items/:id', (req, res) => {
  const data = updateSchema.parse(req.body);
  // Auto-manage in_progress_since when status changes
  if (data.status_id) {
    const newStatus = getStatus(data.status_id);
    if (newStatus?.name === 'In Progress') {
      const existing = WorkItems.getWorkItem(req.params.id);
      if (existing && existing.status_id !== data.status_id) {
        (data as any).in_progress_since = new Date().toISOString();
      }
    } else {
      (data as any).in_progress_since = null;
    }
  }
  const item = WorkItems.updateWorkItem(req.params.id, data);
  if (!item) return res.status(404).json({ error: 'Work item not found' });
  res.json(item);
});

const bulkUpdateSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    status_id: z.string().optional(),
    sort_order: z.number().optional(),
  })),
});

router.put('/work-items-bulk', (req, res) => {
  const { items } = bulkUpdateSchema.parse(req.body);
  // Auto-manage in_progress_since for status transitions
  const now = new Date().toISOString();
  const enriched = items.map((item) => {
    if (!item.status_id) return item;
    const newStatus = getStatus(item.status_id);
    if (newStatus?.name === 'In Progress') {
      const existing = WorkItems.getWorkItem(item.id);
      if (existing && existing.status_id !== item.status_id) {
        return { ...item, in_progress_since: now };
      }
    } else {
      return { ...item, in_progress_since: null as string | null };
    }
    return item;
  });
  WorkItems.bulkUpdateWorkItems(enriched);
  res.json({ ok: true });
});

router.delete('/work-items/:id', (req, res) => {
  const deleteFiles = req.query.delete_files === 'true';

  // If requested, delete output files from disk before removing the work item
  if (deleteFiles) {
    const refs = listFileReferences(req.params.id);
    const outputRefs = refs.filter(r => r.ref_type === 'output');
    for (const ref of outputRefs) {
      try {
        if (existsSync(ref.path)) {
          unlinkSync(ref.path);
          log('info', 'files', `Deleted output file: ${ref.path}`);
        }
      } catch (e: any) {
        log('warn', 'files', `Failed to delete output file: ${ref.path} — ${e.message}`);
      }
    }
  }

  if (!WorkItems.deleteWorkItem(req.params.id)) return res.status(404).json({ error: 'Work item not found' });
  res.json({ ok: true });
});

export default router;
