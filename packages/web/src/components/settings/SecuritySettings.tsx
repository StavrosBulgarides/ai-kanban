import { useQuery } from '@tanstack/react-query';
import { fetchConfig } from '@/api/config';
import { Badge } from '@/components/ui/Badge';

const ALL_TOOLS = ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep', 'WebSearch', 'WebFetch'] as const;
const SAFE_TOOLS = new Set(['Read', 'Glob', 'Grep']);

export function SecuritySettings() {
  const { data: config } = useQuery({ queryKey: ['config'], queryFn: fetchConfig });

  if (!config) return <div className="text-sm text-gray-400 py-4">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold">Enterprise Mode</h3>
        <div className="mt-1">
          {config.enterpriseMode ? (
            <Badge color="#22c55e">Active</Badge>
          ) : (
            <Badge color="#6b7280">Off</Badge>
          )}
          <p className="text-xs text-gray-500 mt-1">
            {config.enterpriseMode
              ? 'Enterprise security hardening is active. Settings are controlled via environment variables.'
              : 'Running in development mode. Set ENTERPRISE_MODE=true for enterprise features.'}
          </p>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2">Default Agent Tool Permissions</h3>
        <p className="text-xs text-gray-500 mb-3">
          These defaults apply to all work items unless overridden per-item.
          {config.enterpriseMode && ' Controlled via DEFAULT_TOOL_PERMISSIONS env var.'}
        </p>
        <div className="space-y-1">
          {ALL_TOOLS.map(tool => {
            const enabled = config.defaultToolPermissions[tool] ?? true;
            const safe = SAFE_TOOLS.has(tool);
            return (
              <div key={tool} className="flex items-center gap-2 text-xs py-1 px-2 rounded bg-gray-50 dark:bg-gray-900">
                <span className={`w-1.5 h-1.5 rounded-full ${safe ? 'bg-green-500' : 'bg-amber-500'}`} />
                <span className="flex-1">{tool}</span>
                <span className={enabled ? 'text-green-600' : 'text-gray-400'}>{enabled ? 'Enabled' : 'Disabled'}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2">Feature Flags</h3>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs py-1 px-2 rounded bg-gray-50 dark:bg-gray-900">
            <span>File Open/Reveal</span>
            <span className={config.features.allowFileOpen ? 'text-green-600' : 'text-gray-400'}>
              {config.features.allowFileOpen ? 'Allowed' : 'Disabled'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
