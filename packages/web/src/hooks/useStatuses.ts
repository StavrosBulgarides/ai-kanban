import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/api/statuses';

export function useStatuses(projectId: string) {
  return useQuery({
    queryKey: ['statuses', projectId],
    queryFn: () => api.fetchStatuses(projectId),
    enabled: !!projectId,
  });
}

export function useCreateStatus(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; color?: string }) => api.createStatus(projectId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['statuses', projectId] }),
  });
}

export function useUpdateStatus(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) => api.updateStatus(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['statuses', projectId] }),
  });
}
