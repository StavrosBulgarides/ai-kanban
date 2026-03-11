import { LayoutGrid, List, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useUIStore } from '@/stores/uiStore';
import type { Project } from '@/types/models';

interface HeaderProps {
  project?: Project;
}

export function Header({ project }: HeaderProps) {
  const { viewMode, setViewMode, filters, setFilters } = useUIStore();

  return (
    <header className="flex items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 py-2">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold truncate">{project?.name || 'Product Kanban'}</h1>
      </div>

      {project && (
        <div className="flex items-center gap-2 flex-1 justify-end">
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search items..."
              value={filters.search}
              onChange={(e) => setFilters({ search: e.target.value })}
              className="pl-9"
            />
          </div>

          <div className="flex items-center border rounded-md border-gray-300 dark:border-gray-700">
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('kanban')}
              className="rounded-r-none"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
