import { Router } from 'express';
import { z } from 'zod';
import { listMessages, createMessage } from '../db/models/clarificationMessages.js';
import { getWorkItem } from '../db/models/workItems.js';
import { getStatus } from '../db/models/statuses.js';
import { getWorkItemTags } from '../db/models/tags.js';
import { listFileReferences } from '../db/models/fileReferences.js';
import { listAgentRuns } from '../db/models/agentRuns.js';
import { callAI, AIMessage } from '../agent/providers.js';

const router = Router();

router.get('/work-items/:id/clarifications', (req, res) => {
  res.json(listMessages(req.params.id));
});

router.post('/work-items/:id/clarifications', async (req, res) => {
  const { id } = req.params;
  const { content } = z.object({ content: z.string().min(1) }).parse(req.body);

  const wi = getWorkItem(id);
  if (!wi) return res.status(404).json({ error: 'Work item not found' });

  // Store user message
  createMessage({ work_item_id: id, role: 'user', content });

  // Build context
  const status = getStatus(wi.status_id);
  const tags = getWorkItemTags(id).map(t => t.name);
  const fileRefs = listFileReferences(id);
  const allMessages = listMessages(id);

  // Include previous agent run results for post-completion context
  const runs = listAgentRuns(id);
  const completedRuns = runs.filter(r => r.status === 'completed');
  const lastRun = completedRuns[0]; // Most recent (ordered DESC)

  const workItemSummary = [
    `Title: ${wi.title}`,
    `Description: ${wi.description || '(none)'}`,
    `Status: ${status?.name || 'unknown'}`,
    tags.length ? `Tags: ${tags.join(', ')}` : null,
    fileRefs.length ? `Files: ${fileRefs.map(f => `${f.path} (${f.ref_type}${f.label ? `, ${f.label}` : ''})`).join(', ')}` : null,
  ].filter(Boolean).join('\n');

  const previousRunContext = lastRun
    ? `\n\n## Previous Agent Run (${lastRun.status})\nPrompt: ${lastRun.prompt.slice(0, 500)}${lastRun.prompt.length > 500 ? '...' : ''}\n\nResult:\n${lastRun.result?.slice(0, 2000) || '(no result)'}${(lastRun.result?.length || 0) > 2000 ? '...' : ''}`
    : '';

  const isPostCompletion = status?.name === 'Done' || lastRun != null;

  const systemPrompt = isPostCompletion
    ? `You are AlphaPM, an expert AI Product Manager. You are in a follow-up chat for a work item that has already been worked on.

## Work Item Context
${workItemSummary}
${previousRunContext}

## Instructions
The user is following up on a completed task. They may want to ask questions about the output, request modifications, or start a related task. You have full context of what was done, which documents and files were used, and the results produced.

When the user refers to "the same document", "that file", or similar, use the file references and previous run context above to identify what they mean.

When you have a clear understanding of what the user wants done next, briefly summarise and end your response with [READY] on its own line. This signals the follow-up is actionable.

If you genuinely need more information, ask one brief, focused question.

Be direct and concise. No waffle. No filler phrases. Professional but human.

Do NOT include any text after [READY].`
    : `You are AlphaPM, an expert AI Product Manager. You are in a clarification chat for a work item that needs more context before it can be worked on.

## Work Item Context
${workItemSummary}

## Instructions
The user has created a work item whose description is currently insufficient. This chat builds up the full task definition. The user's messages here add context and detail to the original description — together they become the task.

Be flexible and helpful. Tasks can be anything — answering questions, research, calculations, writing, analysis, code changes, or anything else. Do not assume tasks must be software-related or follow any particular format. If the user asks you something directly (a question, a calculation, etc.), engage with it naturally — this is likely the task itself.

When you have a clear understanding of what the user wants done, briefly summarise your understanding of the task and end your response with [READY] on its own line. This signals that the combined description and clarification form an actionable task. Err on the side of proceeding rather than over-questioning.

If you genuinely need more information, ask one brief, focused question.

Be direct and concise. No waffle. No filler phrases. Professional but human.

Do NOT include any text after [READY].`;

  const aiMessages: AIMessage[] = [
    { role: 'system', content: systemPrompt },
    ...allMessages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  ];

  try {
    const response = await callAI(aiMessages);
    const readyMatch = response.content.match(/\[READY\]\s*$/);
    const ready = !!readyMatch;
    const assistantContent = ready
      ? response.content.slice(0, readyMatch!.index).trim()
      : response.content.trim();

    createMessage({ work_item_id: id, role: 'assistant', content: assistantContent });

    const messages = listMessages(id);
    res.json({ messages, ready });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
