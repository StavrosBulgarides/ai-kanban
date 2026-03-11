import { Link } from 'react-router-dom';
import { FolderKanban, ArrowRight } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { Header } from '@/components/layout/Header';

export function ProjectsPage() {
  const { data: projects } = useProjects();

  return (
    <>
      <Header />
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Your Projects</h2>
          <div className="space-y-3">
            {projects?.map((p) => (
              <Link
                key={p.id}
                to={`/projects/${p.id}`}
                className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FolderKanban className="h-6 w-6 text-blue-500" />
                  <div>
                    <div className="font-medium">{p.name}</div>
                    {p.description && <div className="text-sm text-gray-500">{p.description}</div>}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </Link>
            ))}
            {projects?.length === 0 && (
              <p className="text-center text-gray-400 py-12">
                No projects yet. Create one from the sidebar.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
