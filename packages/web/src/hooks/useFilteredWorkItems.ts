import { useMemo } from 'react';
import type { WorkItem } from '@/types/models';
import { useUIStore } from '@/stores/uiStore';

export function useFilteredWorkItems(items: WorkItem[] | undefined): WorkItem[] {
  const filters = useUIStore((s) => s.filters);

  return useMemo(() => {
    if (!items) return [];
    let filtered = [...items];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(
        (i) => i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q)
      );
    }

    if (filters.priorities.length > 0) {
      filtered = filtered.filter((i) => filters.priorities.includes(i.priority));
    }

    return filtered.sort((a, b) => a.sort_order - b.sort_order);
  }, [items, filters]);
}
