-- Track when a work item entered "In Progress" status
ALTER TABLE work_items ADD COLUMN in_progress_since TEXT;
