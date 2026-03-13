import { Router } from 'express';
import { z } from 'zod';
import * as Projects from '../db/models/projects.js';
import { getDb } from '../db/connection.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json(Projects.listProjects());
});

// Returns per-project indicators — must be before /:id to avoid wildcard match
router.get('/indicators', (_req, res) => {
  const rows = getDb().prepare(`
    SELECT
      p.id AS project_id,
      MAX(CASE WHEN s.name = 'Input Required' AND wi.id IS NOT NULL THEN 1 ELSE 0 END) AS has_input_required,
      CASE WHEN COUNT(wi.id) > 0 AND COUNT(wi.id) = SUM(CASE WHEN s.name = 'Done' THEN 1 ELSE 0 END) THEN 1 ELSE 0 END AS all_done
    FROM projects p
    LEFT JOIN statuses s ON s.project_id = p.id
    LEFT JOIN work_items wi ON wi.status_id = s.id
    GROUP BY p.id
  `).all() as Array<{ project_id: string; has_input_required: number; all_done: number }>;

  const indicators: Record<string, { hasInputRequired: boolean; allDone: boolean }> = {};
  for (const row of rows) {
    indicators[row.project_id] = {
      hasInputRequired: row.has_input_required === 1,
      allDone: row.all_done === 1,
    };
  }
  res.json(indicators);
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
