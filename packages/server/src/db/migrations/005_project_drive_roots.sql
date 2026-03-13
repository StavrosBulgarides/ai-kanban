-- Project-level drive root associations
CREATE TABLE IF NOT EXISTS project_drive_roots (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  drive_root_id TEXT NOT NULL REFERENCES drive_roots(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, drive_root_id)
);

-- Work-item-level drive root overrides
CREATE TABLE IF NOT EXISTS work_item_drive_roots (
  work_item_id TEXT NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  drive_root_id TEXT NOT NULL REFERENCES drive_roots(id) ON DELETE CASCADE,
  PRIMARY KEY (work_item_id, drive_root_id)
);

CREATE INDEX IF NOT EXISTS idx_project_drive_roots_project ON project_drive_roots(project_id);
CREATE INDEX IF NOT EXISTS idx_work_item_drive_roots_work_item ON work_item_drive_roots(work_item_id);
