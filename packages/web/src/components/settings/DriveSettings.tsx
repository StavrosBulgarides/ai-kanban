import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { fetchDrives, createDrive, deleteDrive } from '@/api/drives';

export function DriveSettings() {
  const qc = useQueryClient();
  const { data: drives } = useQuery({ queryKey: ['drives'], queryFn: fetchDrives });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', path: '', description: '' });
  const [error, setError] = useState('');

  const addMut = useMutation({
    mutationFn: () => createDrive(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['drives'] }); setShowForm(false); setForm({ name: '', path: '', description: '' }); setError(''); },
    onError: (e: Error) => setError(e.message),
  });

  const removeMut = useMutation({
    mutationFn: deleteDrive,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['drives'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Drive Roots</h3>
          <p className="text-xs text-gray-500">Configure local or shared drive paths that work items can reference.</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}><Plus className="h-3 w-3" /> Add Drive</Button>
      </div>

      {showForm && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-2">
          <Input placeholder="Drive name (e.g., Shared Docs)" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Input placeholder="Path (e.g., /Volumes/SharedDrive)" value={form.path} onChange={(e) => setForm((f) => ({ ...f, path: e.target.value }))} />
          <Input placeholder="Description (optional)" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={() => addMut.mutate()} disabled={!form.name || !form.path}>Add</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {drives?.map((d) => (
          <div key={d.id} className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 p-3">
            <div className="flex items-center gap-3">
              <FolderOpen className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-sm font-medium">{d.name}</div>
                <div className="text-xs text-gray-500">{d.path}</div>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => removeMut.mutate(d.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {!drives?.length && !showForm && (
          <p className="text-sm text-gray-400 text-center py-6">No drives configured yet</p>
        )}
      </div>
    </div>
  );
}
