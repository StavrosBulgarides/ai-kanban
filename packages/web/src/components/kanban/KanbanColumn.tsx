import { useState } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus } from 'lucide-react';
import { KanbanCard } from './KanbanCard';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import type { Status, WorkItem } from '@/types/models';

interface KanbanColumnProps {
  status: Status;
  items: WorkItem[];
  onAddCard: (statusId: string, title: string) => void;
  onCardClick: (id: string) => void;
}

export function KanbanColumn({ status, items, onAddCard, onCardClick }: KanbanColumnProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const handleSubmit = () => {
    if (!newTitle.trim()) return;
    onAddCard(status.id, newTitle.trim());
    setNewTitle('');
    setIsAdding(false);
  };

  return (
    <div className="flex flex-col w-72 flex-shrink-0 max-h-full">
      <div className="flex items-center justify-between px-2 py-1.5 mb-2">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: status.color }} />
          <span className="font-medium text-sm">{status.name}</span>
          <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 rounded-full px-1.5 py-0.5">
            {items.length}
          </span>
        </div>
        <button onClick={() => setIsAdding(true)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
          <Plus className="h-4 w-4 text-gray-500" />
        </button>
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
            {items.map((item, index) => (
              <Draggable key={item.id} draggableId={item.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={cn(snapshot.isDragging && 'opacity-90')}
                  >
                    <KanbanCard item={item} onClick={() => onCardClick(item.id)} />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}

            {isAdding && (
              <div className="p-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <Input
                  placeholder="Card title..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSubmit();
                    if (e.key === 'Escape') setIsAdding(false);
                  }}
                  onBlur={() => { if (!newTitle.trim()) setIsAdding(false); }}
                  autoFocus
                />
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}
