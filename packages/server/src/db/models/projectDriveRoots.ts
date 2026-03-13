import { getDb } from '../connection.js';
import type { DriveRoot } from './driveRoots.js';
import { listDriveRoots } from './driveRoots.js';

export function listProjectDriveRoots(projectId: string): DriveRoot[] {
  return getDb().prepare(
    `SELECT d.* FROM drive_roots d
     JOIN project_drive_roots pdr ON pdr.drive_root_id = d.id
     WHERE pdr.project_id = ?
     ORDER BY d.name`
  ).all(projectId) as DriveRoot[];
}

export function addProjectDriveRoot(projectId: string, driveRootId: string): void {
  getDb().prepare(
    'INSERT OR IGNORE INTO project_drive_roots (project_id, drive_root_id) VALUES (?, ?)'
  ).run(projectId, driveRootId);
}

export function removeProjectDriveRoot(projectId: string, driveRootId: string): boolean {
  return getDb().prepare(
    'DELETE FROM project_drive_roots WHERE project_id = ? AND drive_root_id = ?'
  ).run(projectId, driveRootId).changes > 0;
}

export function listWorkItemDriveRoots(workItemId: string): DriveRoot[] {
  return getDb().prepare(
    `SELECT d.* FROM drive_roots d
     JOIN work_item_drive_roots widr ON widr.drive_root_id = d.id
     WHERE widr.work_item_id = ?
     ORDER BY d.name`
  ).all(workItemId) as DriveRoot[];
}

export function addWorkItemDriveRoot(workItemId: string, driveRootId: string): void {
  getDb().prepare(
    'INSERT OR IGNORE INTO work_item_drive_roots (work_item_id, drive_root_id) VALUES (?, ?)'
  ).run(workItemId, driveRootId);
}

export function removeWorkItemDriveRoot(workItemId: string, driveRootId: string): boolean {
  return getDb().prepare(
    'DELETE FROM work_item_drive_roots WHERE work_item_id = ? AND drive_root_id = ?'
  ).run(workItemId, driveRootId).changes > 0;
}

export function hasWorkItemDriveRoots(workItemId: string): boolean {
  const row = getDb().prepare(
    'SELECT COUNT(*) as cnt FROM work_item_drive_roots WHERE work_item_id = ?'
  ).get(workItemId) as { cnt: number };
  return row.cnt > 0;
}

export function getEffectiveDriveRoots(workItemId: string, projectId: string): DriveRoot[] {
  // Work-item-level overrides take precedence; otherwise fall back to project-level, then global defaults.
  // Resolve separately per purpose so that e.g. a work-item input override doesn't suppress global output defaults.
  const wiRoots = listWorkItemDriveRoots(workItemId);
  const projectRoots = listProjectDriveRoots(projectId);
  const globalRoots = listDriveRoots();

  const seenIds = new Set<string>();
  const result: DriveRoot[] = [];

  for (const purpose of ['input', 'output'] as const) {
    const wiByPurpose = wiRoots.filter(d => d.purpose === purpose);
    if (wiByPurpose.length > 0) {
      for (const d of wiByPurpose) { if (!seenIds.has(d.id)) { seenIds.add(d.id); result.push(d); } }
      continue;
    }
    const projByPurpose = projectRoots.filter(d => d.purpose === purpose);
    if (projByPurpose.length > 0) {
      for (const d of projByPurpose) { if (!seenIds.has(d.id)) { seenIds.add(d.id); result.push(d); } }
      continue;
    }
    const globalByPurpose = globalRoots.filter(d => d.purpose === purpose);
    for (const d of globalByPurpose) { if (!seenIds.has(d.id)) { seenIds.add(d.id); result.push(d); } }
  }

  return result;
}
