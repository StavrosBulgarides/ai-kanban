import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Plus, FolderKanban, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { useProjects, useCreateProject } from '@/hooks/useProjects';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/uiStore';

export function Sidebar() {
  const { projectId } = useParams();
  const { data: projects } = useProjects();
  const createProject = useCreateProject();
  const [newName, setNewName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);

  const handleCreate = () => {
    if (!newName.trim()) return;
    createProject.mutate({ name: newName.trim() });
    setNewName('');
    setShowCreate(false);
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
              <Link
                key={p.id}
                to={`/projects/${p.id}`}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800',
                  projectId === p.id && 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                )}
              >
                <FolderKanban className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{p.name}</span>
              </Link>
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
