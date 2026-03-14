import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Pencil, FileText, Check, X, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import {
  fetchPromptTemplates,
  fetchDefaultPrompt,
  createPromptTemplate,
  updatePromptTemplate,
  deletePromptTemplate,
  activatePromptTemplate,
  deactivateAllPromptTemplates,
} from '@/api/promptTemplates';

export function PromptTemplateSettings() {
  const qc = useQueryClient();
  const { data: templates } = useQuery({
    queryKey: ['promptTemplates'],
    queryFn: () => fetchPromptTemplates(),
  });
  const { data: defaultPrompt } = useQuery({
    queryKey: ['promptTemplates', 'default'],
    queryFn: () => fetchDefaultPrompt(),
  });
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '', template: '' });
  const [showDefault, setShowDefault] = useState(false);

  const resetForm = () => {
    setShowForm(false);
    setEditId(null);
    setForm({ name: '', description: '', template: '' });
  };

  const saveMut = useMutation({
    mutationFn: () =>
      editId
        ? updatePromptTemplate(editId, form)
        : createPromptTemplate(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['promptTemplates'] });
      resetForm();
    },
  });

  const removeMut = useMutation({
    mutationFn: deletePromptTemplate,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promptTemplates'] }),
  });

  const activateMut = useMutation({
    mutationFn: activatePromptTemplate,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promptTemplates'] }),
  });

  const deactivateMut = useMutation({
    mutationFn: deactivateAllPromptTemplates,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promptTemplates'] }),
  });

  const anyActive = templates?.some((t) => t.is_active) ?? false;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Prompt Templates</h3>
          <p className="text-xs text-gray-500">
            Customise the system prompt that shapes how the AI agent behaves. Activate one to replace the default.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="h-3 w-3" /> New Template
        </Button>
      </div>

      {/* Default prompt disclosure */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700">
        <button
          className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
          onClick={() => setShowDefault((v) => !v)}
        >
          {showDefault ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          <span>Default system prompt</span>
          {!anyActive && <Badge color="#22c55e">In use</Badge>}
        </button>
        {showDefault && defaultPrompt && (
          <div className="px-3 pb-3">
            <pre className="text-xs font-mono text-gray-600 dark:text-gray-400 whitespace-pre-wrap bg-gray-50 dark:bg-gray-900 rounded p-3 max-h-96 overflow-auto">
              {defaultPrompt.template}
            </pre>
          </div>
        )}
      </div>

      {/* User templates */}
      <div className="space-y-2">
        {templates?.map((tmpl) => (
          <div
            key={tmpl.id}
            className={`rounded-lg border p-3 ${
              tmpl.is_active
                ? 'border-green-400 bg-green-50 dark:bg-green-950/20 dark:border-green-700'
                : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">{tmpl.name}</span>
                {tmpl.is_active ? (
                  <Badge color="#22c55e">Active</Badge>
                ) : (
                  tmpl.project_id ? <Badge>Project</Badge> : <Badge color="#6b7280">Global</Badge>
                )}
              </div>
              <div className="flex gap-1">
                {tmpl.is_active ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-gray-500"
                    onClick={() => deactivateMut.mutate()}
                  >
                    <X className="h-3 w-3" /> Deactivate
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-green-600"
                    onClick={() => activateMut.mutate(tmpl.id)}
                  >
                    <Check className="h-3 w-3" /> Activate
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    setEditId(tmpl.id);
                    setForm({
                      name: tmpl.name,
                      description: tmpl.description,
                      template: tmpl.template,
                    });
                    setShowForm(true);
                  }}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-500"
                  onClick={() => removeMut.mutate(tmpl.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            {tmpl.description ? (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{tmpl.description}</p>
            ) : null}
            {tmpl.is_active ? (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                This template is currently used as the system prompt for all agent runs.
              </p>
            ) : null}
          </div>
        ))}
        {!templates?.length && (
          <p className="text-sm text-gray-400 text-center py-4">
            No custom templates yet. The default system prompt is in use.
          </p>
        )}
      </div>

      {templates && templates.length > 0 && !anyActive ? (
        <p className="text-xs text-gray-400 italic">
          No template is active — the built-in default prompt is in use.
        </p>
      ) : null}

      <Dialog open={showForm} onOpenChange={(o) => !o && resetForm()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editId ? 'Edit' : 'Create'} Prompt Template
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Template name (e.g. Terse Analyst)"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <div>
              <Input
                placeholder="Short description (optional)"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
              {form.description.length > 120 ? (
                <p className="text-xs text-amber-500 mt-1">Long descriptions will be truncated in the list view.</p>
              ) : null}
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                System Prompt
              </label>
              <Textarea
                value={form.template}
                onChange={(e) =>
                  setForm((f) => ({ ...f, template: e.target.value }))
                }
                placeholder="Write the full system prompt the agent should follow. This replaces the built-in default prompt when activated."
                rows={16}
                className="font-mono text-xs"
              />
              <p className="text-xs text-gray-400 mt-1">
                Tip: include a STATUS PROTOCOL section with [DONE] and [INPUT_REQUIRED] directives so the agent can transition tasks on the board.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => saveMut.mutate()}
                disabled={!form.name || !form.template}
              >
                {editId ? 'Update' : 'Create'}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
