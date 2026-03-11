import { useState, useEffect, useCallback } from 'react';
import { X, Save, Trash2, FileText, Zap, History, Copy } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { FileReferencesPanel } from './FileReferencesPanel';
import { SkillsPanel } from './SkillsPanel';
import { useUIStore } from '@/stores/uiStore';
import { useUpdateWorkItem, useDeleteWorkItem } from '@/hooks/useWorkItems';
import { useStatuses } from '@/hooks/useStatuses';
import { cn } from '@/lib/utils';
import type { WorkItem, Priority } from '@/types/models';
import { fetchWorkItem } from '@/api/workItems';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { saveWorkItemAsTemplate } from '@/api/templates';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';

interface WorkItemDetailProps {
  projectId: string;
}

const PRIORITIES: Priority[] = ['urgent', 'high', 'medium', 'low', 'none'];

export function WorkItemDetail({ projectId }: WorkItemDetailProps) {
  const selectedId = useUIStore((s) => s.selectedWorkItemId);
  const setSelectedId = useUIStore((s) => s.setSelectedWorkItemId);
  const updateItem = useUpdateWorkItem(projectId);
  const deleteItem = useDeleteWorkItem(projectId);
  const { data: statuses } = useStatuses(projectId);
  const [activeTab, setActiveTab] = useState<'details' | 'files' | 'skills' | 'history'>('details');
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');

  const { data: item } = useQuery({
    queryKey: ['work-item', selectedId],
    queryFn: () => fetchWorkItem(selectedId!),
    enabled: !!selectedId,
  });

  const [form, setForm] = useState({ title: '', description: '', priority: 'none' as string, status_id: '' });

  useEffect(() => {
    if (item) {
      setForm({ title: item.title, description: item.description, priority: item.priority, status_id: item.status_id });
    }
  }, [item]);

  const qc = useQueryClient();
  const handleSave = useCallback(() => {
    if (!selectedId) return;
    updateItem.mutate({ id: selectedId, ...form }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: ['work-item', selectedId] }),
    });
  }, [selectedId, form, updateItem, qc]);

  const handleDelete = useCallback(() => {
    if (!selectedId) return;
    deleteItem.mutate(selectedId);
    setSelectedId(null);
  }, [selectedId, deleteItem, setSelectedId]);

  const handleSaveAsTemplate = useCallback(() => {
    if (!selectedId || !templateName.trim()) return;
    saveWorkItemAsTemplate(selectedId, { name: templateName.trim() }).then(() => {
      setShowTemplateDialog(false);
      setTemplateName('');
    });
  }, [selectedId, templateName]);

  if (!selectedId) return null;

  const tabs = [
    { id: 'details' as const, label: 'Details', icon: FileText },
    { id: 'files' as const, label: 'Files', icon: FileText },
    { id: 'skills' as const, label: 'Skills', icon: Zap },
    { id: 'history' as const, label: 'History', icon: History },
  ];

  return (
    <>
      <div className="w-96 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-800">
          <span className="text-sm font-semibold">Work Item</span>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowTemplateDialog(true)} title="Save as Template">
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSave} title="Save">
              <Save className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={handleDelete} title="Delete">
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedId(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex border-b border-gray-200 dark:border-gray-800">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 py-2 text-xs font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {activeTab === 'details' && (
            <>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Title"
                className="font-medium"
              />
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Description..."
                rows={6}
              />
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Priority</label>
                <div className="flex gap-1">
                  {PRIORITIES.map((p) => (
                    <button
                      key={p}
                      onClick={() => setForm((f) => ({ ...f, priority: p }))}
                      className={cn(
                        'px-2 py-1 text-xs rounded capitalize',
                        form.priority === p
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                          : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Status</label>
                <select
                  value={form.status_id}
                  onChange={(e) => setForm((f) => ({ ...f, status_id: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
                >
                  {statuses?.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <Button onClick={handleSave} size="sm" className="w-full">Save Changes</Button>
            </>
          )}
          {activeTab === 'files' && selectedId && <FileReferencesPanel workItemId={selectedId} />}
          {activeTab === 'skills' && selectedId && <SkillsPanel workItemId={selectedId} projectId={projectId} />}
          {activeTab === 'history' && selectedId && <AgentHistory workItemId={selectedId} />}
        </div>
      </div>

      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Template name..."
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveAsTemplate()}
          />
          <div className="flex gap-2 mt-3">
            <Button onClick={handleSaveAsTemplate} disabled={!templateName.trim()}>Save Template</Button>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AgentHistory({ workItemId }: { workItemId: string }) {
  const { data: runs } = useQuery({
    queryKey: ['agent-runs', workItemId],
    queryFn: async () => {
      const res = await fetch(`/api/work-items/${workItemId}/agent-runs`);
      return res.json();
    },
  });

  if (!runs?.length) return <div className="text-center text-gray-400 text-sm py-4">No agent runs yet</div>;

  return (
    <div className="space-y-3">
      {runs.map((run: any) => (
        <div key={run.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
          <div className="flex items-center justify-between mb-1">
            <Badge variant={run.status === 'completed' ? 'default' : 'outline'}>{run.status}</Badge>
            <span className="text-xs text-gray-400">{new Date(run.started_at).toLocaleString()}</span>
          </div>
          {run.result && (
            <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap mt-2 max-h-40 overflow-y-auto">{run.result}</pre>
          )}
        </div>
      ))}
    </div>
  );
}
