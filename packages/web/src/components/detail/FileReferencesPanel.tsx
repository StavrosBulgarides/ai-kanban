import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Folder, File, Trash2, Plus, ChevronRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { fetchFileReferences, createFileReference, deleteFileReference, fetchDrives, browseDrive } from '@/api/drives';
import type { DriveRoot, DirectoryEntry, FileReference } from '@/types/models';

export function FileReferencesPanel({ workItemId }: { workItemId: string }) {
  const qc = useQueryClient();
  const [showBrowser, setShowBrowser] = useState(false);
  const { data: refs } = useQuery({
    queryKey: ['file-refs', workItemId],
    queryFn: () => fetchFileReferences(workItemId),
  });

  const removeMut = useMutation({
    mutationFn: deleteFileReference,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['file-refs', workItemId] }),
  });

  const grouped = {
    input: refs?.filter((r) => r.ref_type === 'input') || [],
    output: refs?.filter((r) => r.ref_type === 'output') || [],
    reference: refs?.filter((r) => r.ref_type === 'reference') || [],
  };

  return (
    <div className="space-y-3">
      {(['input', 'output', 'reference'] as const).map((type) => (
        <div key={type}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-500 capitalize">{type}s</span>
          </div>
          {grouped[type].length === 0 && (
            <p className="text-xs text-gray-400">No {type} files</p>
          )}
          {grouped[type].map((ref) => (
            <div key={ref.id} className="flex items-center gap-2 text-xs py-1 group">
              <File className="h-3 w-3 text-gray-400 flex-shrink-0" />
              <span className="truncate flex-1" title={ref.path}>{ref.label || ref.path}</span>
              <button
                onClick={() => removeMut.mutate(ref.id)}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-50"
              >
                <Trash2 className="h-3 w-3 text-red-500" />
              </button>
            </div>
          ))}
        </div>
      ))}
      <Button variant="outline" size="sm" className="w-full" onClick={() => setShowBrowser(true)}>
        <Plus className="h-3 w-3" /> Add File Reference
      </Button>

      <DriveBrowserDialog
        open={showBrowser}
        onClose={() => setShowBrowser(false)}
        workItemId={workItemId}
      />
    </div>
  );
}

function DriveBrowserDialog({ open, onClose, workItemId }: { open: boolean; onClose: () => void; workItemId: string }) {
  const qc = useQueryClient();
  const [selectedDrive, setSelectedDrive] = useState<DriveRoot | null>(null);
  const [currentPath, setCurrentPath] = useState('');
  const [refType, setRefType] = useState<'input' | 'output' | 'reference'>('reference');

  const { data: drives } = useQuery({ queryKey: ['drives'], queryFn: fetchDrives, enabled: open });
  const { data: entries } = useQuery({
    queryKey: ['drive-browse', selectedDrive?.id, currentPath],
    queryFn: () => browseDrive(selectedDrive!.id, currentPath),
    enabled: !!selectedDrive,
  });

  const addRef = useMutation({
    mutationFn: (path: string) => createFileReference(workItemId, {
      drive_root_id: selectedDrive?.id,
      path: `${selectedDrive?.name}/${path}`,
      ref_type: refType,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['file-refs', workItemId] });
      onClose();
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Browse Drive</DialogTitle>
        </DialogHeader>

        {!selectedDrive ? (
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
              <button onClick={() => { setSelectedDrive(null); setCurrentPath(''); }} className="text-blue-500 hover:underline">
                <ArrowLeft className="h-4 w-4 inline" /> Drives
              </button>
              <ChevronRight className="h-3 w-3 text-gray-400" />
              <span className="font-medium">{selectedDrive.name}</span>
              {currentPath && (
                <>
                  <ChevronRight className="h-3 w-3 text-gray-400" />
                  <span className="text-gray-500 truncate">{currentPath}</span>
                </>
              )}
            </div>

            {currentPath && (
              <button
                onClick={() => setCurrentPath(currentPath.split('/').slice(0, -1).join('/'))}
                className="flex items-center gap-2 w-full text-sm py-1 text-blue-500 hover:bg-gray-50 rounded px-2"
              >
                <ArrowLeft className="h-3 w-3" /> Back
              </button>
            )}

            <div className="max-h-60 overflow-y-auto space-y-0.5">
              {entries?.map((entry) => (
                <div key={entry.path} className="flex items-center gap-2 text-sm py-1 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800">
                  {entry.type === 'directory' ? (
                    <Folder className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  ) : (
                    <File className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  )}
                  <button
                    onClick={() => entry.type === 'directory' ? setCurrentPath(entry.path) : addRef.mutate(entry.path)}
                    className="truncate flex-1 text-left"
                  >
                    {entry.name}
                  </button>
                  {entry.type === 'file' && (
                    <Button size="sm" variant="ghost" onClick={() => addRef.mutate(entry.path)} className="text-xs">
                      Add
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <span className="text-xs text-gray-500">Type:</span>
              {(['input', 'output', 'reference'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setRefType(t)}
                  className={`px-2 py-0.5 text-xs rounded capitalize ${refType === t ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
