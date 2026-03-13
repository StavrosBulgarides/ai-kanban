import { query, type Options, type SDKAssistantMessage } from '@anthropic-ai/claude-agent-sdk';
import { Codex, type CodexOptions, type ThreadOptions } from '@openai/codex-sdk';
import { log } from '../services/eventLog.js';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  model: string;
  sessionId?: string;
  writtenFiles?: string[];
}

export async function callAI(messages: AIMessage[], allowedTools?: string[]): Promise<AIResponse> {
  const provider = process.env.AI_PROVIDER || 'claude-cli';

  if (provider === 'claude-cli') {
    return callClaudeSDK(messages, allowedTools);
  } else if (provider === 'codex') {
    return callCodexSDK(messages);
  } else if (provider === 'anthropic') {
    const apiKey = process.env.AI_API_KEY;
    if (!apiKey) throw new Error('AI_API_KEY not configured');
    return callAnthropic(messages, apiKey);
  } else if (provider === 'openai') {
    const apiKey = process.env.AI_API_KEY;
    if (!apiKey) throw new Error('AI_API_KEY not configured');
    return callOpenAI(messages, apiKey);
  }
  throw new Error(`Unknown AI provider: ${provider}. Use 'claude-cli', 'codex', 'anthropic', or 'openai'.`);
}

async function callClaudeSDK(messages: AIMessage[], allowedTools?: string[]): Promise<AIResponse> {
  const systemParts = messages.filter(m => m.role === 'system').map(m => m.content);
  const userParts = messages.filter(m => m.role === 'user').map(m => m.content);

  const systemPrompt = systemParts.join('\n\n');
  const userPrompt = userParts.join('\n\n');

  const maxTurns = parseInt(process.env.AI_MAX_TURNS || '25', 10);
  const model = process.env.AI_MODEL || undefined;

  const defaultTools = ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep', 'WebSearch', 'WebFetch'];

  const options: Options = {
    systemPrompt,
    maxTurns,
    allowedTools: (allowedTools || defaultTools) as Options['allowedTools'],
  };

  if (model) {
    options.model = model;
  }

  log('info', 'claude-sdk', `Starting query (maxTurns: ${maxTurns}, model: ${model || 'default'})`, `Prompt: ${userPrompt.slice(0, 200)}...`);

  const conversation = query({ prompt: userPrompt, options });

  // Collect all messages from the async generator
  const allMessages: SDKAssistantMessage[] = [];
  let sessionId: string | undefined;
  try {
    for await (const message of conversation) {
      if (message.type === 'assistant') {
        const assistantMsg = message as SDKAssistantMessage;
        allMessages.push(assistantMsg);
        if (!sessionId && assistantMsg.session_id) {
          sessionId = assistantMsg.session_id;
        }
      }
    }
  } catch (e: any) {
    log('error', 'claude-sdk', `Query stream error: ${e.message}`, e.stack);
    throw e;
  }

  log('info', 'claude-sdk', `Received ${allMessages.length} assistant message(s), session: ${sessionId || 'unknown'}`);

  // Extract written file paths from Write tool_use blocks across all messages
  const writtenFiles = new Set<string>();
  for (const msg of allMessages) {
    for (const block of msg.message.content) {
      if (block.type === 'tool_use') {
        const toolBlock = block as { type: 'tool_use'; name: string; input: Record<string, unknown> };
        if (toolBlock.name === 'Write' && typeof toolBlock.input?.file_path === 'string') {
          writtenFiles.add(toolBlock.input.file_path);
        }
      }
    }
  }

  // Extract text content from the last assistant message
  const lastMessage = allMessages[allMessages.length - 1];
  let content = '';
  if (lastMessage) {
    for (const block of lastMessage.message.content) {
      if (block.type === 'text' && 'text' in block) {
        content += (content ? '\n' : '') + (block as { type: 'text'; text: string }).text;
      }
    }
  }

  return {
    content: content.trim(),
    model: model || 'claude-agent-sdk',
    sessionId,
    writtenFiles: writtenFiles.size > 0 ? [...writtenFiles] : undefined,
  };
}

async function callCodexSDK(messages: AIMessage[]): Promise<AIResponse> {
  const systemParts = messages.filter(m => m.role === 'system').map(m => m.content);
  const userParts = messages.filter(m => m.role === 'user').map(m => m.content);

  const systemPrompt = systemParts.join('\n\n');
  const userPrompt = userParts.join('\n\n');

  // Combine system + user into a single prompt since Codex SDK uses a single input string
  const fullPrompt = systemPrompt
    ? `${systemPrompt}\n\n---\n\n${userPrompt}`
    : userPrompt;

  const model = process.env.AI_MODEL || undefined;

  // Build Codex client options
  const codexOptions: CodexOptions = {};

  // If an API key is set, use it (direct API mode); otherwise rely on SSO auth via `codex login`
  if (process.env.AI_API_KEY) {
    codexOptions.apiKey = process.env.AI_API_KEY;
  }
  if (process.env.AI_BASE_URL) {
    codexOptions.baseUrl = process.env.AI_BASE_URL;
  }

  const codex = new Codex(codexOptions);

  const threadOptions: ThreadOptions = {
    sandboxMode: 'workspace-write',
    approvalPolicy: 'on-failure',
    skipGitRepoCheck: true,
  };

  if (model) {
    threadOptions.model = model;
  }

  const thread = codex.startThread(threadOptions);
  const result = await thread.run(fullPrompt);

  return {
    content: result.finalResponse.trim(),
    model: model || 'codex',
  };
}

async function callAnthropic(messages: AIMessage[], apiKey: string): Promise<AIResponse> {
  const model = process.env.AI_MODEL || 'claude-sonnet-4-20250514';
  const baseUrl = process.env.AI_BASE_URL || 'https://api.anthropic.com';

  const system = messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
  const chatMessages = messages.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content }));

  const res = await fetch(`${baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: system || undefined,
      messages: chatMessages,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${text}`);
  }

  const data = await res.json() as any;
  return {
    content: data.content?.[0]?.text || '',
    model: data.model || model,
  };
}

async function callOpenAI(messages: AIMessage[], apiKey: string): Promise<AIResponse> {
  const model = process.env.AI_MODEL || 'gpt-4o';
  const baseUrl = process.env.AI_BASE_URL || 'https://api.openai.com';

  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, max_tokens: 4096 }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${text}`);
  }

  const data = await res.json() as any;
  return {
    content: data.choices?.[0]?.message?.content || '',
    model: data.model || model,
  };
}
