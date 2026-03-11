import fs from 'fs';
import path from 'path';
import { getDriveRoot } from '../db/models/driveRoots.js';

export interface DirectoryEntry {
  name: string;
  type: 'file' | 'directory';
  size: number;
  modified: string;
  path: string;
}

export function browseDrive(driveRootId: string, relativePath: string = ''): DirectoryEntry[] {
  const root = getDriveRoot(driveRootId);
  if (!root) throw new Error('Drive root not found');

  const resolved = path.resolve(root.path, relativePath);
  const normalizedRoot = path.resolve(root.path);

  // Prevent path traversal
  if (!resolved.startsWith(normalizedRoot)) {
    throw new Error('Path traversal not allowed');
  }

  if (!fs.existsSync(resolved)) {
    throw new Error('Path does not exist');
  }

  const stat = fs.statSync(resolved);
  if (!stat.isDirectory()) {
    throw new Error('Path is not a directory');
  }

  const entries = fs.readdirSync(resolved, { withFileTypes: true });
  return entries
    .filter(e => !e.name.startsWith('.'))
    .map(entry => {
      const fullPath = path.join(resolved, entry.name);
      const entryRelPath = path.relative(normalizedRoot, fullPath);
      try {
        const entryStat = fs.statSync(fullPath);
        return {
          name: entry.name,
          type: entry.isDirectory() ? 'directory' as const : 'file' as const,
          size: entryStat.size,
          modified: entryStat.mtime.toISOString(),
          path: entryRelPath,
        };
      } catch {
        return {
          name: entry.name,
          type: entry.isDirectory() ? 'directory' as const : 'file' as const,
          size: 0,
          modified: '',
          path: entryRelPath,
        };
      }
    })
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

export function validateDrivePath(drivePath: string): { valid: boolean; message: string } {
  try {
    const resolved = path.resolve(drivePath);
    if (!fs.existsSync(resolved)) return { valid: false, message: 'Path does not exist' };
    const stat = fs.statSync(resolved);
    if (!stat.isDirectory()) return { valid: false, message: 'Path is not a directory' };
    return { valid: true, message: 'Valid directory' };
  } catch (e: any) {
    return { valid: false, message: e.message };
  }
}
