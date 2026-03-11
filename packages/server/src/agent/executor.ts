import { getSkill } from '../db/models/skills.js';
import { getWorkItem } from '../db/models/workItems.js';
import { getWorkItemTags } from '../db/models/tags.js';
import { listFileReferences } from '../db/models/fileReferences.js';
import { getIntegrationDecrypted } from '../db/models/integrations.js';
import { createAgentRun, completeAgentRun, AgentRun } from '../db/models/agentRuns.js';
import { getAdapter, buildConfig } from '../integrations/registry.js';
import { resolveTemplate, buildWorkItemContext, buildIntegrationContext } from './prompts.js';
import { callAI, AIMessage } from './providers.js';
import { getStatus } from '../db/models/statuses.js';

export interface ExecuteSkillOptions {
  skillId: string;
  workItemId?: string;
  variables?: Record<string, string>;
  additionalPrompt?: string;
}

export interface RunAdHocOptions {
  prompt: string;
  workItemId?: string;
  integrationIds?: string[];
}

export async function executeSkill(options: ExecuteSkillOptions): Promise<AgentRun> {
  const skill = getSkill(options.skillId);
  if (!skill) throw new Error('Skill not found');

  // Gather work item context
  let workItemContext = '';
  if (options.workItemId) {
    const wi = getWorkItem(options.workItemId);
    if (wi) {
      const tags = getWorkItemTags(wi.id).map(t => t.name);
      const fileRefs = listFileReferences(wi.id);
      const status = getStatus(wi.status_id);
      workItemContext = buildWorkItemContext({
        title: wi.title,
        description: wi.description,
        priority: wi.priority,
        status_name: status?.name,
        tags,
        file_refs: fileRefs.map(f => ({ path: f.path, ref_type: f.ref_type, label: f.label })),
      });
    }
  }

  // Fetch data from integrations
  const integrationData: Array<{ source: string; data: any }> = [];
  const integrationIds: string[] = JSON.parse(skill.integration_ids || '[]');
  const skillConfig = JSON.parse(skill.config || '{}');

  for (const intId of integrationIds) {
    const integration = getIntegrationDecrypted(intId);
    if (!integration) continue;
    const adapter = getAdapter(integration.type);
    if (!adapter) continue;

    const config = buildConfig(integration);
    try {
      if (skillConfig.integration_queries?.[intId]) {
        const query = resolveTemplate(skillConfig.integration_queries[intId], options.variables || {});
        const items = await adapter.searchItems(config, query);
        integrationData.push({ source: `${integration.name} (${integration.type})`, data: items });
      } else if (skillConfig.integration_item_ids?.[intId]) {
        const itemId = resolveTemplate(skillConfig.integration_item_ids[intId], options.variables || {});
        const item = await adapter.fetchItem(config, itemId);
        integrationData.push({ source: `${integration.name} (${integration.type})`, data: item });
      }
    } catch (e: any) {
      integrationData.push({ source: `${integration.name} (error)`, data: e.message });
    }
  }

  // Build the prompt
  const vars = {
    ...options.variables,
    work_item_context: workItemContext,
    integration_context: buildIntegrationContext(integrationData),
  };
  const resolvedPrompt = resolveTemplate(skill.prompt_template, vars);

  const fullPrompt = [workItemContext, buildIntegrationContext(integrationData), '\n## Task\n' + resolvedPrompt].filter(Boolean).join('\n\n');

  // Create the run record
  const run = createAgentRun({
    work_item_id: options.workItemId,
    skill_id: skill.id,
    prompt: fullPrompt,
  });

  // Call AI
  try {
    const messages: AIMessage[] = [
      { role: 'system', content: 'You are a helpful product management AI assistant. Analyze the provided context and complete the requested task thoroughly.' },
      { role: 'user', content: fullPrompt + (options.additionalPrompt ? `\n\n${options.additionalPrompt}` : '') },
    ];

    const response = await callAI(messages);

    // Handle write-back if skill config specifies it
    if (skillConfig.write_back) {
      await handleWriteBack(skillConfig.write_back, integrationIds, response.content, options.variables || {});
    }

    return completeAgentRun(run.id, response.content, 'completed')!;
  } catch (e: any) {
    return completeAgentRun(run.id, `Error: ${e.message}`, 'failed')!;
  }
}

export async function runAdHoc(options: RunAdHocOptions): Promise<AgentRun> {
  let workItemContext = '';
  if (options.workItemId) {
    const wi = getWorkItem(options.workItemId);
    if (wi) {
      const tags = getWorkItemTags(wi.id).map(t => t.name);
      const fileRefs = listFileReferences(wi.id);
      const status = getStatus(wi.status_id);
      workItemContext = buildWorkItemContext({
        title: wi.title, description: wi.description, priority: wi.priority,
        status_name: status?.name, tags,
        file_refs: fileRefs.map(f => ({ path: f.path, ref_type: f.ref_type, label: f.label })),
      });
    }
  }

  // Fetch integration data
  const integrationData: Array<{ source: string; data: any }> = [];
  for (const intId of (options.integrationIds || [])) {
    const integration = getIntegrationDecrypted(intId);
    if (!integration) continue;
    const adapter = getAdapter(integration.type);
    if (!adapter) continue;
    try {
      const config = buildConfig(integration);
      const result = await adapter.testConnection(config);
      integrationData.push({ source: integration.name, data: `Connected: ${result.message}` });
    } catch (e: any) {
      integrationData.push({ source: integration.name, data: `Error: ${e.message}` });
    }
  }

  const fullPrompt = [workItemContext, buildIntegrationContext(integrationData), options.prompt].filter(Boolean).join('\n\n');

  const run = createAgentRun({ work_item_id: options.workItemId, prompt: fullPrompt });

  try {
    const messages: AIMessage[] = [
      { role: 'system', content: 'You are a helpful product management AI assistant.' },
      { role: 'user', content: fullPrompt },
    ];
    const response = await callAI(messages);
    return completeAgentRun(run.id, response.content, 'completed')!;
  } catch (e: any) {
    return completeAgentRun(run.id, `Error: ${e.message}`, 'failed')!;
  }
}

async function handleWriteBack(
  writeBackConfig: { integration_id: string; action: string; item_id?: string },
  integrationIds: string[],
  agentOutput: string,
  variables: Record<string, string>
): Promise<void> {
  const integration = getIntegrationDecrypted(writeBackConfig.integration_id);
  if (!integration || integration.can_write !== 1) return;

  const adapter = getAdapter(integration.type);
  if (!adapter) return;

  const config = buildConfig(integration);

  if (writeBackConfig.action === 'comment' && adapter.addComment && writeBackConfig.item_id) {
    const itemId = resolveTemplate(writeBackConfig.item_id, variables);
    await adapter.addComment(config, itemId, agentOutput);
  } else if (writeBackConfig.action === 'update' && adapter.updateItem && writeBackConfig.item_id) {
    const itemId = resolveTemplate(writeBackConfig.item_id, variables);
    await adapter.updateItem(config, itemId, { description: agentOutput });
  } else if (writeBackConfig.action === 'create' && adapter.createItem) {
    await adapter.createItem(config, { title: `AI Generated: ${new Date().toISOString()}`, description: agentOutput });
  }
}
