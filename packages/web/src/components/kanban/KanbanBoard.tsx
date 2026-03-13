import { useCallback, useMemo } from 'react';
import { DragDropContext, Droppable, type DropResult } from '@hello-pangea/dnd';
import { KanbanColumn } from './KanbanColumn';
import { useWorkItems, useCreateWorkItem, useBulkUpdateWorkItems, useDeleteWorkItem } from '@/hooks/useWorkItems';
import { useStatuses } from '@/hooks/useStatuses';
import { useFilteredWorkItems } from '@/hooks/useFilteredWorkItems';
import { useUIStore } from '@/stores/uiStore';
import { runAgent } from '@/api/skills';
import type { Status, WorkItem } from '@/types/models';

interface KanbanBoardProps {
  projectId: string;
}

// Allowed USER drag transitions (agent handles In Progress → Input Required / Done)
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  'Backlog': ['In Progress'],
  'In Progress': ['Backlog', 'Input Required'],
  'Input Required': ['In Progress', 'Done', 'Backlog'],
};

export function KanbanBoard({ projectId }: KanbanBoardProps) {
  const { data: statuses } = useStatuses(projectId);
  const { data: workItems } = useWorkItems(projectId);
  const createItem = useCreateWorkItem(projectId);
  const deleteItem = useDeleteWorkItem(projectId);
  const bulkUpdate = useBulkUpdateWorkItems(projectId);
  const filteredItems = useFilteredWorkItems(workItems);
  const setSelectedWorkItemId = useUIStore((s) => s.setSelectedWorkItemId);

  const visibleStatuses = (statuses || []).filter((s) => !s.is_hidden).sort((a, b) => a.sort_order - b.sort_order);

  // Items needing attention: all items in Input Required
  const attentionItemIds = useMemo(() => {
    const ids = new Set<string>();
    const inputRequiredStatus = visibleStatuses.find(s => s.name === 'Input Required');
    if (inputRequiredStatus) {
      filteredItems.filter(i => i.status_id === inputRequiredStatus.id).forEach(i => ids.add(i.id));
    }
    return ids;
  }, [filteredItems, visibleStatuses]);

  const getStatusById = useCallback(
    (id: string) => visibleStatuses.find((s) => s.id === id),
    [visibleStatuses]
  );

  const getItemsForStatus = useCallback(
    (statusId: string) => {
      const items = filteredItems.filter((i) => i.status_id === statusId);
      const status = getStatusById(statusId);
      // Sort Done items: unviewed first (by recency), then viewed (by recency)
      if (status?.name === 'Done') {
        const byRecency = (a: WorkItem, b: WorkItem) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        const unviewed = items.filter(i => !i.viewed_output_at).sort(byRecency);
        const viewed = items.filter(i => !!i.viewed_output_at).sort(byRecency);
        return [...unviewed, ...viewed];
      }
      return items;
    },
    [filteredItems, getStatusById]
  );

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;

      const { source, destination, draggableId } = result;
      const sourceStatusId = source.droppableId;
      const destStatusId = destination.droppableId;

      // Validate transition if moving across columns
      if (sourceStatusId !== destStatusId) {
        const sourceStatus = getStatusById(sourceStatusId);
        const destStatus = getStatusById(destStatusId);
        if (!sourceStatus || !destStatus) return;

        const allowed = ALLOWED_TRANSITIONS[sourceStatus.name];
        if (!allowed || !allowed.includes(destStatus.name)) {
          return; // Disallow this transition
        }
      }

      // Build new ordering
      const sourceItems = getItemsForStatus(sourceStatusId).filter((i) => i.id !== draggableId);
      const destItems = sourceStatusId === destStatusId ? sourceItems : getItemsForStatus(destStatusId);
      const movedItem = filteredItems.find((i) => i.id === draggableId);
      if (!movedItem) return;

      // Insert at destination index
      const newDestItems = [...destItems];
      newDestItems.splice(destination.index, 0, movedItem);

      // Calculate sort orders with gaps
      const updates: Array<{ id: string; status_id?: string; sort_order: number }> = [];
      newDestItems.forEach((item, index) => {
        updates.push({
          id: item.id,
          status_id: destStatusId,
          sort_order: index * 1000,
        });
      });

      // If cross-column, also reorder source
      if (sourceStatusId !== destStatusId) {
        sourceItems.forEach((item, index) => {
          updates.push({ id: item.id, sort_order: index * 1000 });
        });
      }

      bulkUpdate.mutate(updates);

      // Trigger agent when moving to In Progress
      if (sourceStatusId !== destStatusId) {
        const sourceStatus = getStatusById(sourceStatusId);
        const destStatus = getStatusById(destStatusId);

        if (destStatus?.name === 'In Progress') {
          if (sourceStatus?.name === 'Backlog') {
            // New task — start agent
            runAgent({
              prompt: `Work on this task. Review all attached files, integration data, and skills. Complete the task described below.`,
              work_item_id: draggableId,
            }).catch((err) => {
              console.error('Failed to start agent for work item:', err);
            });
          } else if (sourceStatus?.name === 'Input Required') {
            // User provided more info — resume agent with updated context
            runAgent({
              prompt: `The user has provided additional information or revised instructions for this task. Review the work item description and any recent updates, then continue working on the task.`,
              work_item_id: draggableId,
            }).catch((err) => {
              console.error('Failed to resume agent for work item:', err);
            });
          }
        }
      }
    },
    [filteredItems, getItemsForStatus, getStatusById, bulkUpdate]
  );

  const handleAddCard = useCallback(
    (statusId: string) => {
      createItem.mutate({ status_id: statusId }, {
        onSuccess: (newItem) => {
          setSelectedWorkItemId(newItem.id);
        },
      });
    },
    [createItem, setSelectedWorkItemId]
  );

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 p-4 overflow-x-auto flex-1 items-start">
        {visibleStatuses.map((status) => (
          <KanbanColumn
            key={status.id}
            status={status}
            items={getItemsForStatus(status.id)}
            canAdd={status.name === 'Backlog'}
            onAddCard={handleAddCard}
            onCardClick={setSelectedWorkItemId}
            onDeleteCard={status.name === 'Done' ? (id) => deleteItem.mutate({ id }) : undefined}
            attentionItemIds={attentionItemIds}
          />
        ))}
      </div>
    </DragDropContext>
  );
}
