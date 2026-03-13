import { Router } from 'express';
import { z } from 'zod';
import * as Templates from '../db/models/workItemTemplates.js';
import { createWorkItem } from '../db/models/workItems.js';
import { addTagToWorkItem } from '../db/models/tags.js';
import { refreshSchedules } from '../services/templateScheduler.js';

const router = Router();

router.get('/templates', (req, res) => {
  res.json(Templates.listWorkItemTemplates(req.query.projectId as string | undefined));
});

router.get('/templates/:id', (req, res) => {
  const tmpl = Templates.getWorkItemTemplate(req.params.id);
  if (!tmpl) return res.status(404).json({ error: 'Template not found' });
  res.json(tmpl);
});

const createSchema = z.object({
  project_id: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  template_data: z.record(z.unknown()),
  schedule_cron: z.string().optional(),
  schedule_enabled: z.boolean().optional(),
  target_status_id: z.string().optional(),
});

router.post('/templates', (req, res) => {
  const data = createSchema.parse(req.body);
  const tmpl = Templates.createWorkItemTemplate(data);
  if (data.schedule_enabled && data.schedule_cron) refreshSchedules();
  res.status(201).json(tmpl);
});

router.put('/templates/:id', (req, res) => {
  const data = z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    template_data: z.record(z.unknown()).optional(),
    schedule_cron: z.string().nullable().optional(),
    schedule_enabled: z.boolean().optional(),
    target_status_id: z.string().nullable().optional(),
  }).parse(req.body);
  const tmpl = Templates.updateWorkItemTemplate(req.params.id, data);
  if (!tmpl) return res.status(404).json({ error: 'Template not found' });
  refreshSchedules();
  res.json(tmpl);
});

router.delete('/templates/:id', (req, res) => {
  if (!Templates.deleteWorkItemTemplate(req.params.id)) return res.status(404).json({ error: 'Template not found' });
  refreshSchedules();
  res.json({ ok: true });
});

// Manually trigger a template to create a work item
router.post('/templates/:id/trigger', (req, res) => {
  const tmpl = Templates.getWorkItemTemplate(req.params.id);
  if (!tmpl) return res.status(404).json({ error: 'Template not found' });
  if (!tmpl.project_id || !tmpl.target_status_id) return res.status(400).json({ error: 'Template must have project_id and target_status_id' });

  const data = JSON.parse(tmpl.template_data || '{}');
  const workItem = createWorkItem(tmpl.project_id, {
    status_id: tmpl.target_status_id,
    title: data.title || tmpl.name,
    description: data.description || '',
  });

  if (Array.isArray(data.tag_ids)) {
    for (const tagId of data.tag_ids) {
      addTagToWorkItem(workItem.id, tagId);
    }
  }

  Templates.markTriggered(req.params.id);
  res.status(201).json(workItem);
});

// Save current work item as a template
router.post('/work-items/:id/save-as-template', (req, res) => {
  const { name, schedule_cron, schedule_enabled, target_status_id } = z.object({
    name: z.string().min(1),
    schedule_cron: z.string().optional(),
    schedule_enabled: z.boolean().optional(),
    target_status_id: z.string().optional(),
  }).parse(req.body);

  // Fetch the work item data
  const { getWorkItem } = require('../db/models/workItems.js');
  const { getWorkItemTags } = require('../db/models/tags.js');

  const workItem = getWorkItem(req.params.id);
  if (!workItem) return res.status(404).json({ error: 'Work item not found' });

  const tags = getWorkItemTags(req.params.id);

  const templateData = {
    title: workItem.title,
    description: workItem.description,
    tag_ids: tags.map((t: any) => t.id),
  };

  const tmpl = Templates.createWorkItemTemplate({
    project_id: workItem.project_id,
    name,
    description: `Template from: ${workItem.title}`,
    template_data: templateData,
    schedule_cron,
    schedule_enabled,
    target_status_id: target_status_id || workItem.status_id,
  });

  if (schedule_enabled && schedule_cron) refreshSchedules();
  res.status(201).json(tmpl);
});

export default router;
