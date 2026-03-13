import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { fetchDrivesByPurpose, createDrive, deleteDrive, pickFolder } from '@/api/drives';

function DriveSection({ purpose, title, description, emptyMessage, maxCount }: {
  purpose: 'input' | 'output';
  title: string;
  description: string;
  emptyMessage: string;
  maxCount?: number;
}) {
  const qc = useQueryClient();
  const { data: drives } = useQuery({
    queryKey: ['drives', purpose],
    queryFn: () => fetchDrivesByPurpose(purpose),
  });
  const [error, setError] = useState('');
  const [picking, setPicking] = useState(false);

  const addMut = useMutation({
    mutationFn: (path: string) => createDrive({ path, purpose }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['drives'] }); setError(''); },
    onError: (e: Error) => setError(e.message),
  });

  const removeMut = useMutation({
    mutationFn: deleteDrive,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['drives'] }),
  });

  const handleAdd = async () => {
    setPicking(true);
    setError('');
    try {
      const result = await pickFolder();
      if (result.path && !result.cancelled) {
        addMut.mutate(result.path);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to open folder picker');
    } finally {
      setPicking(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
        {(!maxCount || !drives || drives.length < maxCount) && (
          <Button size="sm" onClick={handleAdd} disabled={picking}>
            <Plus className="h-3 w-3" /> {picking ? 'Selecting...' : 'Add'}
          </Button>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/30 rounded-md p-2">{error}</p>
      )}

      <div className="space-y-2">
        {drives?.map((s) => {
          const segments = s.path.split('/').filter(Boolean);
          const displayName = segments.pop() || s.path;
          const parentPath = '/' + segments.join('/');
          return (
            <div key={s.id} className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 p-3">
              <div className="flex items-center gap-3 min-w-0">
                <FolderOpen className="h-5 w-5 text-blue-500 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{displayName}</div>
                  <div className="text-xs text-gray-500 truncate">{parentPath}</div>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 flex-shrink-0" onClick={() => removeMut.mutate(s.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
        {!drives?.length && (
          <p className="text-sm text-gray-400 text-center py-6">{emptyMessage}</p>
        )}
      </div>
    </div>
  );
}

export function SourceSettings() {
  return (
    <div className="space-y-8">
      <DriveSection
        purpose="input"
        title="Global Default Input Sources"
        description="Folders that all work items reference by default. Individual work items can add or restrict sources in their Files tab."
        emptyMessage="No global input sources configured yet"
      />

      <hr className="border-gray-200 dark:border-gray-700" />

      <DriveSection
        purpose="output"
        title="Global Default Output Location"
        description="The folder where output files are saved by default. Individual work items can override this in their Define tab."
        emptyMessage="No global output location configured yet"
        maxCount={1}
      />
    </div>
  );
}
