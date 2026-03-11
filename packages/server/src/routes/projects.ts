import { Router } from 'express';
import { z } from 'zod';
import * as Projects from '../db/models/projects.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json(Projects.listProjects());
});

router.get('/:id', (req, res) => {
  const project = Projects.getProject(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.json(project);
});

const createSchema = z.object({ name: z.string().min(1), description: z.string().optional() });

router.post('/', (req, res) => {
  const data = createSchema.parse(req.body);
  res.status(201).json(Projects.createProject(data));
});

const updateSchema = z.object({ name: z.string().min(1).optional(), description: z.string().optional() });

router.put('/:id', (req, res) => {
  const data = updateSchema.parse(req.body);
  const project = Projects.updateProject(req.params.id, data);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.json(project);
});

router.delete('/:id', (req, res) => {
  if (!Projects.deleteProject(req.params.id)) return res.status(404).json({ error: 'Project not found' });
  res.json({ ok: true });
});

export default router;
