export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  model: string;
}

export async function callAI(messages: AIMessage[]): Promise<AIResponse> {
  const provider = process.env.AI_PROVIDER || 'anthropic';
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) throw new Error('AI_API_KEY not configured');

  if (provider === 'anthropic') {
    return callAnthropic(messages, apiKey);
  } else if (provider === 'openai') {
    return callOpenAI(messages, apiKey);
  }
  throw new Error(`Unknown AI provider: ${provider}`);
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
