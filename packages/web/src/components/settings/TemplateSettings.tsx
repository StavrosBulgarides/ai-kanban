import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Play, Clock, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { fetchTemplates, createTemplate, updateTemplate, deleteTemplate, triggerTemplate } from '@/api/templates';
import type { WorkItemTemplate, WorkItem } from '@/types/models';

export function TemplateSettings() {
  const qc = useQueryClient();
  const { data: templates } = useQuery({ queryKey: ['templates'], queryFn: () => fetchTemplates() });
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', description: '', title: '', itemDescription: '', priority: 'none',
    schedule_cron: '', schedule_enabled: false,
  });

  const resetForm = () => {
    setShowForm(false); setEditId(null);
    setForm({ name: '', description: '', title: '', itemDescription: '', priority: 'none', schedule_cron: '', schedule_enabled: false });
  };

  const saveMut = useMutation({
    mutationFn: () => {
      const data = {
        name: form.name,
        description: form.description,
        template_data: { title: form.title, description: form.itemDescription, priority: form.priority },
        schedule_cron: form.schedule_cron || undefined,
        schedule_enabled: form.schedule_enabled,
      };
      return editId ? updateTemplate(editId, data) : createTemplate(data);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['templates'] }); resetForm(); },
  });

  const removeMut = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  });

  const triggerMut = useMutation({
    mutationFn: triggerTemplate,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Work Item Templates</h3>
          <p className="text-xs text-gray-500">Create reusable templates with optional scheduling to auto-create items.</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}><Plus className="h-3 w-3" /> New Template</Button>
      </div>

      <div className="space-y-2">
        {templates?.map((tmpl) => {
          const data = JSON.parse(tmpl.template_data || '{}');
          return (
            <div key={tmpl.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{tmpl.name}</span>
                  {tmpl.schedule_enabled === 1 && tmpl.schedule_cron && (
                    <Badge color="#f59e0b"><Clock className="h-3 w-3 inline mr-1" />{tmpl.schedule_cron}</Badge>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => triggerMut.mutate(tmpl.id)} title="Trigger now">
                    <Play className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                    setEditId(tmpl.id);
                    setForm({
                      name: tmpl.name, description: tmpl.description,
                      title: data.title || '', itemDescription: data.description || '', priority: data.priority || 'none',
                      schedule_cron: tmpl.schedule_cron || '', schedule_enabled: tmpl.schedule_enabled === 1,
                    });
                    setShowForm(true);
                  }}><Pencil className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => removeMut.mutate(tmpl.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              {tmpl.description && <p className="text-xs text-gray-500 mt-1">{tmpl.description}</p>}
              <p className="text-xs text-gray-400 mt-1">Creates: "{data.title}" ({data.priority || 'none'} priority)</p>
              {tmpl.last_triggered_at && <p className="text-xs text-gray-400">Last triggered: {new Date(tmpl.last_triggered_at).toLocaleString()}</p>}
            </div>
          );
        })}
        {!templates?.length && <p className="text-sm text-gray-400 text-center py-6">No templates defined</p>}
      </div>

      <Dialog open={showForm} onOpenChange={(o) => !o && resetForm()}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? 'Edit' : 'Create'} Template</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Template name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <Input placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            <hr className="border-gray-200 dark:border-gray-700" />
            <p className="text-xs font-medium text-gray-500">Work Item Defaults</p>
            <Input placeholder="Default title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            <Textarea placeholder="Default description" value={form.itemDescription} onChange={(e) => setForm((f) => ({ ...f, itemDescription: e.target.value }))} rows={3} />
            <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900">
              {['none', 'low', 'medium', 'high', 'urgent'].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <hr className="border-gray-200 dark:border-gray-700" />
            <p className="text-xs font-medium text-gray-500">Schedule (Optional)</p>
            <Input placeholder="Cron expression (e.g., 0 9 * * 1 = every Monday 9am)" value={form.schedule_cron} onChange={(e) => setForm((f) => ({ ...f, schedule_cron: e.target.value }))} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.schedule_enabled} onChange={(e) => setForm((f) => ({ ...f, schedule_enabled: e.target.checked }))} className="rounded" />
              Enable automatic scheduling
            </label>
            <div className="flex gap-2">
              <Button onClick={() => saveMut.mutate()} disabled={!form.name}>{editId ? 'Update' : 'Create'}</Button>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
