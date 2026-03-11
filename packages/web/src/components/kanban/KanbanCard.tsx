import { Badge } from '@/components/ui/Badge';
import { PRIORITY_COLORS } from '@/lib/utils';
import type { WorkItem } from '@/types/models';

interface KanbanCardProps {
  item: WorkItem;
  onClick: () => void;
}

export function KanbanCard({ item, onClick }: KanbanCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-start gap-2">
        {item.priority !== 'none' && (
          <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${PRIORITY_COLORS[item.priority]}`} />
        )}
        <span className="text-sm font-medium leading-snug">{item.title}</span>
      </div>
      {item.description && (
        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description}</p>
      )}
    </div>
  );
}
