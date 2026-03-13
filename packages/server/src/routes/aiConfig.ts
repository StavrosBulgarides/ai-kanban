import { Router } from 'express';
import { query } from '@anthropic-ai/claude-agent-sdk';
import fs from 'fs';
import path from 'path';
import os from 'os';

const router = Router();

/** Cached account info to avoid spawning SDK on every request */
let cachedAccount: {
  email?: string;
  organization?: string;
  subscriptionType?: string;
  authMethod?: string;
} | null = null;

/**
 * Read Codex auth info from ~/.codex/auth.json (written by `codex login`).
 */
function readCodexAuth(): {
  email?: string;
  organization?: string;
  subscriptionType?: string;
  authMethod?: string;
} | null {
  try {
    const authPath = path.join(os.homedir(), '.codex', 'auth.json');
    const raw = fs.readFileSync(authPath, 'utf-8');
    const auth = JSON.parse(raw);
    // auth.json may contain: account_id, email, org, plan, auth_method, etc.
    return {
      email: auth.email || auth.account_email || undefined,
      organization: auth.org || auth.organization || auth.workspace_name || undefined,
      subscriptionType: auth.plan || auth.subscription_type || (auth.auth_method === 'chatgpt' ? 'ChatGPT Enterprise' : undefined),
      authMethod: auth.auth_method || (auth.api_key ? 'api_key' : 'sso'),
    };
  } catch {
    return null;
  }
}

/**
 * GET /ai-config
 * Returns current AI configuration and subscription details.
 */
router.get('/ai-config', async (_req, res, next) => {
  try {
    const config = {
      provider: process.env.AI_PROVIDER || 'claude-cli',
      model: process.env.AI_MODEL || '',
      maxTurns: parseInt(process.env.AI_MAX_TURNS || '25', 10),
      apiKeySet: !!process.env.AI_API_KEY,
      baseUrl: process.env.AI_BASE_URL || '',
    };

    let account = cachedAccount;

    if (!account) {
      if (config.provider === 'claude-cli') {
        try {
          const conversation = query({ prompt: 'hi', options: { maxTurns: 0 } });
          const info = await conversation.accountInfo();
          account = { ...info, authMethod: 'claude.ai' };
          cachedAccount = account;
          conversation.close();
        } catch {
          account = null;
        }
      } else if (config.provider === 'codex') {
        account = readCodexAuth();
        cachedAccount = account;
      }
    }

    res.json({ config, account: account || null });
  } catch (e) {
    next(e);
  }
});

/**
 * PUT /ai-config
 * Updates AI configuration by writing to .env file.
 */
router.put('/ai-config', async (req, res, next) => {
  try {
    const { provider, model, maxTurns, apiKey, baseUrl } = req.body;

    const envPath = path.resolve(process.cwd(), '.env');
    let envContent = '';
    try {
      envContent = fs.readFileSync(envPath, 'utf-8');
    } catch {
      // .env might not exist yet
    }

    const updates: Record<string, string> = {};
    if (provider !== undefined) updates['AI_PROVIDER'] = provider;
    if (model !== undefined) updates['AI_MODEL'] = model;
    if (maxTurns !== undefined) updates['AI_MAX_TURNS'] = String(maxTurns);
    if (apiKey !== undefined) updates['AI_API_KEY'] = apiKey;
    if (baseUrl !== undefined) updates['AI_BASE_URL'] = baseUrl;

    // Apply updates to env content and to process.env
    for (const [key, value] of Object.entries(updates)) {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (value === '') {
        // Remove the line if value is empty
        envContent = envContent.replace(regex, '').replace(/\n{3,}/g, '\n\n');
        delete process.env[key];
      } else if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}=${value}`);
        process.env[key] = value;
      } else {
        envContent = envContent.trimEnd() + `\n${key}=${value}\n`;
        process.env[key] = value;
      }
    }

    fs.writeFileSync(envPath, envContent);

    // Clear cached account info if provider changed
    if (updates['AI_PROVIDER']) {
      cachedAccount = null;
    }

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /ai-config/refresh-account
 * Forces a refresh of the cached account info.
 */
router.post('/ai-config/refresh-account', async (_req, res, next) => {
  try {
    cachedAccount = null;
    const provider = process.env.AI_PROVIDER || 'claude-cli';

    if (provider === 'claude-cli') {
      try {
        const conversation = query({ prompt: 'hi', options: { maxTurns: 0 } });
        const info = await conversation.accountInfo();
        cachedAccount = { ...info, authMethod: 'claude.ai' };
        conversation.close();
      } catch {
        // SDK not authenticated
      }
    } else if (provider === 'codex') {
      cachedAccount = readCodexAuth();
    }

    res.json({ account: cachedAccount || null });
  } catch (e) {
    next(e);
  }
});

export default router;
