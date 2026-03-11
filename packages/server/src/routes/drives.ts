import { Router } from 'express';
import { z } from 'zod';
import * as DriveRoots from '../db/models/driveRoots.js';
import * as FileRefs from '../db/models/fileReferences.js';
import { browseDrive, validateDrivePath } from '../services/driveService.js';

const router = Router();

// Drive Roots
router.get('/drives', (_req, res) => {
  res.json(DriveRoots.listDriveRoots());
});

router.post('/drives', (req, res) => {
  const data = z.object({ name: z.string().min(1), path: z.string().min(1), description: z.string().optional() }).parse(req.body);
  const validation = validateDrivePath(data.path);
  if (!validation.valid) return res.status(400).json({ error: validation.message });
  res.status(201).json(DriveRoots.createDriveRoot(data));
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
