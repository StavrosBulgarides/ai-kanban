import { getSkill } from '../db/models/skills.js';
import { getWorkItem, updateWorkItem } from '../db/models/workItems.js';
import { getWorkItemTags } from '../db/models/tags.js';
import { listFileReferences, createFileReference } from '../db/models/fileReferences.js';
import { getIntegrationDecrypted } from '../db/models/integrations.js';
import { createAgentRun, completeAgentRun, AgentRun } from '../db/models/agentRuns.js';
import { listMessages, createMessage } from '../db/models/clarificationMessages.js';
import { getEffectiveDriveRoots } from '../db/models/projectDriveRoots.js';
import { listDriveRoots } from '../db/models/driveRoots.js';
import { getAdapter, buildConfig } from '../integrations/registry.js';
import { resolveTemplate, buildWorkItemContext, buildIntegrationContext } from './prompts.js';
import { callAI, AIMessage } from './providers.js';
import { getStatus, getStatusByName } from '../db/models/statuses.js';
import { log } from '../services/eventLog.js';
import { getConfig, ALL_TOOLS, type ToolName } from '../lib/enterpriseConfig.js';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { resolve } from 'path';

/**
 * Resolve the effective tool permissions for a given work item.
 * Merges global defaults with per-work-item overrides (if set).
 * Returns the list of tool names that are enabled.
 */
export function resolveToolPermissions(workItemId?: string): string[] {
  const config = getConfig();
  const defaults = { ...config.defaultToolPermissions };

  // Apply work-item-level overrides if present
  if (workItemId) {
    const wi = getWorkItem(workItemId);
    if (wi?.tool_permissions) {
      try {
        const overrides = JSON.parse(wi.tool_permissions) as Record<string, boolean>;
        for (const [tool, enabled] of Object.entries(overrides)) {
          if (tool in defaults) {
            defaults[tool as ToolName] = enabled;
          }
        }
      } catch {
        // Invalid JSON — ignore overrides, use defaults
      }
    }
  }

  return ALL_TOOLS.filter(tool => defaults[tool]);
}

/**
 * Generate a short title for a work item from the task description and agent output.
 * Uses a lightweight AI call to summarise.
 */
async function generateTitle(description: string, agentOutput: string): Promise<string> {
  try {
    const messages: AIMessage[] = [
      { role: 'system', content: 'You generate very short task titles (max 8 words). Respond with ONLY the title, nothing else. No quotes, no punctuation at the end.' },
      { role: 'user', content: `Summarise this task in a short phrase:\n\nTask: ${description.slice(0, 500)}\n\nOutput: ${agentOutput.slice(0, 500)}` },
    ];
    const response = await callAI(messages);
    // Take first line, trim, cap at 80 chars
    const title = response.content.split('\n')[0].trim().slice(0, 80);
    return title || 'Untitled task';
  } catch {
    return 'Untitled task';
  }
}

/**
 * Register files written by the agent as output file references on the work item.
 * Skips files that are already registered.
 */
function registerOutputFiles(workItemId: string, filePaths: string[]): void {
  const existing = listFileReferences(workItemId);
  const existingPaths = new Set(existing.map(f => f.path));

  for (const filePath of filePaths) {
    if (existingPaths.has(filePath)) continue;
    const fileName = filePath.split('/').pop() || filePath;
    createFileReference(workItemId, {
      path: filePath,
      label: fileName,
      ref_type: 'output',
    });
    log('info', 'agent', `Registered output file: ${filePath}`);
  }
}

/**
 * Extract file paths mentioned in the agent's result text that exist on disk.
 * Looks for paths in the TASK SUMMARY "Output delivered" line and backtick-quoted paths.
 */
function extractFilePathsFromText(text: string): string[] {
  const paths = new Set<string>();

  // Match file paths in backticks that look like absolute or home-relative paths
  const backtickPattern = /`(~?\/[^`\s]+\.[a-zA-Z0-9]+)`/g;
  let match;
  while ((match = backtickPattern.exec(text)) !== null) {
    paths.add(match[1]);
  }

  // Match **bold** paths (markdown)
  const boldPattern = /\*\*(?:~?\/[^*\s]+\.[a-zA-Z0-9]+)\*\*/g;
  while ((match = boldPattern.exec(text)) !== null) {
    const p = match[0].replace(/\*\*/g, '');
    paths.add(p);
  }

  // Resolve and validate paths
  const validPaths: string[] = [];
  for (const p of paths) {
    const resolved = p.startsWith('~') ? resolve(homedir(), p.slice(2)) : resolve(p);
    try {
      if (existsSync(resolved)) {
        validPaths.push(resolved);
      }
    } catch {
      // Ignore paths that can't be checked
    }
  }

  return validPaths;
}

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

/**
 * Parse the agent's response for a status directive.
 * The agent is instructed to end its response with one of:
 *   [DONE]
 *   [INPUT_REQUIRED] followed by the question
 * Returns the directive and the cleaned response content.
 */
function parseStatusDirective(response: string): {
  directive: 'done' | 'input_required' | null;
  content: string;
} {
  const doneMatch = response.match(/\[DONE\]\s*$/);
  if (doneMatch) {
    return {
      directive: 'done',
      content: response.slice(0, doneMatch.index).trim(),
    };
  }

  const inputMatch = response.match(/\[INPUT_REQUIRED\]\s*$/);
  if (inputMatch) {
    return {
      directive: 'input_required',
      content: response.slice(0, inputMatch.index).trim(),
    };
  }

  // No explicit directive — default to done
  return { directive: 'done', content: response.trim() };
}

/**
 * Transition a work item's status based on the agent's directive.
 */
function transitionWorkItem(workItemId: string, directive: 'done' | 'input_required' | null): void {
  const wi = getWorkItem(workItemId);
  if (!wi) return;

  const targetName = directive === 'input_required' ? 'Input Required' : 'Done';
  const targetStatus = getStatusByName(wi.project_id, targetName);
  if (!targetStatus) return;

  updateWorkItem(workItemId, { status_id: targetStatus.id, in_progress_since: null });
}

const WORKFLOW_SYSTEM_PROMPT = `You are AlphaPM, an expert AI Product Manager. You work from any data, documents, and sources made available to you. You have access to a set of skills that can be invoked to complete tasks. You do not invent data. You do not speculate where evidence is absent. You work from what you can see, cite what you use, and flag clearly when something is unknown or requires human judgement.

Tasks can be anything — answering questions, research, calculations, writing, analysis, code changes, or anything else. Do not assume tasks must be software-related or follow any particular format.

---

KANBAN INTERACTION MODEL

Your primary interface is a four-column Kanban board. Every task you handle moves through this board.

BACKLOG — "Ready to be picked up."
Tasks wait here until moved to In Progress. No action is needed from you on Backlog items.

IN PROGRESS — "The agent is actively working on this."
When a task enters In Progress, work systematically:
1. Confirm understanding — restate what you believe is being asked and what output you will produce.
2. Identify your sources and skills — state which data, documents, or skills you are drawing from.
3. Produce the output — deliver the work in full, structured appropriately for the task.
4. Cite your sources — every substantive claim references its source.
5. Surface risks or gaps — if the output is incomplete due to missing data, say so explicitly.

INPUT REQUIRED — "The agent needs human input before it can proceed."
Use this whenever you cannot proceed — whether the task description is too vague to begin, you need additional context, or you are blocked mid-task. The user will respond via a chat interface. You must:
- State exactly what information is missing
- State why it is blocking you
- Provide options where possible — if there are reasonable interpretations, present them and ask which to proceed with
Do not ask for information you can reasonably infer from context. Err on the side of proceeding rather than over-questioning.

DONE — "Output delivered. Task complete."
A task is Done when the requested output has been fully delivered, all sources have been cited, and any gaps or risks have been noted. When completing a task, append a brief summary:

TASK SUMMARY
Task: [one-line description]
Output delivered: [what was produced]
Sources and skills used: [list]
Gaps / caveats: [any limitations on the output]
Suggested follow-on: [optional — only if genuinely useful]

---

CORE PRINCIPLES

Evidence first. Every recommendation and report is grounded in source material. If you cannot point to evidence, say so explicitly.
Clarity over complexity. Precise, unambiguous, and direct. Every sentence earns its place.
Decisions, not just data. Interpret data and give a clear view. When the data points somewhere, say so. When genuinely ambiguous, name the ambiguity and what would resolve it.
Commercial awareness. Revenue, positioning, and customer impact are always in view where relevant.
Behave as a product manager. Think, prioritise, communicate, and make recommendations as a senior PM would. You have a point of view, you back it with evidence, and you engage with problems as an owner, not an observer.

---

TONE AND COMMUNICATION STYLE

Direct and confident. Not arrogant — but not hedging unnecessarily.
Concise. No waffle. If the answer is three sentences, write three sentences.
Professional but human. Plain, clear English. You can be wry when appropriate but you do not perform enthusiasm.
Structured when it helps. Use headers, bullet points, and tables when they aid clarity. Not as decoration.
First person where natural. "I'd recommend..." not "It is recommended that..."
No filler phrases. Never use "it's worth noting", "it's important to highlight", or "as we can see". If it matters, state it directly.

---

HANDLING UNCERTAINTY

If a source does not contain the answer: "I cannot confirm this from available sources."
If data is stale or potentially out of date, flag it explicitly with the data date.
If two sources conflict, surface the conflict and state which you are treating as authoritative and why.
If a question requires human judgement, say so clearly rather than manufacturing a recommendation.

---

STATUS PROTOCOL

When you finish your response, you MUST end with exactly one of these directives on its own line:

[DONE]
Use when the task is complete and the output has been delivered in full.

[INPUT_REQUIRED]
Use when you cannot proceed and need information from the user — whether the task description is too vague to start, you need additional documents or data, or you are blocked mid-task. State your question clearly before this marker. The user will respond via a chat interface.

Do NOT include any text after the status directive. It must be the very last thing in your response.`;

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
      const effectiveDrives = getEffectiveDriveRoots(wi.id, wi.project_id);
      const inputDrives = effectiveDrives.filter(d => d.purpose !== 'output');
      // Output drives: use effective drives with purpose 'output', or fall back to global output drives
      let outputDrives = effectiveDrives.filter(d => d.purpose === 'output');
      if (!outputDrives.length) {
        outputDrives = listDriveRoots('output');
      }
      workItemContext = buildWorkItemContext({
        title: wi.title,
        description: wi.description,
        status_name: status?.name,
        tags,
        file_refs: fileRefs.map(f => ({ path: f.path, ref_type: f.ref_type, label: f.label })),
        source_folders: inputDrives.map(d => ({ name: d.name, path: d.path })),
        output_folders: outputDrives.map(d => ({ name: d.name, path: d.path })),
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

  // Resolve tool permissions
  const allowedTools = resolveToolPermissions(options.workItemId);

  // Call AI
  try {
    const messages: AIMessage[] = [
      { role: 'system', content: WORKFLOW_SYSTEM_PROMPT },
      { role: 'user', content: fullPrompt + (options.additionalPrompt ? `\n\n${options.additionalPrompt}` : '') },
    ];

    const response = await callAI(messages, allowedTools);
    const { directive, content } = parseStatusDirective(response.content);

    // Transition the work item status
    if (options.workItemId) {
      transitionWorkItem(options.workItemId, directive);

      // Store agent question in chat when input is required
      if (directive === 'input_required') {
        createMessage({ work_item_id: options.workItemId, role: 'assistant', content });
      }

      // Generate title if the work item has no user-provided title
      const currentWi = getWorkItem(options.workItemId);
      if (currentWi && !currentWi.title.trim()) {
        const generatedTitle = await generateTitle(currentWi.description, content);
        updateWorkItem(options.workItemId, { title: generatedTitle });
        log('info', 'agent', `Generated title: "${generatedTitle}"`);
      }

      // Register any files written by the agent as output file references
      const allOutputFiles = [
        ...(response.writtenFiles || []),
        ...extractFilePathsFromText(content),
      ];
      if (allOutputFiles.length) {
        registerOutputFiles(options.workItemId, allOutputFiles);
      }
    }

    // Handle write-back if skill config specifies it
    if (skillConfig.write_back) {
      await handleWriteBack(skillConfig.write_back, integrationIds, content, options.variables || {});
    }

    return completeAgentRun(run.id, content, 'completed', response.sessionId)!;
  } catch (e: any) {
    return completeAgentRun(run.id, `Error: ${e.message}`, 'failed')!;
  }
}

export async function runAdHoc(options: RunAdHocOptions): Promise<AgentRun> {
  const provider = process.env.AI_PROVIDER || 'claude-cli';
  log('info', 'agent', `Starting ad-hoc run (provider: ${provider})`, options.workItemId ? `work_item: ${options.workItemId}` : undefined);

  let workItemContext = '';
  let previousRuns = '';
  if (options.workItemId) {
    const wi = getWorkItem(options.workItemId);
    if (wi) {
      log('info', 'agent', `Work item: "${wi.title}"`);
      const tags = getWorkItemTags(wi.id).map(t => t.name);
      const fileRefs = listFileReferences(wi.id);
      const status = getStatus(wi.status_id);
      const effectiveDrives = getEffectiveDriveRoots(wi.id, wi.project_id);
      const inputDrives = effectiveDrives.filter(d => d.purpose !== 'output');
      let outputDrives = effectiveDrives.filter(d => d.purpose === 'output');
      if (!outputDrives.length) {
        outputDrives = listDriveRoots('output');
      }
      workItemContext = buildWorkItemContext({
        title: wi.title, description: wi.description,
        status_name: status?.name, tags,
        file_refs: fileRefs.map(f => ({ path: f.path, ref_type: f.ref_type, label: f.label })),
        source_folders: inputDrives.map(d => ({ name: d.name, path: d.path })),
        output_folders: outputDrives.map(d => ({ name: d.name, path: d.path })),
      });

      // Include clarification history if any
      const clarifications = listMessages(wi.id);
      if (clarifications.length > 0) {
        const clarificationLog = clarifications.map(m =>
          `${m.role === 'assistant' ? 'Agent' : 'User'}: ${m.content}`
        ).join('\n');
        workItemContext += `\n\n## Clarification History\n${clarificationLog}`;
      }

      // Include recent agent run history for context continuity
      const { listAgentRuns } = await import('../db/models/agentRuns.js');
      const runs = listAgentRuns(wi.id);
      if (runs.length > 0) {
        const recentRuns = runs.slice(0, 5); // Last 5 runs
        const runSummaries = recentRuns.map((r, i) => {
          const label = r.status === 'completed' ? 'Completed' : r.status === 'failed' ? 'Failed' : 'Running';
          return `### Previous Run ${recentRuns.length - i} (${label}):\nPrompt: ${r.prompt.slice(0, 200)}...\n${r.result ? `Result: ${r.result.slice(0, 500)}...` : ''}`;
        }).reverse();
        previousRuns = '\n## Previous Agent Runs\n' + runSummaries.join('\n\n');
      }
    } else {
      log('warn', 'agent', `Work item not found: ${options.workItemId}`);
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

  const fullPrompt = [workItemContext, previousRuns, buildIntegrationContext(integrationData), options.prompt].filter(Boolean).join('\n\n');

  // Resolve tool permissions
  const allowedTools = resolveToolPermissions(options.workItemId);

  const run = createAgentRun({ work_item_id: options.workItemId, prompt: fullPrompt });
  log('info', 'agent', `Agent run created: ${run.id}`, `Prompt length: ${fullPrompt.length} chars, tools: ${allowedTools.join(',')}`);

  try {
    const messages: AIMessage[] = [
      { role: 'system', content: WORKFLOW_SYSTEM_PROMPT },
      { role: 'user', content: fullPrompt },
    ];
    log('info', 'agent', `Calling AI provider: ${provider}...`);
    const response = await callAI(messages, allowedTools);
    log('info', 'agent', `AI response received (${response.content.length} chars, model: ${response.model})`);
    const { directive, content } = parseStatusDirective(response.content);
    log('info', 'agent', `Status directive: ${directive || 'none (defaulting to done)'}`, content.slice(0, 200));

    // Transition the work item status
    if (options.workItemId) {
      transitionWorkItem(options.workItemId, directive);

      // Store agent question in chat when input is required
      if (directive === 'input_required') {
        createMessage({ work_item_id: options.workItemId, role: 'assistant', content });
      }

      // Generate title if the work item has no user-provided title
      const currentWi = getWorkItem(options.workItemId);
      if (currentWi && !currentWi.title.trim()) {
        const generatedTitle = await generateTitle(currentWi.description, content);
        updateWorkItem(options.workItemId, { title: generatedTitle });
        log('info', 'agent', `Generated title: "${generatedTitle}"`);
      }

      // Register any files written by the agent as output file references
      const allOutputFiles = [
        ...(response.writtenFiles || []),
        ...extractFilePathsFromText(content),
      ];
      if (allOutputFiles.length) {
        registerOutputFiles(options.workItemId, allOutputFiles);
      }

      const statusLabel = directive === 'input_required' ? 'Input Required' : 'Done';
      log('info', 'agent', `Work item transitioned to: ${statusLabel}`);
    }

    return completeAgentRun(run.id, content, 'completed', response.sessionId)!;
  } catch (e: any) {
    log('error', 'agent', `Agent run failed: ${e.message}`, e.stack);
    // On failure, move back to Input Required so user knows something went wrong
    if (options.workItemId) {
      transitionWorkItem(options.workItemId, 'input_required');
    }
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
