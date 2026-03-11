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

  if (!projectId) return null;

  return (
    <>
      <Header project={project} />
      <div className="flex flex-1 overflow-hidden">
        {viewMode === 'kanban' ? (
          <KanbanBoard projectId={projectId} />
        ) : (
          <ListView projectId={projectId} />
        )}
        {selectedWorkItemId && <WorkItemDetail projectId={projectId} />}
      </div>
    </>
  );
}
