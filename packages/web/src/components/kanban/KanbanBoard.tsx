import { useCallback } from 'react';
import { DragDropContext, Droppable, type DropResult } from '@hello-pangea/dnd';
import { KanbanColumn } from './KanbanColumn';
import { useWorkItems, useCreateWorkItem, useBulkUpdateWorkItems } from '@/hooks/useWorkItems';
import { useStatuses } from '@/hooks/useStatuses';
import { useFilteredWorkItems } from '@/hooks/useFilteredWorkItems';
import { useUIStore } from '@/stores/uiStore';
import type { Status, WorkItem } from '@/types/models';

interface KanbanBoardProps {
  projectId: string;
}

export function KanbanBoard({ projectId }: KanbanBoardProps) {
  const { data: statuses } = useStatuses(projectId);
  const { data: workItems } = useWorkItems(projectId);
  const createItem = useCreateWorkItem(projectId);
  const bulkUpdate = useBulkUpdateWorkItems(projectId);
  const filteredItems = useFilteredWorkItems(workItems);
  const setSelectedWorkItemId = useUIStore((s) => s.setSelectedWorkItemId);

  const visibleStatuses = (statuses || []).filter((s) => !s.is_hidden).sort((a, b) => a.sort_order - b.sort_order);

  const getItemsForStatus = useCallback(
    (statusId: string) => filteredItems.filter((i) => i.status_id === statusId),
    [filteredItems]
  );

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;

      const { source, destination, draggableId } = result;
      const sourceStatusId = source.droppableId;
      const destStatusId = destination.droppableId;

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
    },
    [filteredItems, getItemsForStatus, bulkUpdate]
  );

  const handleAddCard = useCallback(
    (statusId: string, title: string) => {
      createItem.mutate({ status_id: statusId, title });
    },
    [createItem]
  );

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 p-4 overflow-x-auto flex-1 items-start">
        {visibleStatuses.map((status) => (
          <KanbanColumn
            key={status.id}
            status={status}
            items={getItemsForStatus(status.id)}
            onAddCard={handleAddCard}
            onCardClick={setSelectedWorkItemId}
          />
        ))}
      </div>
    </DragDropContext>
  );
}
