import { Router } from 'express';
import { z } from 'zod';
import * as WorkItems from '../db/models/workItems.js';

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
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(['urgent', 'high', 'medium', 'low', 'none']).optional(),
  sort_order: z.number().optional(),
  parent_id: z.string().optional(),
});

router.post('/projects/:projectId/work-items', (req, res) => {
  const data = createSchema.parse(req.body);
  res.status(201).json(WorkItems.createWorkItem(req.params.projectId, data));
});

const updateSchema = z.object({
  status_id: z.string().optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  priority: z.enum(['urgent', 'high', 'medium', 'low', 'none']).optional(),
  sort_order: z.number().optional(),
  parent_id: z.string().nullable().optional(),
});

router.put('/work-items/:id', (req, res) => {
  const data = updateSchema.parse(req.body);
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
  WorkItems.bulkUpdateWorkItems(items);
  res.json({ ok: true });
});

router.delete('/work-items/:id', (req, res) => {
  if (!WorkItems.deleteWorkItem(req.params.id)) return res.status(404).json({ error: 'Work item not found' });
  res.json({ ok: true });
});

export default router;
