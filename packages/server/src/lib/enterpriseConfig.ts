const DEFAULT_DEV_KEY = 'default-dev-key-change-in-prod!!';
const DEFAULT_DEV_SALT = 'ai-kanban-salt';

const ALL_TOOLS = ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep', 'WebSearch', 'WebFetch'] as const;
export type ToolName = (typeof ALL_TOOLS)[number];

export interface EnterpriseConfig {
  enterpriseMode: boolean;
  encryptionKey: string;
  encryptionSalt: string;
  allowedOrigins: string[];
  defaultToolPermissions: Record<ToolName, boolean>;
  allowFileOpen: boolean;
}

export function isEnterprise(): boolean {
  return process.env.ENTERPRISE_MODE === 'true';
}

export function getConfig(): EnterpriseConfig {
  const enterprise = isEnterprise();
  const port = parseInt(process.env.PORT || '3001', 10);

  // Parse tool permissions from env: comma-separated list of enabled tools
  let defaultToolPermissions: Record<ToolName, boolean>;
  if (process.env.DEFAULT_TOOL_PERMISSIONS) {
    const enabled = process.env.DEFAULT_TOOL_PERMISSIONS.split(',').map(s => s.trim());
    defaultToolPermissions = {} as Record<ToolName, boolean>;
    for (const tool of ALL_TOOLS) {
      defaultToolPermissions[tool] = enabled.includes(tool);
    }
  } else if (enterprise) {
    defaultToolPermissions = {
      Read: true, Glob: true, Grep: true,
      Write: false, Edit: false, Bash: false, WebSearch: false, WebFetch: false,
    };
  } else {
    defaultToolPermissions = {} as Record<ToolName, boolean>;
    for (const tool of ALL_TOOLS) {
      defaultToolPermissions[tool] = true;
    }
  }

  // Parse allowed origins
  const extraOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
    : [];
  const allowedOrigins = enterprise
    ? [`http://localhost:${port}`, `http://127.0.0.1:${port}`, ...extraOrigins]
    : [];

  return {
    enterpriseMode: enterprise,
    encryptionKey: process.env.ENCRYPTION_KEY || DEFAULT_DEV_KEY,
    encryptionSalt: process.env.ENCRYPTION_SALT || DEFAULT_DEV_SALT,
    allowedOrigins,
    defaultToolPermissions,
    allowFileOpen: process.env.ALLOW_FILE_OPEN === 'true',
  };
}

export function validateStartup(): void {
  const config = getConfig();

  if (config.enterpriseMode) {
    if (config.encryptionKey === DEFAULT_DEV_KEY) {
      console.error('[FATAL] Enterprise mode requires a real ENCRYPTION_KEY. Set ENCRYPTION_KEY env var and restart.');
      process.exit(1);
    }
    console.log('[INFO] Enterprise mode ACTIVE');
  } else {
    if (config.encryptionKey === DEFAULT_DEV_KEY) {
      console.warn('[WARN] Using default encryption key. Set ENCRYPTION_KEY for production use.');
    }
  }
}

export { ALL_TOOLS, DEFAULT_DEV_KEY, DEFAULT_DEV_SALT };
