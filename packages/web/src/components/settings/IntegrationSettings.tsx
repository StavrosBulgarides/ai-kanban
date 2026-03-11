import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, CheckCircle, XCircle, RefreshCw, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { fetchIntegrations, createIntegration, deleteIntegration, testIntegration, updateIntegration } from '@/api/integrations';

const AUTH_TYPES = ['pat', 'api_key', 'bearer'] as const;
const INTEGRATION_TYPES = ['jira', 'aha', 'github', 'custom'] as const;

export function IntegrationSettings() {
  const qc = useQueryClient();
  const { data: integrations } = useQuery({ queryKey: ['integrations'], queryFn: fetchIntegrations });
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; message: string }>>({});
  const [form, setForm] = useState({ name: '', type: 'jira' as string, base_url: '', auth_type: 'pat' as string, auth_token: '', config: '{}', can_write: false });

  const createMut = useMutation({
    mutationFn: () => createIntegration(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['integrations'] }); resetForm(); },
  });

  const updateMut = useMutation({
    mutationFn: () => updateIntegration(editId!, { ...form, auth_token: form.auth_token || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['integrations'] }); resetForm(); },
  });

  const removeMut = useMutation({
    mutationFn: deleteIntegration,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['integrations'] }),
  });

  const resetForm = () => {
    setShowForm(false); setEditId(null);
    setForm({ name: '', type: 'jira', base_url: '', auth_type: 'pat', auth_token: '', config: '{}', can_write: false });
  };

  const handleTest = async (id: string) => {
    setTestResults((r) => ({ ...r, [id]: { ok: false, message: 'Testing...' } }));
    try {
      const result = await testIntegration(id);
      setTestResults((r) => ({ ...r, [id]: result }));
    } catch (e: any) {
      setTestResults((r) => ({ ...r, [id]: { ok: false, message: e.message } }));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Integrations</h3>
          <p className="text-xs text-gray-500">Connect to external systems like Jira, Aha!, GitHub, and custom APIs.</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}><Plus className="h-3 w-3" /> Add Integration</Button>
      </div>

      <div className="space-y-2">
        {integrations?.map((int) => (
          <div key={int.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge>{int.type}</Badge>
                <span className="text-sm font-medium">{int.name}</span>
                {int.can_write === 1 && <Badge color="#22c55e">writable</Badge>}
                {int.is_active === 0 && <Badge color="#ef4444">inactive</Badge>}
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleTest(int.id)} title="Test">
                  <RefreshCw className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                  setEditId(int.id);
                  setForm({ name: int.name, type: int.type, base_url: int.base_url, auth_type: int.auth_type, auth_token: '', config: int.config, can_write: int.can_write === 1 });
                  setShowForm(true);
                }} title="Edit">
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => removeMut.mutate(int.id)} title="Delete">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-1">{int.base_url} &middot; {int.auth_type} &middot; {int.auth_token_masked}</div>
            {testResults[int.id] && (
              <div className={`flex items-center gap-1 mt-1 text-xs ${testResults[int.id].ok ? 'text-green-600' : 'text-red-500'}`}>
                {testResults[int.id].ok ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                {testResults[int.id].message}
              </div>
            )}
          </div>
        ))}
        {!integrations?.length && <p className="text-sm text-gray-400 text-center py-6">No integrations configured</p>}
      </div>

      <Dialog open={showForm} onOpenChange={(o) => !o && resetForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit' : 'Add'} Integration</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900">
              {INTEGRATION_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
            <Input placeholder="Base URL (e.g., https://myorg.atlassian.net)" value={form.base_url} onChange={(e) => setForm((f) => ({ ...f, base_url: e.target.value }))} />
            <select value={form.auth_type} onChange={(e) => setForm((f) => ({ ...f, auth_type: e.target.value }))}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900">
              {AUTH_TYPES.map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
            </select>
            <Input type="password" placeholder={editId ? "New token (leave blank to keep)" : "Auth token / API key"} value={form.auth_token} onChange={(e) => setForm((f) => ({ ...f, auth_token: e.target.value }))} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.can_write} onChange={(e) => setForm((f) => ({ ...f, can_write: e.target.checked }))} className="rounded" />
              Allow write access (create/update items in this system)
            </label>
            <Input placeholder='Extra config JSON (e.g., {"repo":"owner/repo"})' value={form.config} onChange={(e) => setForm((f) => ({ ...f, config: e.target.value }))} />
            <div className="flex gap-2">
              <Button onClick={() => editId ? updateMut.mutate() : createMut.mutate()} disabled={!form.name || (!editId && !form.auth_token)}>
                {editId ? 'Update' : 'Create'}
              </Button>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
