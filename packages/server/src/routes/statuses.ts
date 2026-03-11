import { Router } from 'express';
import { z } from 'zod';
import * as Statuses from '../db/models/statuses.js';

const router = Router();

router.get('/projects/:projectId/statuses', (req, res) => {
  res.json(Statuses.listStatuses(req.params.projectId));
});

router.post('/projects/:projectId/statuses', (req, res) => {
  const data = z.object({ name: z.string().min(1), color: z.string().optional(), sort_order: z.number().optional() }).parse(req.body);
  res.status(201).json(Statuses.createStatus(req.params.projectId, data));
});

router.put('/statuses/:id', (req, res) => {
  const data = z.object({ name: z.string().optional(), color: z.string().optional(), sort_order: z.number().optional(), is_hidden: z.number().optional() }).parse(req.body);
  const status = Statuses.updateStatus(req.params.id, data);
  if (!status) return res.status(404).json({ error: 'Status not found' });
  res.json(status);
});

router.delete('/statuses/:id', (req, res) => {
  if (!Statuses.deleteStatus(req.params.id)) return res.status(404).json({ error: 'Status not found' });
  res.json({ ok: true });
});

export default router;
