import { useParams } from 'react-router-dom';
import { useProject } from '@/hooks/useProjects';
import { Header } from '@/components/layout/Header';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { ListView } from '@/components/list/ListView';
import { WorkItemDetail } from '@/components/detail/WorkItemDetail';
import { useUIStore } from '@/stores/uiStore';

export function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project } = useProject(projectId!);
  const viewMode = useUIStore((s) => s.viewMode);
  const selectedWorkItemId = useUIStore((s) => s.selectedWorkItemId);
  const setSelectedWorkItemId = useUIStore((s) => s.setSelectedWorkItemId);

  if (!projectId) return null;

  return (
    <>
      <Header project={project} />
      <div className="flex flex-1 overflow-hidden relative">
        {viewMode === 'kanban' ? (
          <KanbanBoard projectId={projectId} />
        ) : (
          <ListView projectId={projectId} />
        )}
        {selectedWorkItemId && (
          <>
            <div className="absolute inset-0 z-10" onClick={() => setSelectedWorkItemId(null)} />
            <div className="relative z-20 flex flex-shrink-0">
              <WorkItemDetail projectId={projectId} />
            </div>
          </>
        )}
      </div>
    </>
  );
}
