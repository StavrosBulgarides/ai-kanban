import { Router } from 'express';
import { z } from 'zod';
import * as Tags from '../db/models/tags.js';

const router = Router();

router.get('/projects/:projectId/tags', (req, res) => {
  res.json(Tags.listTags(req.params.projectId));
});

router.post('/projects/:projectId/tags', (req, res) => {
  const data = z.object({ name: z.string().min(1), color: z.string().optional() }).parse(req.body);
  res.status(201).json(Tags.createTag(req.params.projectId, data));
});

router.delete('/tags/:id', (req, res) => {
  if (!Tags.deleteTag(req.params.id)) return res.status(404).json({ error: 'Tag not found' });
  res.json({ ok: true });
});

router.get('/work-items/:id/tags', (req, res) => {
  res.json(Tags.getWorkItemTags(req.params.id));
});

router.post('/work-items/:id/tags', (req, res) => {
  const { tag_id } = z.object({ tag_id: z.string() }).parse(req.body);
  Tags.addTagToWorkItem(req.params.id, tag_id);
  res.json({ ok: true });
});

router.delete('/work-items/:workItemId/tags/:tagId', (req, res) => {
  Tags.removeTagFromWorkItem(req.params.workItemId, req.params.tagId);
  res.json({ ok: true });
});

export default router;
