import { useState, useEffect } from 'react';
import { X, AlertCircle, Eye } from 'lucide-react';
import type { WorkItem } from '@/types/models';

interface KanbanCardProps {
  item: WorkItem;
  onClick: () => void;
  onDelete?: () => void;
  needsAttention?: boolean;
  isInProgress?: boolean;
  isDone?: boolean;
}

function formatElapsed(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function CardTimer({ since }: { since: string }) {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    const start = new Date(since).getTime();
    const tick = () => setElapsed(formatElapsed(Date.now() - start));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [since]);

  return (
    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono tabular-nums">
      {elapsed}
    </span>
  );
}

export function KanbanCard({ item, onClick, onDelete, needsAttention, isInProgress, isDone }: KanbanCardProps) {
  const hasViewedOutput = isDone && !!item.viewed_output_at;

  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
    >
      <div className="flex items-start justify-between gap-1">
        <div className="flex items-center gap-1.5 min-w-0">
          {needsAttention && <AlertCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />}
          <span className={`text-sm font-medium leading-snug truncate ${!item.title ? 'text-gray-400 italic' : ''}`}>{item.title || 'Untitled'}</span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 -mr-1.5">
          {hasViewedOutput && <Eye className="h-4 w-4 text-gray-500" />}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-opacity"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      {item.description && (
        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description}</p>
      )}
      {isInProgress && item.in_progress_since && (
        <div className="mt-1.5">
          <CardTimer since={item.in_progress_since} />
        </div>
      )}
    </div>
  );
}
