import { Router } from 'express';
import { z } from 'zod';
import path from 'path';
import { spawnSync, execSync } from 'child_process';
import * as DriveRoots from '../db/models/driveRoots.js';
import * as FileRefs from '../db/models/fileReferences.js';
import * as ProjectDriveRoots from '../db/models/projectDriveRoots.js';
import { browseDrive, validateDrivePath } from '../services/driveService.js';
import { isEnterprise, getConfig } from '../lib/enterpriseConfig.js';
import { logAudit } from '../services/eventLog.js';

const router = Router();

/**
 * In enterprise mode, validate that a file path falls under a registered drive root.
 */
function isPathUnderDriveRoot(filePath: string): boolean {
  const resolved = path.resolve(filePath);
  const roots = DriveRoots.listDriveRoots();
  return roots.some(root => resolved.startsWith(path.resolve(root.path)));
}

// Sources (Drive Roots)
router.get('/drives', (req, res) => {
  const purpose = req.query.purpose as 'input' | 'output' | undefined;
  res.json(DriveRoots.listDriveRoots(purpose));
});

router.post('/drives', (req, res) => {
  const data = z.object({
    name: z.string().optional(),
    path: z.string().min(1),
    description: z.string().optional(),
    purpose: z.enum(['input', 'output']).optional(),
  }).parse(req.body);

  const validation = validateDrivePath(data.path);
  if (!validation.valid) return res.status(400).json({ error: validation.message });

  // Only one global output location allowed
  if (data.purpose === 'output') {
    const existing = DriveRoots.listDriveRoots('output');
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Only one global output location is allowed. Remove the existing one first.' });
    }
  }

  // Auto-derive name from path if not provided
  const name = data.name || path.basename(data.path) || data.path;

  res.status(201).json(DriveRoots.createDriveRoot({ name, path: data.path, description: data.description, purpose: data.purpose }));
});

router.put('/drives/:id', (req, res) => {
  const data = z.object({ name: z.string().optional(), path: z.string().optional(), description: z.string().optional() }).parse(req.body);
  if (data.path) {
    const validation = validateDrivePath(data.path);
    if (!validation.valid) return res.status(400).json({ error: validation.message });
  }
  const root = DriveRoots.updateDriveRoot(req.params.id, data);
  if (!root) return res.status(404).json({ error: 'Drive root not found' });
  res.json(root);
});

router.delete('/drives/:id', (req, res) => {
  if (!DriveRoots.deleteDriveRoot(req.params.id)) return res.status(404).json({ error: 'Drive root not found' });
  res.json({ ok: true });
});

router.get('/drives/:id/browse', (req, res) => {
  try {
    const entries = browseDrive(req.params.id, (req.query.path as string) || '');
    res.json(entries);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * POST /drives/pick-folder
 * Opens the native OS folder picker dialog and returns the selected path.
 */
router.post('/drives/pick-folder', (_req, res) => {
  try {
    let selectedPath: string | null = null;

    if (process.platform === 'darwin') {
      // macOS: use osascript to open a native folder picker
      const result = spawnSync('osascript', [
        '-e', 'set theFolder to choose folder with prompt "Select a source folder"',
        '-e', 'POSIX path of theFolder',
      ], { encoding: 'utf-8', timeout: 60000 });
      if (result.status === 0 && result.stdout) {
        selectedPath = result.stdout.trim();
        if (selectedPath.endsWith('/')) selectedPath = selectedPath.slice(0, -1);
      } else if (result.status === 1) {
        return res.json({ path: null, cancelled: true });
      }
    } else if (process.platform === 'win32') {
      // Windows: use PowerShell folder picker
      const result = spawnSync('powershell', [
        '-Command',
        'Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.FolderBrowserDialog; $f.Description = "Select a source folder"; if($f.ShowDialog() -eq "OK"){$f.SelectedPath}',
      ], { encoding: 'utf-8', timeout: 60000 });
      if (result.status === 0 && result.stdout) {
        selectedPath = result.stdout.trim() || null;
      }
    } else {
      // Linux: try zenity
      const result = spawnSync('zenity', [
        '--file-selection', '--directory', '--title=Select a source folder',
      ], { encoding: 'utf-8', timeout: 60000 });
      if (result.status === 0 && result.stdout) {
        selectedPath = result.stdout.trim() || null;
      } else if (result.error) {
        return res.status(400).json({ error: 'No folder picker available. Install zenity or enter the path manually.' });
      }
    }

    if (!selectedPath) {
      return res.json({ path: null, cancelled: true });
    }

    res.json({ path: selectedPath, cancelled: false });
  } catch (e: any) {
    if (e.status === 1 || e.message?.includes('User canceled')) {
      return res.json({ path: null, cancelled: true });
    }
    res.status(500).json({ error: e.message });
  }
});

/**
 * POST /files/open
 * Opens a file with the system default application.
 */
router.post('/files/open', (req, res) => {
  const { path: filePath } = z.object({ path: z.string().min(1) }).parse(req.body);

  // Enterprise: check if file open is allowed
  if (isEnterprise()) {
    const config = getConfig();
    if (!config.allowFileOpen) {
      return res.status(403).json({ error: 'File open is disabled in enterprise mode. Set ALLOW_FILE_OPEN=true to enable.' });
    }
    // Validate path is under a registered drive root
    if (!isPathUnderDriveRoot(filePath)) {
      return res.status(403).json({ error: 'Path is not under a registered drive root' });
    }
  }

  logAudit('file.open', filePath);

  try {
    if (process.platform === 'darwin') {
      spawnSync('open', [filePath], { timeout: 5000 });
    } else if (process.platform === 'win32') {
      spawnSync('cmd', ['/c', 'start', '', filePath], { timeout: 5000 });
    } else {
      spawnSync('xdg-open', [filePath], { timeout: 5000 });
    }
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * POST /files/reveal
 * Reveals a file in the system file manager (Finder/Explorer).
 */
router.post('/files/reveal', (req, res) => {
  const { path: filePath } = z.object({ path: z.string().min(1) }).parse(req.body);

  // Enterprise: check if file open is allowed
  if (isEnterprise()) {
    const config = getConfig();
    if (!config.allowFileOpen) {
      return res.status(403).json({ error: 'File reveal is disabled in enterprise mode. Set ALLOW_FILE_OPEN=true to enable.' });
    }
    if (!isPathUnderDriveRoot(filePath)) {
      return res.status(403).json({ error: 'Path is not under a registered drive root' });
    }
  }

  logAudit('file.reveal', filePath);

  try {
    if (process.platform === 'darwin') {
      spawnSync('open', ['-R', filePath], { timeout: 5000 });
    } else if (process.platform === 'win32') {
      spawnSync('explorer', ['/select,', filePath], { timeout: 5000 });
    } else {
      spawnSync('xdg-open', [path.dirname(filePath)], { timeout: 5000 });
    }
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Project Drive Roots
router.get('/projects/:id/drive-roots', (req, res) => {
  res.json(ProjectDriveRoots.listProjectDriveRoots(req.params.id));
});

router.post('/projects/:id/drive-roots', (req, res) => {
  const { drive_root_id } = z.object({ drive_root_id: z.string().min(1) }).parse(req.body);
  ProjectDriveRoots.addProjectDriveRoot(req.params.id, drive_root_id);
  res.status(201).json({ ok: true });
});

router.delete('/projects/:id/drive-roots/:driveId', (req, res) => {
  if (!ProjectDriveRoots.removeProjectDriveRoot(req.params.id, req.params.driveId)) {
    return res.status(404).json({ error: 'Association not found' });
  }
  res.json({ ok: true });
});

// Work Item Drive Roots
router.get('/work-items/:id/drive-roots', (req, res) => {
  res.json(ProjectDriveRoots.listWorkItemDriveRoots(req.params.id));
});

router.post('/work-items/:id/drive-roots', (req, res) => {
  const { drive_root_id } = z.object({ drive_root_id: z.string().min(1) }).parse(req.body);
  ProjectDriveRoots.addWorkItemDriveRoot(req.params.id, drive_root_id);
  res.status(201).json({ ok: true });
});

router.delete('/work-items/:id/drive-roots/:driveId', (req, res) => {
  if (!ProjectDriveRoots.removeWorkItemDriveRoot(req.params.id, req.params.driveId)) {
    return res.status(404).json({ error: 'Association not found' });
  }
  res.json({ ok: true });
});

// Effective drive roots (work-item overrides or project fallback)
router.get('/work-items/:id/effective-drive-roots', (req, res) => {
  const { project_id } = z.object({ project_id: z.string().min(1) }).parse(req.query);
  res.json(ProjectDriveRoots.getEffectiveDriveRoots(req.params.id, project_id));
});

/**
 * POST /drives/pick-files
 * Opens the native OS file picker dialog and returns the selected absolute paths.
 */
router.post('/drives/pick-files', (_req, res) => {
  try {
    let selectedPaths: string[] = [];

    if (process.platform === 'darwin') {
      const result = spawnSync('osascript', [
        '-e', 'set theFiles to choose file with prompt "Select source documents" with multiple selections allowed',
        '-e', 'set output to ""',
        '-e', 'repeat with f in theFiles',
        '-e', 'set output to output & POSIX path of f & linefeed',
        '-e', 'end repeat',
        '-e', 'output',
      ], { encoding: 'utf-8', timeout: 60000 });
      if (result.status === 0 && result.stdout) {
        selectedPaths = result.stdout.trim().split('\n').map(p => p.trim()).filter(Boolean);
      } else if (result.status === 1) {
        return res.json({ paths: [], cancelled: true });
      }
    } else if (process.platform === 'win32') {
      const result = spawnSync('powershell', [
        '-Command',
        'Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.OpenFileDialog; $f.Multiselect = $true; $f.Title = "Select source documents"; if($f.ShowDialog() -eq "OK"){$f.FileNames -join [char]10}',
      ], { encoding: 'utf-8', timeout: 60000 });
      if (result.status === 0 && result.stdout) {
        selectedPaths = result.stdout.trim().split('\n').map(p => p.trim()).filter(Boolean);
      }
    } else {
      const result = spawnSync('zenity', [
        '--file-selection', '--multiple', '--separator=\n', '--title=Select source documents',
      ], { encoding: 'utf-8', timeout: 60000 });
      if (result.status === 0 && result.stdout) {
        selectedPaths = result.stdout.trim().split('\n').map(p => p.trim()).filter(Boolean);
      } else if (result.error) {
        return res.status(400).json({ error: 'No file picker available. Install zenity or enter the path manually.' });
      }
    }

    if (!selectedPaths.length) {
      return res.json({ paths: [], cancelled: true });
    }

    res.json({ paths: selectedPaths, cancelled: false });
  } catch (e: any) {
    if (e.status === 1 || e.message?.includes('User canceled')) {
      return res.json({ paths: [], cancelled: true });
    }
    res.status(500).json({ error: e.message });
  }
});

// File References
router.get('/work-items/:id/file-references', (req, res) => {
  res.json(FileRefs.listFileReferences(req.params.id));
});

router.post('/work-items/:id/file-references', (req, res) => {
  const data = z.object({
    drive_root_id: z.string().optional(),
    path: z.string().min(1),
    label: z.string().optional(),
    ref_type: z.enum(['input', 'output', 'reference']).optional(),
  }).parse(req.body);
  res.status(201).json(FileRefs.createFileReference(req.params.id, data));
});

router.delete('/file-references/:id', (req, res) => {
  if (!FileRefs.deleteFileReference(req.params.id)) return res.status(404).json({ error: 'File reference not found' });
  res.json({ ok: true });
});

export default router;
