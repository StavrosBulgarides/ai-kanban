import { useWorkItems } from '@/hooks/useWorkItems';
import { useStatuses } from '@/hooks/useStatuses';
import { useFilteredWorkItems } from '@/hooks/useFilteredWorkItems';
import { useUIStore } from '@/stores/uiStore';
import { Badge } from '@/components/ui/Badge';
import { PRIORITY_COLORS } from '@/lib/utils';
import type { Status } from '@/types/models';

interface ListViewProps {
  projectId: string;
}

export function ListView({ projectId }: ListViewProps) {
  const { data: workItems } = useWorkItems(projectId);
  const { data: statuses } = useStatuses(projectId);
  const filteredItems = useFilteredWorkItems(workItems);
  const setSelectedWorkItemId = useUIStore((s) => s.setSelectedWorkItemId);

  const statusMap = new Map<string, Status>();
  statuses?.forEach((s) => statusMap.set(s.id, s));

  return (
    <div className="flex-1 overflow-auto p-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-800 text-left text-gray-500">
            <th className="pb-2 pl-2 font-medium">Title</th>
            <th className="pb-2 font-medium w-28">Status</th>
            <th className="pb-2 font-medium w-24">Priority</th>
            <th className="pb-2 font-medium w-36">Updated</th>
          </tr>
        </thead>
        <tbody>
          {filteredItems.map((item) => {
            const status = statusMap.get(item.status_id);
            return (
              <tr
                key={item.id}
                onClick={() => setSelectedWorkItemId(item.id)}
                className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer"
              >
                <td className="py-2 pl-2">
                  <div className="flex items-center gap-2">
                    {item.priority !== 'none' && (
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_COLORS[item.priority]}`} />
                    )}
                    <span className="font-medium">{item.title}</span>
                  </div>
                  {item.description && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{item.description}</p>
                  )}
                </td>
                <td className="py-2">
                  {status && <Badge color={status.color}>{status.name}</Badge>}
                </td>
                <td className="py-2 capitalize text-gray-600">{item.priority}</td>
                <td className="py-2 text-gray-500 text-xs">{new Date(item.updated_at).toLocaleDateString()}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {filteredItems.length === 0 && (
        <div className="text-center text-gray-400 mt-12">No work items found</div>
      )}
    </div>
  );
}
