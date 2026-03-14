import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Trash2, LogIn, LogOut, Copy, Maximize2, Minimize2, MessageCircle, FileText, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { FileReferencesPanel } from './FileReferencesPanel';
import { SkillsPanel } from './SkillsPanel';
import { ToolPermissionsPanel } from './ToolPermissionsPanel';
import { ClarificationPanel } from './ClarificationPanel';
import { useUIStore } from '@/stores/uiStore';
import { useUpdateWorkItem, useDeleteWorkItem } from '@/hooks/useWorkItems';
import { useStatuses } from '@/hooks/useStatuses';
import { cn } from '@/lib/utils';
import type { WorkItem } from '@/types/models';
import { fetchWorkItem } from '@/api/workItems';
import { fetchFileReferences, openFile, revealFile } from '@/api/drives';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { saveWorkItemAsTemplate } from '@/api/templates';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';

interface WorkItemDetailProps {
  projectId: string;
}

function formatElapsed(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function InProgressTimer({ since }: { since: string }) {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    const start = new Date(since).getTime();
    const tick = () => setElapsed(formatElapsed(Date.now() - start));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [since]);

  return (
    <span className="text-xs text-amber-600 dark:text-amber-400 font-mono tabular-nums">
      {elapsed}
    </span>
  );
}

export function WorkItemDetail({ projectId }: WorkItemDetailProps) {
  const selectedId = useUIStore((s) => s.selectedWorkItemId);
  const setSelectedId = useUIStore((s) => s.setSelectedWorkItemId);
  const updateItem = useUpdateWorkItem(projectId);
  const deleteItem = useDeleteWorkItem(projectId);
  const { data: statuses } = useStatuses(projectId);
  const [activeTab, setActiveTab] = useState<'in' | 'chat' | 'out'>('in');
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteFiles, setDeleteFiles] = useState(false);

  // Resizable panel state
  const [panelWidth, setPanelWidth] = useState(() => Math.max(480, Math.floor(window.innerWidth * 0.5)));
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const savedWidth = useRef(panelWidth);

  const { data: item } = useQuery({
    queryKey: ['work-item', selectedId],
    queryFn: () => fetchWorkItem(selectedId!),
    enabled: !!selectedId,
  });

  const [form, setForm] = useState({ title: '', description: '' });

  // Auto-switch tab based on item status
  useEffect(() => {
    if (!selectedId || !item || !statuses) return;
    const status = statuses.find(s => s.id === item.status_id);
    if (status?.name === 'Input Required') {
      setActiveTab('chat');
    } else if (status?.name === 'Done') {
      setActiveTab('out');
    } else {
      setActiveTab('in');
    }
  }, [selectedId, item?.status_id]);

  useEffect(() => {
    if (item) {
      setForm({ title: item.title, description: item.description });
    }
  }, [item]);

  // Mark output as viewed when user views the Out tab on a Done item
  useEffect(() => {
    if (!selectedId || !item || !statuses || activeTab !== 'out') return;
    const status = statuses.find(s => s.id === item.status_id);
    if (status?.name === 'Done' && !item.viewed_output_at) {
      updateItem.mutate({ id: selectedId, viewed_output_at: new Date().toISOString() });
    }
  }, [selectedId, activeTab, item?.status_id, item?.viewed_output_at]);

  const qc = useQueryClient();
  const handleSave = useCallback(() => {
    if (!selectedId) return;
    updateItem.mutate({ id: selectedId, ...form }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: ['work-item', selectedId] }),
    });
  }, [selectedId, form, updateItem, qc]);

  // File references for delete dialog
  const { data: fileRefs } = useQuery({
    queryKey: ['file-references', selectedId],
    queryFn: () => fetchFileReferences(selectedId!),
    enabled: !!selectedId,
  });
  const outputFiles = (fileRefs || []).filter(f => f.ref_type === 'output');

  const handleDeleteClick = useCallback(() => {
    if (!selectedId) return;
    if (outputFiles.length > 0) {
      setDeleteFiles(false);
      setShowDeleteDialog(true);
    } else {
      deleteItem.mutate({ id: selectedId });
      setSelectedId(null);
    }
  }, [selectedId, outputFiles.length, deleteItem, setSelectedId]);

  const handleConfirmDelete = useCallback(() => {
    if (!selectedId) return;
    deleteItem.mutate({ id: selectedId, deleteFiles });
    setShowDeleteDialog(false);
    setSelectedId(null);
  }, [selectedId, deleteFiles, deleteItem, setSelectedId]);

  const handleSaveAsTemplate = useCallback(() => {
    if (!selectedId || !templateName.trim()) return;
    saveWorkItemAsTemplate(selectedId, { name: templateName.trim() }).then(() => {
      setShowTemplateDialog(false);
      setTemplateName('');
    });
  }, [selectedId, templateName]);

  // Resize drag handling
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = panelWidth;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = startX - e.clientX;
      const newWidth = Math.max(320, Math.min(window.innerWidth - 200, startWidth + delta));
      setPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [panelWidth]);

  const toggleFullscreen = useCallback(() => {
    if (isFullscreen) {
      setPanelWidth(savedWidth.current);
      setIsFullscreen(false);
    } else {
      savedWidth.current = panelWidth;
      setIsFullscreen(true);
    }
  }, [isFullscreen, panelWidth]);

  if (!selectedId) return null;

  const currentStatus = statuses?.find((s) => s.id === item?.status_id);
  const isInProgress = currentStatus?.name === 'In Progress';

  const tabs = [
    { id: 'in' as const, label: 'Define', icon: LogIn },
    { id: 'chat' as const, label: 'Chat', icon: MessageCircle },
    { id: 'out' as const, label: 'Deliver', icon: LogOut },
  ];

  return (
    <>
      <div
        className={cn(
          'border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex flex-col overflow-hidden flex-shrink-0',
          isFullscreen && 'absolute inset-0 z-50 border-l-0'
        )}
        style={isFullscreen ? undefined : { width: panelWidth }}
      >
        {/* Resize handle */}
        {!isFullscreen && (
          <div
            onMouseDown={handleMouseDown}
            className={cn(
              'absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-400/50 transition-colors z-10',
              isResizing && 'bg-blue-500/50'
            )}
          />
        )}

        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Work Item</span>
            {isInProgress && item?.in_progress_since && (
              <InProgressTimer since={item.in_progress_since} />
            )}
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowTemplateDialog(true)} title="Save as Template">
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={handleDeleteClick} title="Delete">
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
          {activeTab === 'in' && (
            <>
              <textarea
                value={form.title}
                onChange={(e) => {
                  setForm((f) => ({ ...f, title: e.target.value }));
                  // Auto-resize
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
                placeholder="Title (optional — AI will generate if left blank)"
                rows={1}
                className="w-full font-medium text-sm resize-none overflow-hidden rounded-md border border-gray-200 dark:border-gray-800 bg-transparent px-3 py-2 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Task"
                rows={6}
              />

              {/* Files (read-only) */}
              {selectedId && (
                <div className="border-t border-gray-200 dark:border-gray-800 pt-3">
                  <FileReferencesPanel workItemId={selectedId} projectId={projectId} />
                </div>
              )}

              {/* Skills */}
              {selectedId && (
                <div className="border-t border-gray-200 dark:border-gray-800 pt-3">
                  <SkillsPanel workItemId={selectedId} projectId={projectId} />
                </div>
              )}

              {/* Tool Permissions */}
              {selectedId && item && (
                <div className="border-t border-gray-200 dark:border-gray-800 pt-3">
                  <ToolPermissionsPanel workItem={item} projectId={projectId} />
                </div>
              )}

              <Button onClick={handleSave} size="sm" className="w-full">Save Changes</Button>
            </>
          )}
          {activeTab === 'chat' && selectedId && <ClarificationPanel workItemId={selectedId} projectId={projectId} />}
          {activeTab === 'out' && selectedId && <OutputPanel workItemId={selectedId} isDone={currentStatus?.name === 'Done'} />}
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

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Work Item</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This work item has {outputFiles.length} generated output file{outputFiles.length !== 1 ? 's' : ''}:
          </p>
          <div className="space-y-1 my-2 max-h-32 overflow-y-auto">
            {outputFiles.map(f => (
              <div key={f.id} className="flex items-center gap-2 text-xs text-gray-500 py-0.5">
                <FileText className="h-3 w-3 flex-shrink-0" />
                <span className="truncate" title={f.path}>{f.path.split('/').pop()}</span>
              </div>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer mt-2">
            <input
              type="checkbox"
              checked={deleteFiles}
              onChange={(e) => setDeleteFiles(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <span className="text-gray-600 dark:text-gray-400">Also delete generated files from disk</span>
          </label>
          <div className="flex gap-2 mt-4">
            <Button variant="destructive" onClick={handleConfirmDelete}>Delete</Button>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function OutputPanel({ workItemId, isDone }: { workItemId: string; isDone: boolean }) {
  const { data: runs } = useQuery({
    queryKey: ['agent-runs', workItemId],
    queryFn: async () => {
      const res = await fetch(`/api/work-items/${workItemId}/agent-runs`);
      return res.json();
    },
    refetchInterval: isDone ? false : 3000,
  });

  const { data: fileRefs } = useQuery({
    queryKey: ['file-references', workItemId],
    queryFn: () => fetchFileReferences(workItemId),
    refetchInterval: isDone ? false : 3000,
  });

  const outputFiles = (fileRefs || []).filter(f => f.ref_type === 'output');

  if (!isDone) {
    return <div className="text-center text-gray-400 text-sm py-4">Task not yet complete</div>;
  }

  // Show only the final completed run (the one that moved the item to Done)
  const completedRuns = (runs || []).filter((r: any) => r.status === 'completed');
  const finalRun = completedRuns[0]; // Most recent (ordered DESC from API)

  if (!finalRun) {
    return <div className="text-center text-gray-400 text-sm py-4">No final output</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
          <div className="flex items-center justify-between mb-1">
            <Badge variant="default">completed</Badge>
            <span className="text-xs text-gray-400">{new Date(finalRun.started_at).toLocaleString()}</span>
          </div>
          {finalRun.session_id && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="text-[10px] text-gray-400 font-mono">Session: {finalRun.session_id}</span>
              <button
                onClick={() => navigator.clipboard.writeText(finalRun.session_id)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                title="Copy session ID"
              >
                <Copy className="h-3 w-3" />
              </button>
            </div>
          )}
          {finalRun.result && (
            <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap mt-2">{finalRun.result}</pre>
          )}
        </div>
      </div>

      {outputFiles.length > 0 && (
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Output Files</h4>
          <div className="space-y-1">
            {outputFiles.map(file => {
              const fileName = file.path.split('/').pop() || file.path;
              const folderPath = file.path.substring(0, file.path.lastIndexOf('/')) || file.path;
              return (
                <div key={file.id} className="flex items-center gap-2 py-1.5 px-2 rounded bg-gray-50 dark:bg-gray-900">
                  <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-medium truncate block" title={file.path}>
                      {file.label || fileName}
                    </span>
                    {file.label && file.label !== fileName && (
                      <span className="text-[10px] text-gray-400 truncate block" title={file.path}>{fileName}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button
                      onClick={() => openFile(file.path)}
                      className="p-1 rounded text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-950"
                      title={`Open ${fileName}`}
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => revealFile(folderPath)}
                      className="p-1 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-800"
                      title="Show in folder"
                    >
                      <FolderOpen className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
