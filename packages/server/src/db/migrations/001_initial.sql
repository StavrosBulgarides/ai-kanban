-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Statuses (kanban columns)
CREATE TABLE IF NOT EXISTS statuses (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6b7280',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_hidden INTEGER NOT NULL DEFAULT 0
);

-- Work Items
CREATE TABLE IF NOT EXISTS work_items (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status_id TEXT NOT NULL REFERENCES statuses(id),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'none' CHECK(priority IN ('urgent','high','medium','low','none')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  parent_id TEXT REFERENCES work_items(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tags
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

-- Drive Roots
CREATE TABLE IF NOT EXISTS drive_roots (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- File References
CREATE TABLE IF NOT EXISTS file_references (
  id TEXT PRIMARY KEY,
  work_item_id TEXT NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  drive_root_id TEXT REFERENCES drive_roots(id) ON DELETE SET NULL,
  path TEXT NOT NULL,
  label TEXT DEFAULT '',
  ref_type TEXT NOT NULL DEFAULT 'reference' CHECK(ref_type IN ('input','output','reference')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Integrations
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

-- Skills (global, project-level, or work-item-level)
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

-- Prompt Templates
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

-- Agent Runs
CREATE TABLE IF NOT EXISTS agent_runs (
  id TEXT PRIMARY KEY,
  work_item_id TEXT REFERENCES work_items(id) ON DELETE SET NULL,
  skill_id TEXT REFERENCES skills(id) ON DELETE SET NULL,
  prompt TEXT NOT NULL,
  result TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'running' CHECK(status IN ('running','completed','failed')),
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

-- Work Item Templates
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_work_items_project ON work_items(project_id);
CREATE INDEX IF NOT EXISTS idx_work_items_status ON work_items(status_id);
CREATE INDEX IF NOT EXISTS idx_work_items_parent ON work_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_statuses_project ON statuses(project_id);
CREATE INDEX IF NOT EXISTS idx_tags_project ON tags(project_id);
CREATE INDEX IF NOT EXISTS idx_skills_project ON skills(project_id);
CREATE INDEX IF NOT EXISTS idx_skills_work_item ON skills(work_item_id);
CREATE INDEX IF NOT EXISTS idx_file_references_work_item ON file_references(work_item_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_work_item ON agent_runs(work_item_id);
CREATE INDEX IF NOT EXISTS idx_templates_project ON work_item_templates(project_id);
