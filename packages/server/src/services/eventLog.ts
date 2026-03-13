export interface LogEntry {
  id: number;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  source: string;
  message: string;
  detail?: string;
}

const MAX_ENTRIES = 100;
const entries: LogEntry[] = [];
let nextId = 1;

export function log(level: LogEntry['level'], source: string, message: string, detail?: string): void {
  const entry: LogEntry = {
    id: nextId++,
    timestamp: new Date().toISOString(),
    level,
    source,
    message,
    detail: detail?.slice(0, 2000), // cap detail length
  };
  entries.push(entry);
  if (entries.length > MAX_ENTRIES) {
    entries.shift();
  }

  // Also log to console for server-side visibility
  const prefix = `[${entry.level.toUpperCase()}] [${source}]`;
  if (level === 'error') {
    console.error(prefix, message, detail ? `\n${detail}` : '');
  } else if (level === 'warn') {
    console.warn(prefix, message, detail ? `\n${detail}` : '');
  } else {
    console.log(prefix, message);
  }
}

/** Log a security-relevant audit event. */
export function logAudit(action: string, detail?: string): void {
  log('info', 'audit', action, detail);
}

export function getLog(): LogEntry[] {
  return [...entries];
}

export function clearLog(): void {
  entries.length = 0;
}
