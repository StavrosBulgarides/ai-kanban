import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { fetchConfig, type AppConfig } from '@/api/config';
import { useUpdateWorkItem } from '@/hooks/useWorkItems';
import type { WorkItem } from '@/types/models';

const ALL_TOOLS = ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep', 'WebSearch', 'WebFetch'] as const;
const SAFE_TOOLS = new Set(['Read', 'Glob', 'Grep']);

interface ToolPermissionsPanelProps {
  workItem: WorkItem;
  projectId: string;
}

export function ToolPermissionsPanel({ workItem, projectId }: ToolPermissionsPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const { data: config } = useQuery({ queryKey: ['config'], queryFn: fetchConfig });
  const updateItem = useUpdateWorkItem(projectId);

  const isUsingDefaults = workItem.tool_permissions === null || workItem.tool_permissions === undefined;

  const currentPermissions: Record<string, boolean> = isUsingDefaults
    ? (config?.defaultToolPermissions ?? Object.fromEntries(ALL_TOOLS.map(t => [t, true])))
    : (() => { try { return JSON.parse(workItem.tool_permissions!); } catch { return {}; } })();

  const handleToggle = (tool: string, enabled: boolean) => {
    const updated = { ...currentPermissions, [tool]: enabled };
    updateItem.mutate({ id: workItem.id, tool_permissions: JSON.stringify(updated) });
  };

  const handleCustomise = () => {
    // Copy current defaults into explicit overrides
    const defaults = config?.defaultToolPermissions ?? Object.fromEntries(ALL_TOOLS.map(t => [t, true]));
    updateItem.mutate({ id: workItem.id, tool_permissions: JSON.stringify(defaults) });
  };

  const handleReset = () => {
    updateItem.mutate({ id: workItem.id, tool_permissions: null });
  };

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-300 w-full"
      >
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        Agent Tools
        {!isUsingDefaults && <span className="text-[10px] font-normal normal-case text-blue-500 ml-1">(customised)</span>}
      </button>

      {expanded && (
        <div className="mt-2 space-y-1.5">
          {isUsingDefaults ? (
            <>
              <p className="text-[11px] text-gray-400 mb-2">Using global defaults</p>
              <div className="space-y-1">
                {ALL_TOOLS.map(tool => (
                  <ToolRow key={tool} tool={tool} enabled={currentPermissions[tool] ?? true} disabled />
                ))}
              </div>
              <Button size="sm" variant="outline" className="w-full mt-2 text-xs" onClick={handleCustomise}>
                Customise for this item
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-1">
                {ALL_TOOLS.map(tool => (
                  <ToolRow key={tool} tool={tool} enabled={currentPermissions[tool] ?? false} onChange={(v) => handleToggle(tool, v)} />
                ))}
              </div>
              <Button size="sm" variant="outline" className="w-full mt-2 text-xs" onClick={handleReset}>
                <RotateCcw className="h-3 w-3 mr-1" /> Reset to Defaults
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ToolRow({ tool, enabled, disabled, onChange }: {
  tool: string;
  enabled: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
}) {
  const safe = SAFE_TOOLS.has(tool);
  return (
    <label className={`flex items-center gap-2 text-xs py-0.5 px-1 rounded ${disabled ? 'opacity-50' : 'hover:bg-gray-50 dark:hover:bg-gray-900'}`}>
      <input
        type="checkbox"
        checked={enabled}
        disabled={disabled}
        onChange={onChange ? (e) => onChange(e.target.checked) : undefined}
        className="rounded text-blue-500"
      />
      <span className={`w-1.5 h-1.5 rounded-full ${safe ? 'bg-green-500' : 'bg-amber-500'}`} />
      <span>{tool}</span>
    </label>
  );
}
