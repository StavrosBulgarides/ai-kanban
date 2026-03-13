import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Trash2, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { apiGet, apiDelete } from '@/api/client';

interface LogEntry {
  id: number;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  source: string;
  message: string;
  detail?: string;
}

const LEVEL_CONFIG = {
  info: { icon: Info, color: 'text-blue-500', bg: '' },
  warn: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/20' },
  error: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/20' },
};

export function LogSettings() {
  const qc = useQueryClient();
  const { data: logs, isLoading } = useQuery({
    queryKey: ['logs'],
    queryFn: () => apiGet<LogEntry[]>('/logs'),
    refetchInterval: 3000,
  });

  const clearMut = useMutation({
    mutationFn: () => apiDelete('/logs'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['logs'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Event Log</h3>
          <p className="text-xs text-gray-500">Last 100 events from agent runs and system operations. Auto-refreshes every 3s.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => qc.invalidateQueries({ queryKey: ['logs'] })}>
            <RefreshCw className="h-3 w-3" /> Refresh
          </Button>
          <Button size="sm" variant="ghost" className="text-red-500" onClick={() => clearMut.mutate()} disabled={!logs?.length}>
            <Trash2 className="h-3 w-3" /> Clear
          </Button>
        </div>
      </div>

      {isLoading && (
        <p className="text-sm text-gray-400 text-center py-6">Loading logs...</p>
      )}

      {!isLoading && !logs?.length && (
        <p className="text-sm text-gray-400 text-center py-6">No log entries yet. Drag a work item to "In Progress" to trigger an agent run.</p>
      )}

      <div className="space-y-1 max-h-[600px] overflow-y-auto">
        {logs?.slice().reverse().map((entry) => {
          const cfg = LEVEL_CONFIG[entry.level];
          const Icon = cfg.icon;
          const time = new Date(entry.timestamp);
          const timeStr = time.toLocaleTimeString();
          return (
            <div key={entry.id} className={`rounded-md border border-gray-200 dark:border-gray-700 p-2 ${cfg.bg}`}>
              <div className="flex items-start gap-2">
                <Icon className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${cfg.color}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-400">{timeStr}</span>
                    <span className="font-mono text-gray-500 bg-gray-100 dark:bg-gray-800 px-1 rounded">{entry.source}</span>
                  </div>
                  <div className="text-sm mt-0.5">{entry.message}</div>
                  {entry.detail && (
                    <pre className="text-xs text-gray-500 mt-1 whitespace-pre-wrap break-all max-h-24 overflow-y-auto">{entry.detail}</pre>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
