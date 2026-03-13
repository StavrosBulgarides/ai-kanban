-- Add purpose column to drive_roots to distinguish input sources from output locations
ALTER TABLE drive_roots ADD COLUMN purpose TEXT NOT NULL DEFAULT 'input';
