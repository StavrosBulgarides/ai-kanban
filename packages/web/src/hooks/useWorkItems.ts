import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/api/workItems';

export function useWorkItems(projectId: string) {
  return useQuery({
    queryKey: ['work-items', projectId],
    queryFn: () => api.fetchWorkItems(projectId),
    enabled: !!projectId,
    refetchInterval: 3000,
  });
}

export function useCreateWorkItem(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { status_id: string; title?: string; description?: string }) =>
      api.createWorkItem(projectId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['work-items', projectId] }),
  });
}

export function useUpdateWorkItem(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) => api.updateWorkItem(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['work-items', projectId] }),
  });
}

export function useBulkUpdateWorkItems(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.bulkUpdateWorkItems,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['work-items', projectId] }),
  });
}

export function useDeleteWorkItem(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, deleteFiles }: { id: string; deleteFiles?: boolean }) =>
      api.deleteWorkItem(id, deleteFiles),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['work-items', projectId] }),
  });
}
