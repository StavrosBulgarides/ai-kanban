import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Pencil, Zap } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { fetchSkills, createSkill, updateSkill, deleteSkill } from '@/api/skills';
import { fetchIntegrations } from '@/api/integrations';

export function SkillSettings() {
  const qc = useQueryClient();
  const { data: skills } = useQuery({ queryKey: ['skills', {}], queryFn: () => fetchSkills() });
  const { data: integrations } = useQuery({ queryKey: ['integrations'], queryFn: fetchIntegrations });
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', description: '', prompt_template: '', integration_ids: [] as string[], config: '{}',
  });

  const resetForm = () => {
    setShowForm(false); setEditId(null);
    setForm({ name: '', description: '', prompt_template: '', integration_ids: [], config: '{}' });
  };

  const saveMut = useMutation({
    mutationFn: () => editId
      ? updateSkill(editId, { ...form, integration_ids: form.integration_ids, config: JSON.parse(form.config || '{}') })
      : createSkill({ ...form, integration_ids: form.integration_ids, config: JSON.parse(form.config || '{}') }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['skills'] }); resetForm(); },
  });

  const removeMut = useMutation({
    mutationFn: deleteSkill,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['skills'] }),
  });

  const toggleIntegration = (id: string) => {
    setForm((f) => ({
      ...f,
      integration_ids: f.integration_ids.includes(id) ? f.integration_ids.filter((i) => i !== id) : [...f.integration_ids, id],
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Skills</h3>
          <p className="text-xs text-gray-500">Define reusable AI skills that combine integrations with prompt templates.</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}><Plus className="h-3 w-3" /> Add Skill</Button>
      </div>

      <div className="space-y-2">
        {skills?.map((skill) => (
          <div key={skill.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">{skill.name}</span>
                {skill.project_id ? <Badge>Project</Badge> : skill.work_item_id ? <Badge>Item</Badge> : <Badge color="#8b5cf6">Global</Badge>}
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                  setEditId(skill.id);
                  setForm({
                    name: skill.name, description: skill.description,
                    prompt_template: skill.prompt_template,
                    integration_ids: JSON.parse(skill.integration_ids || '[]'),
                    config: skill.config,
                  });
                  setShowForm(true);
                }}><Pencil className="h-3 w-3" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => removeMut.mutate(skill.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            {skill.description && <p className="text-xs text-gray-500 mt-1">{skill.description}</p>}
          </div>
        ))}
        {!skills?.length && <p className="text-sm text-gray-400 text-center py-6">No skills defined</p>}
      </div>

      <Dialog open={showForm} onOpenChange={(o) => !o && resetForm()}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? 'Edit' : 'Create'} Skill</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Skill name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <Input placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Prompt Template</label>
              <Textarea
                value={form.prompt_template}
                onChange={(e) => setForm((f) => ({ ...f, prompt_template: e.target.value }))}
                placeholder="Use {{variables}} for dynamic content. Available: {{work_item_context}}, {{integration_context}}"
                rows={6}
                className="font-mono text-xs"
              />
            </div>
            {integrations && integrations.length > 0 && (
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Integrations</label>
                <div className="flex flex-wrap gap-1">
                  {integrations.map((int) => (
                    <button
                      key={int.id}
                      onClick={() => toggleIntegration(int.id)}
                      className={`px-2 py-1 text-xs rounded border ${form.integration_ids.includes(int.id) ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                    >
                      {int.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <Input placeholder='Config JSON (optional)' value={form.config} onChange={(e) => setForm((f) => ({ ...f, config: e.target.value }))} className="font-mono text-xs" />
            <div className="flex gap-2">
              <Button onClick={() => saveMut.mutate()} disabled={!form.name || !form.prompt_template}>{editId ? 'Update' : 'Create'}</Button>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
