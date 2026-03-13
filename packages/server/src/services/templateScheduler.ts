import cron from 'node-cron';
import { getScheduledTemplates, markTriggered } from '../db/models/workItemTemplates.js';
import { createWorkItem } from '../db/models/workItems.js';
import { addTagToWorkItem } from '../db/models/tags.js';

const scheduledJobs = new Map<string, cron.ScheduledTask>();

export function initScheduler(): void {
  refreshSchedules();
}

export function refreshSchedules(): void {
  // Stop all existing jobs
  for (const [id, job] of scheduledJobs) {
    job.stop();
  }
  scheduledJobs.clear();

  // Load and schedule active templates
  const templates = getScheduledTemplates();
  for (const tmpl of templates) {
    if (!tmpl.schedule_cron || !cron.validate(tmpl.schedule_cron)) continue;

    const job = cron.schedule(tmpl.schedule_cron, () => {
      try {
        triggerTemplate(tmpl.id);
      } catch (e) {
        console.error(`Failed to trigger template ${tmpl.id}:`, e);
      }
    });

    scheduledJobs.set(tmpl.id, job);
    console.log(`Scheduled template "${tmpl.name}" with cron: ${tmpl.schedule_cron}`);
  }
}

function triggerTemplate(templateId: string): void {
  const { getWorkItemTemplate } = require('../db/models/workItemTemplates.js');
  const tmpl = getWorkItemTemplate(templateId);
  if (!tmpl) return;

  const data = JSON.parse(tmpl.template_data || '{}');
  if (!tmpl.project_id || !tmpl.target_status_id) return;

  const workItem = createWorkItem(tmpl.project_id, {
    status_id: tmpl.target_status_id,
    title: data.title || tmpl.name,
    description: data.description || '',
  });

  // Apply tags
  if (Array.isArray(data.tag_ids)) {
    for (const tagId of data.tag_ids) {
      addTagToWorkItem(workItem.id, tagId);
    }
  }

  markTriggered(templateId);
  console.log(`Template "${tmpl.name}" triggered, created work item: ${workItem.id}`);
}

export function stopScheduler(): void {
  for (const [, job] of scheduledJobs) {
    job.stop();
  }
  scheduledJobs.clear();
}
