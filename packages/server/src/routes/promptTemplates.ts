import { Router } from 'express';
import { z } from 'zod';
import * as PromptTemplates from '../db/models/promptTemplates.js';
import { WORKFLOW_SYSTEM_PROMPT } from '../agent/executor.js';

const router = Router();

router.get('/prompt-templates/default', (_req, res) => {
  res.json({ template: WORKFLOW_SYSTEM_PROMPT });
});

router.get('/prompt-templates', (req, res) => {
  res.json(PromptTemplates.listPromptTemplates(req.query.projectId as string | undefined));
});

router.get('/prompt-templates/:id', (req, res) => {
  const tmpl = PromptTemplates.getPromptTemplate(req.params.id);
  if (!tmpl) return res.status(404).json({ error: 'Template not found' });
  res.json(tmpl);
});

const createSchema = z.object({
  project_id: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  template: z.string().min(1),
  variables: z.array(z.object({ name: z.string(), type: z.string(), default: z.string().optional() })).optional(),
});

router.post('/prompt-templates/deactivate-all', (_req, res) => {
  PromptTemplates.deactivateAll();
  res.json({ ok: true });
});

router.post('/prompt-templates', (req, res) => {
  res.status(201).json(PromptTemplates.createPromptTemplate(createSchema.parse(req.body)));
});

router.put('/prompt-templates/:id', (req, res) => {
  const data = z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    template: z.string().optional(),
    variables: z.array(z.object({ name: z.string(), type: z.string(), default: z.string().optional() })).optional(),
  }).parse(req.body);
  const tmpl = PromptTemplates.updatePromptTemplate(req.params.id, data);
  if (!tmpl) return res.status(404).json({ error: 'Template not found' });
  res.json(tmpl);
});

router.delete('/prompt-templates/:id', (req, res) => {
  if (!PromptTemplates.deletePromptTemplate(req.params.id)) return res.status(404).json({ error: 'Template not found' });
  res.json({ ok: true });
});

router.post('/prompt-templates/:id/activate', (req, res) => {
  const tmpl = PromptTemplates.activatePromptTemplate(req.params.id);
  if (!tmpl) return res.status(404).json({ error: 'Template not found' });
  res.json(tmpl);
});

export default router;
