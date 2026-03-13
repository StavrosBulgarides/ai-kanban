-- Track when user last viewed the output of a completed work item
ALTER TABLE work_items ADD COLUMN viewed_output_at TEXT;
