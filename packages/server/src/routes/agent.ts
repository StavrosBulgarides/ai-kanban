import { Router } from 'express';
import { z } from 'zod';
import * as AgentRuns from '../db/models/agentRuns.js';
import { runAdHoc } from '../agent/executor.js';

const router = Router();

router.post('/agent/run', async (req, res) => {
  const data = z.object({
    prompt: z.string().min(1),
    work_item_id: z.string().optional(),
    integration_ids: z.array(z.string()).optional(),
  }).parse(req.body);

  try {
    const result = await runAdHoc(data);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/agent/runs/:id', (req, res) => {
  const run = AgentRuns.getAgentRun(req.params.id);
  if (!run) return res.status(404).json({ error: 'Run not found' });
  res.json(run);
});

router.get('/work-items/:id/agent-runs', (req, res) => {
  res.json(AgentRuns.listAgentRuns(req.params.id));
});

export default router;
