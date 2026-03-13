import { useState } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, Eye, EyeOff } from 'lucide-react';
import { KanbanCard } from './KanbanCard';
import { cn } from '@/lib/utils';
import type { Status, WorkItem } from '@/types/models';

interface KanbanColumnProps {
  status: Status;
  items: WorkItem[];
  canAdd?: boolean;
  onAddCard: (statusId: string) => void;
  onCardClick: (id: string) => void;
  onDeleteCard?: (id: string) => void;
  attentionItemIds?: Set<string>;
}

export function KanbanColumn({ status, items, canAdd = false, onAddCard, onCardClick, onDeleteCard, attentionItemIds }: KanbanColumnProps) {
  const [hideViewed, setHideViewed] = useState(false);
  const isDone = status.name === 'Done';

  // For the Done column, split into unviewed and viewed
  const unviewedItems = isDone ? items.filter(i => !i.viewed_output_at) : items;
  const viewedItems = isDone ? items.filter(i => !!i.viewed_output_at) : [];

  // Items to render in the droppable (respecting the filter)
  const displayItems = isDone
    ? (hideViewed ? unviewedItems : items)
    : items;

  // Count for the badge — show total, but indicate unviewed count when filtered
  const countLabel = isDone && hideViewed
    ? `${unviewedItems.length}`
    : `${items.length}`;

  return (
    <div className="flex flex-col w-72 flex-shrink-0 max-h-full">
      <div className="flex items-center justify-between pl-2 pr-7 py-1.5 mb-2">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: status.color }} />
          <span className="font-medium text-sm">{status.name}</span>
          <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 rounded-full px-1.5 py-0.5">
            {countLabel}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {isDone && (
            <button
              onClick={() => setHideViewed(h => !h)}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              title={hideViewed ? 'Show viewed items' : 'Hide viewed items'}
            >
              {hideViewed
                ? <EyeOff className="h-4 w-4 text-gray-500" />
                : <Eye className="h-4 w-4 text-gray-500" />
              }
            </button>
          )}
          {canAdd && (
            <button onClick={() => onAddCard(status.id)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
              <Plus className="h-4 w-4 text-gray-500" />
            </button>
          )}
        </div>
      </div>

      <Droppable droppableId={status.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              'flex-1 overflow-y-auto space-y-2 rounded-lg p-1 min-h-[100px]',
              snapshot.isDraggingOver && 'bg-blue-50 dark:bg-blue-950/30'
            )}
          >
            {isDone && !hideViewed ? (
              <>
                {/* Unviewed section */}
                {unviewedItems.map((item, index) => (
                  <Draggable key={item.id} draggableId={item.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={cn(snapshot.isDragging && 'opacity-90')}
                      >
                        <KanbanCard
                          item={item}
                          onClick={() => onCardClick(item.id)}
                          onDelete={onDeleteCard ? () => onDeleteCard(item.id) : undefined}
                          needsAttention={attentionItemIds?.has(item.id)}
                          isInProgress={false}
                          isDone
                        />
                      </div>
                    )}
                  </Draggable>
                ))}

                {/* Separator between unviewed and viewed */}
                {unviewedItems.length > 0 && viewedItems.length > 0 && (
                  <div className="flex items-center gap-2 py-1 px-1">
                    <div className="flex-1 border-t border-gray-300 dark:border-gray-600" />
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider">Viewed</span>
                    <div className="flex-1 border-t border-gray-300 dark:border-gray-600" />
                  </div>
                )}

                {/* Viewed section */}
                {viewedItems.map((item, index) => (
                  <Draggable key={item.id} draggableId={item.id} index={unviewedItems.length + index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={cn(snapshot.isDragging && 'opacity-90')}
                      >
                        <KanbanCard
                          item={item}
                          onClick={() => onCardClick(item.id)}
                          onDelete={onDeleteCard ? () => onDeleteCard(item.id) : undefined}
                          needsAttention={attentionItemIds?.has(item.id)}
                          isInProgress={false}
                          isDone
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
              </>
            ) : (
              /* Non-Done columns, or Done with hideViewed */
              displayItems.map((item, index) => (
                <Draggable key={item.id} draggableId={item.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={cn(snapshot.isDragging && 'opacity-90')}
                    >
                      <KanbanCard
                        item={item}
                        onClick={() => onCardClick(item.id)}
                        onDelete={onDeleteCard ? () => onDeleteCard(item.id) : undefined}
                        needsAttention={attentionItemIds?.has(item.id)}
                        isInProgress={status.name === 'In Progress'}
                        isDone={isDone}
                      />
                    </div>
                  )}
                </Draggable>
              ))
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
