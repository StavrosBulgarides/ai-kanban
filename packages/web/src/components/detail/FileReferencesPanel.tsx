import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Folder, File, Trash2, Upload, ChevronRight, ArrowLeft, Eye, FolderOpen, FolderPlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import {
  fetchFileReferences, createFileReference, deleteFileReference,
  fetchDrives, fetchDrivesByPurpose, browseDrive, openFile, revealFile, pickFolder, pickFiles,
  fetchEffectiveDriveRoots, fetchWorkItemDriveRoots, addWorkItemDriveRoot, removeWorkItemDriveRoot,
  createDrive,
} from '@/api/drives';
import type { DriveRoot, DirectoryEntry } from '@/types/models';

interface FileReferencesPanelProps {
  workItemId: string;
  projectId: string;
}

export function FileReferencesPanel({ workItemId, projectId }: FileReferencesPanelProps) {
  const qc = useQueryClient();
  const [showBrowser, setShowBrowser] = useState(false);
  const [browserDrive, setBrowserDrive] = useState<DriveRoot | null>(null);

  // Effective drive roots (work-item overrides or project fallback)
  const { data: effectiveDrives } = useQuery({
    queryKey: ['effective-drive-roots', workItemId, projectId],
    queryFn: () => fetchEffectiveDriveRoots(workItemId, projectId),
  });

  // Global output drives (fallback when no work-item output overrides)
  const { data: globalOutputDrives } = useQuery({
    queryKey: ['drives', 'output'],
    queryFn: () => fetchDrivesByPurpose('output'),
  });

  // File references
  const { data: refs } = useQuery({
    queryKey: ['file-refs', workItemId],
    queryFn: () => fetchFileReferences(workItemId),
  });

  const removeMut = useMutation({
    mutationFn: deleteFileReference,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['file-refs', workItemId] }),
  });

  const removeFolder = useMutation({
    mutationFn: (driveRootId: string) => removeWorkItemDriveRoot(workItemId, driveRootId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['effective-drive-roots', workItemId, projectId] });
      qc.invalidateQueries({ queryKey: ['work-item-drive-roots', workItemId] });
    },
  });

  const addFolder = useMutation({
    mutationFn: async (purpose: 'input' | 'output') => {
      const result = await pickFolder();
      if (result.cancelled || !result.path) return null;
      // Find or create a drive root for this path with the correct purpose
      const drives = await fetchDrives();
      let drive = drives.find(d => d.path === result.path && d.purpose === purpose);
      if (!drive) {
        drive = await createDrive({ path: result.path, purpose });
      }
      // For output: only one allowed — remove any existing work-item output associations first
      if (purpose === 'output') {
        const currentWiDrives = await fetchWorkItemDriveRoots(workItemId);
        for (const d of currentWiDrives) {
          if (d.purpose === 'output') {
            await removeWorkItemDriveRoot(workItemId, d.id);
          }
        }
      }
      await addWorkItemDriveRoot(workItemId, drive.id);
      return drive;
    },
    onSuccess: (drive) => {
      if (drive) {
        qc.invalidateQueries({ queryKey: ['effective-drive-roots', workItemId, projectId] });
        qc.invalidateQueries({ queryKey: ['drives'] });
      }
    },
  });

  const addFiles = useMutation({
    mutationFn: async () => {
      const result = await pickFiles();
      if (result.cancelled || !result.paths.length) return;
      for (const filePath of result.paths) {
        await createFileReference(workItemId, { path: filePath, ref_type: 'input' });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['file-refs', workItemId] }),
  });

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    addFiles.mutate();
  }, [addFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleBrowseDrive = (drive: DriveRoot) => {
    setBrowserDrive(drive);
    setShowBrowser(true);
  };

  const inputFiles = refs?.filter((r) => r.ref_type === 'input') || [];

  // Split effective drives by purpose
  const inputDrives = effectiveDrives?.filter(d => d.purpose !== 'output') || [];
  // For output: use effective output drives, falling back to global output drives
  const effectiveOutputDrives = effectiveDrives?.filter(d => d.purpose === 'output') || [];
  const outputDrives = effectiveOutputDrives.length > 0 ? effectiveOutputDrives : (globalOutputDrives || []);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4">
        {/* Left column: Input Sources */}
        <div className="space-y-3">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Input Sources</span>

          {/* Source Folders */}
          <div>
            <span className="text-xs font-medium text-gray-500 mb-1 block">Source Folders</span>
            {inputDrives.map((d) => (
              <div key={d.id} className="flex items-center gap-2 text-xs py-1 group">
                <Folder className="h-3 w-3 text-blue-500 flex-shrink-0" />
                <button
                  onClick={() => handleBrowseDrive(d)}
                  className="truncate flex-1 text-left hover:text-blue-500"
                  title={d.path}
                >
                  {d.name}
                  <span className="text-gray-400 ml-1 text-[10px]">{d.path}</span>
                </button>
                <button
                  onClick={() => revealFile(d.path)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                  title="Open in Finder"
                >
                  <FolderOpen className="h-3 w-3 text-gray-500" />
                </button>
                <button
                  onClick={() => removeFolder.mutate(d.id)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30"
                  title="Remove"
                >
                  <Trash2 className="h-3 w-3 text-red-500" />
                </button>
              </div>
            ))}
            {inputDrives.length === 0 && (
              <p className="text-xs text-gray-400 py-1">No source folders assigned</p>
            )}
            <button
              onClick={() => addFolder.mutate('input')}
              className="flex items-center gap-2 text-xs text-blue-500 hover:text-blue-400 mt-1 py-1"
            >
              <FolderPlus className="h-3 w-3" />
              Add Source Folder
            </button>
          </div>

          {/* Source Documents */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <span className="text-xs font-medium text-gray-500 mb-1 block">Source Documents</span>
            {inputFiles.map((ref) => {
              const fileName = ref.path.split('/').pop() || ref.path;
              return (
                <div key={ref.id} className="flex items-center gap-2 text-xs py-1 group">
                  <File className="h-3 w-3 text-gray-400 flex-shrink-0" />
                  <span className="truncate flex-1" title={ref.path}>{fileName}</span>
                  <button
                    onClick={() => openFile(ref.path)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                    title="View"
                  >
                    <Eye className="h-3 w-3 text-gray-500" />
                  </button>
                  <button
                    onClick={() => removeMut.mutate(ref.id)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30"
                    title="Remove"
                  >
                    <Trash2 className="h-3 w-3 text-red-500" />
                  </button>
                </div>
              );
            })}
            <button
              onClick={() => addFiles.mutate()}
              className="flex items-center gap-2 text-xs text-blue-500 hover:text-blue-400 mt-2 py-1"
            >
              <Upload className="h-3 w-3" />
              Add Source Documents
            </button>
          </div>
        </div>

        {/* Right column: Output Locations */}
        <div>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-3">Output Location</span>

          <div>
            <span className="text-xs font-medium text-gray-500 mb-1 block">Output Folder</span>
            {outputDrives.length > 0 ? (
              <>
                {outputDrives.slice(0, 1).map((d) => (
                  <div key={d.id} className="flex items-center gap-2 text-xs py-1 group">
                    <Folder className="h-3 w-3 text-green-500 flex-shrink-0" />
                    <span className="truncate flex-1" title={d.path}>
                      {d.name}
                      <span className="text-gray-400 ml-1 text-[10px]">{d.path}</span>
                    </span>
                    <button
                      onClick={() => revealFile(d.path)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                      title="Open in Finder"
                    >
                      <FolderOpen className="h-3 w-3 text-gray-500" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addFolder.mutate('output')}
                  className="flex items-center gap-2 text-xs text-blue-500 hover:text-blue-400 mt-1 py-1"
                >
                  <FolderPlus className="h-3 w-3" />
                  Change Output Folder
                </button>
              </>
            ) : (
              <>
                <p className="text-xs text-gray-400 py-1">No output folder assigned</p>
                <button
                  onClick={() => addFolder.mutate('output')}
                  className="flex items-center gap-2 text-xs text-blue-500 hover:text-blue-400 mt-1 py-1"
                >
                  <FolderPlus className="h-3 w-3" />
                  Add Output Folder
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <DriveBrowserDialog
        open={showBrowser}
        onClose={() => { setShowBrowser(false); setBrowserDrive(null); }}
        workItemId={workItemId}
        initialDrive={browserDrive}
      />
    </div>
  );
}

function DriveBrowserDialog({ open, onClose, workItemId, initialDrive }: {
  open: boolean;
  onClose: () => void;
  workItemId: string;
  initialDrive: DriveRoot | null;
}) {
  const qc = useQueryClient();
  const [selectedDrive, setSelectedDrive] = useState<DriveRoot | null>(null);
  const [currentPath, setCurrentPath] = useState('');

  // Use initialDrive when dialog opens
  const activeDrive = selectedDrive || initialDrive;

  const { data: drives } = useQuery({ queryKey: ['drives'], queryFn: () => fetchDrives(), enabled: open && !activeDrive });
  const { data: entries } = useQuery({
    queryKey: ['drive-browse', activeDrive?.id, currentPath],
    queryFn: () => browseDrive(activeDrive!.id, currentPath),
    enabled: !!activeDrive,
  });

  const addRef = useMutation({
    mutationFn: (absPath: string) => createFileReference(workItemId, {
      drive_root_id: activeDrive?.id,
      path: absPath,
      ref_type: 'input',
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['file-refs', workItemId] });
      onClose();
    },
  });

  const handleBack = () => {
    if (currentPath) {
      setCurrentPath(currentPath.split('/').slice(0, -1).join('/'));
    } else {
      setSelectedDrive(null);
    }
  };

  // Build absolute path from drive root + relative path
  const getAbsPath = (relativePath: string) => {
    if (!activeDrive) return relativePath;
    return `${activeDrive.path}/${relativePath}`;
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); setSelectedDrive(null); setCurrentPath(''); } }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add Source Document</DialogTitle>
        </DialogHeader>

        {!activeDrive ? (
          <div className="space-y-2">
            {drives?.map((d) => (
              <button
                key={d.id}
                onClick={() => { setSelectedDrive(d); setCurrentPath(''); }}
                className="flex items-center gap-2 w-full rounded-lg p-3 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-left"
              >
                <Folder className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="font-medium text-sm">{d.name}</div>
                  <div className="text-xs text-gray-500">{d.path}</div>
                </div>
              </button>
            ))}
            {!drives?.length && <p className="text-sm text-gray-400 text-center py-4">No drives configured. Add one in Settings.</p>}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <button onClick={handleBack} className="text-blue-500 hover:underline">
                <ArrowLeft className="h-4 w-4 inline" /> {currentPath ? 'Back' : 'Drives'}
              </button>
              <ChevronRight className="h-3 w-3 text-gray-400" />
              <span className="font-medium">{activeDrive.name}</span>
              {currentPath && (
                <>
                  <ChevronRight className="h-3 w-3 text-gray-400" />
                  <span className="text-gray-500 truncate">{currentPath}</span>
                </>
              )}
            </div>

            <div className="max-h-60 overflow-y-auto space-y-0.5">
              {entries?.map((entry) => (
                <div key={entry.path} className="flex items-center gap-2 text-sm py-1 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800">
                  {entry.type === 'directory' ? (
                    <Folder className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  ) : (
                    <File className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  )}
                  <button
                    onClick={() => entry.type === 'directory' ? setCurrentPath(entry.path) : addRef.mutate(getAbsPath(entry.path))}
                    className="truncate flex-1 text-left"
                  >
                    {entry.name}
                  </button>
                  {entry.type === 'file' && (
                    <Button size="sm" variant="ghost" onClick={() => addRef.mutate(getAbsPath(entry.path))} className="text-xs">
                      Add
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
