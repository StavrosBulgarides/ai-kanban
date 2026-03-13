import { useState, useRef, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Plus, FolderKanban, Settings, ChevronLeft, ChevronRight, Trash2, Pencil, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useProjects, useCreateProject, useDeleteProject, useUpdateProject, useProjectIndicators } from '@/hooks/useProjects';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/uiStore';

export function Sidebar() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { data: projects } = useProjects();
  const { data: indicators } = useProjectIndicators();
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();
  const updateProject = useUpdateProject();
  const [newName, setNewName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const handleCreate = () => {
    if (!newName.trim()) return;
    createProject.mutate({ name: newName.trim() }, {
      onSuccess: (project) => {
        setNewName('');
        setShowCreate(false);
        navigate(`/projects/${project.id}`);
      },
      onError: (err) => {
        console.error('Failed to create project:', err);
      },
    });
  };

  const handleDelete = (id: string) => {
    deleteProject.mutate(id, {
      onSuccess: () => {
        setConfirmDeleteId(null);
        if (projectId === id) {
          navigate('/projects');
        }
      },
    });
  };

  const startEditing = (id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
    setConfirmDeleteId(null);
  };

  const handleRename = () => {
    if (!editingId || !editName.trim()) {
      setEditingId(null);
      return;
    }
    updateProject.mutate({ id: editingId, name: editName.trim() });
    setEditingId(null);
  };

  return (
    <aside className={cn('flex flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 transition-all', sidebarOpen ? 'w-60' : 'w-12')}>
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-800">
        {sidebarOpen && <span className="font-semibold text-sm">Projects</span>}
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="h-7 w-7">
          {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>

      {sidebarOpen && (
        <>
          <nav className="flex-1 overflow-y-auto p-2 space-y-1">
            {projects?.map((p) => (
              <div key={p.id} className="group relative">
                {confirmDeleteId === p.id ? (
                  <div className="rounded-md border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-2">
                    <p className="text-xs text-red-600 dark:text-red-400 mb-1.5">Delete "{p.name}" and all its items?</p>
                    <div className="flex gap-1">
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(p.id)} className="text-xs h-6 px-2">Delete</Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmDeleteId(null)} className="text-xs h-6 px-2">Cancel</Button>
                    </div>
                  </div>
                ) : editingId === p.id ? (
                  <div className="px-1 py-0.5">
                    <Input
                      ref={editInputRef}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename();
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      onBlur={handleRename}
                      className="h-7 text-sm"
                    />
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Link
                      to={`/projects/${p.id}`}
                      onDoubleClick={(e) => { e.preventDefault(); startEditing(p.id, p.name); }}
                      className={cn(
                        'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex-1 min-w-0',
                        projectId === p.id && 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                      )}
                    >
                      <FolderKanban className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{p.name}</span>
                      {indicators?.[p.id]?.hasInputRequired ? (
                        <AlertCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                      ) : indicators?.[p.id]?.allDone ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                      ) : null}
                    </Link>
                    <button
                      onClick={() => startEditing(p.id, p.name)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 flex-shrink-0"
                    >
                      <Pencil className="h-3.5 w-3.5 text-gray-500" />
                    </button>
                    <button
                      onClick={(e) => { e.preventDefault(); setConfirmDeleteId(p.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 flex-shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </button>
                  </div>
                )}
              </div>
            ))}

            {showCreate ? (
              <div className="p-1">
                <Input
                  placeholder="Project name..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  autoFocus
                />
                <div className="flex gap-1 mt-1">
                  <Button size="sm" onClick={handleCreate} disabled={!newName.trim()}>Create</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <Plus className="h-4 w-4" /> New Project
              </button>
            )}
          </nav>

          <div className="border-t border-gray-200 dark:border-gray-800 p-2">
            <Link
              to="/settings"
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <Settings className="h-4 w-4" /> Settings
            </Link>
          </div>
        </>
      )}
    </aside>
  );
}
