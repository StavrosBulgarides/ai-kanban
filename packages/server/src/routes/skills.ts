import { Router } from 'express';
import { z } from 'zod';
import * as Skills from '../db/models/skills.js';
import { executeSkill } from '../agent/executor.js';

const router = Router();

router.get('/skills', (req, res) => {
  const filters: { projectId?: string; workItemId?: string } = {};
  if (req.query.projectId) filters.projectId = req.query.projectId as string;
  if (req.query.workItemId) filters.workItemId = req.query.workItemId as string;
  res.json(Skills.listSkills(filters));
});

router.get('/skills/:id', (req, res) => {
  const skill = Skills.getSkill(req.params.id);
  if (!skill) return res.status(404).json({ error: 'Skill not found' });
  res.json(skill);
});

const createSchema = z.object({
  project_id: z.string().optional(),
  work_item_id: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  prompt_template: z.string().min(1),
  integration_ids: z.array(z.string()).optional(),
  config: z.record(z.unknown()).optional(),
});

router.post('/skills', (req, res) => {
  const data = createSchema.parse(req.body);
  res.status(201).json(Skills.createSkill(data));
});

router.put('/skills/:id', (req, res) => {
  const data = z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    prompt_template: z.string().optional(),
    integration_ids: z.array(z.string()).optional(),
    config: z.record(z.unknown()).optional(),
  }).parse(req.body);
  const skill = Skills.updateSkill(req.params.id, data);
  if (!skill) return res.status(404).json({ error: 'Skill not found' });
  res.json(skill);
});

router.delete('/skills/:id', (req, res) => {
  if (!Skills.deleteSkill(req.params.id)) return res.status(404).json({ error: 'Skill not found' });
  res.json({ ok: true });
});

router.post('/skills/:id/execute', async (req, res) => {
  const { work_item_id, variables, additional_prompt } = req.body || {};
  try {
    const result = await executeSkill({
      skillId: req.params.id,
      workItemId: work_item_id,
      variables,
      additionalPrompt: additional_prompt,
    });
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
