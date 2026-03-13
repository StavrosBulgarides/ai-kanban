import Database from 'better-sqlite3';
import { vi } from 'vitest';

let testDb: Database.Database;

/**
 * Creates a fresh in-memory SQLite database with the full schema applied.
 * Also mocks the connection module so all model code uses this database.
 */
export function setupTestDb(): Database.Database {
  testDb = new Database(':memory:');
  testDb.pragma('journal_mode = WAL');
  testDb.pragma('foreign_keys = ON');

  // Apply schema
  testDb.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS statuses (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#6b7280',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_hidden INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS work_items (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      status_id TEXT NOT NULL REFERENCES statuses(id),
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      priority TEXT NOT NULL DEFAULT 'none' CHECK(priority IN ('urgent','high','medium','low','none')),
      sort_order INTEGER NOT NULL DEFAULT 0,
      parent_id TEXT REFERENCES work_items(id) ON DELETE SET NULL,
      in_progress_since TEXT,
      viewed_output_at TEXT,
      tool_permissions TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#6b7280'
    );

    CREATE TABLE IF NOT EXISTS work_item_tags (
      work_item_id TEXT NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
      tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (work_item_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS drive_roots (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      description TEXT DEFAULT '',
      purpose TEXT NOT NULL DEFAULT 'input',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS file_references (
      id TEXT PRIMARY KEY,
      work_item_id TEXT NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
      drive_root_id TEXT REFERENCES drive_roots(id) ON DELETE SET NULL,
      path TEXT NOT NULL,
      label TEXT DEFAULT '',
      ref_type TEXT NOT NULL DEFAULT 'reference' CHECK(ref_type IN ('input','output','reference')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS integrations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      base_url TEXT DEFAULT '',
      auth_type TEXT NOT NULL DEFAULT 'pat',
      auth_token TEXT NOT NULL DEFAULT '',
      config TEXT NOT NULL DEFAULT '{}',
      is_active INTEGER NOT NULL DEFAULT 1,
      can_write INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS skills (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
      work_item_id TEXT REFERENCES work_items(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      prompt_template TEXT NOT NULL DEFAULT '',
      integration_ids TEXT NOT NULL DEFAULT '[]',
      config TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS agent_runs (
      id TEXT PRIMARY KEY,
      work_item_id TEXT REFERENCES work_items(id) ON DELETE SET NULL,
      skill_id TEXT REFERENCES skills(id) ON DELETE SET NULL,
      prompt TEXT NOT NULL,
      result TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'running' CHECK(status IN ('running','completed','failed')),
      session_id TEXT,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS clarification_messages (
      id TEXT PRIMARY KEY,
      work_item_id TEXT NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS project_drive_roots (
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      drive_root_id TEXT NOT NULL REFERENCES drive_roots(id) ON DELETE CASCADE,
      PRIMARY KEY (project_id, drive_root_id)
    );

    CREATE TABLE IF NOT EXISTS work_item_drive_roots (
      work_item_id TEXT NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
      drive_root_id TEXT NOT NULL REFERENCES drive_roots(id) ON DELETE CASCADE,
      PRIMARY KEY (work_item_id, drive_root_id)
    );

    CREATE TABLE IF NOT EXISTS work_item_templates (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      template_data TEXT NOT NULL DEFAULT '{}',
      schedule_cron TEXT,
      schedule_enabled INTEGER NOT NULL DEFAULT 0,
      target_status_id TEXT REFERENCES statuses(id) ON DELETE SET NULL,
      last_triggered_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS prompt_templates (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      template TEXT NOT NULL DEFAULT '',
      variables TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  return testDb;
}

export function getTestDb(): Database.Database {
  return testDb;
}

export function closeTestDb(): void {
  if (testDb) {
    testDb.close();
  }
}
